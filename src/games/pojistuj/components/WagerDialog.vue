<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Team } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'

const props = defineProps<{
  team: Team
  teamIndex: number
  max: number
  base: number
  /** Skóre se při odečtu nezastaví pod nulou. Mění, co tým reálně riskuje. */
  floorZero: boolean
}>()
const emit = defineEmits<{ confirm: [amount: number]; cancel: [] }>()

/**
 * Nejnižší sázka. Nula se dala vsadit a otázka za 800 se pak hrála o nic,
 * zatímco na plátně svítilo velké „0".
 */
const MIN = computed(() => Math.min(10, props.max))

/**
 * Co tým při špatné odpovědi doopravdy ztratí.
 *
 * Se zapnutým „Skóre nejméně nula" se odečte jen to, co na kontě je.
 * Tým na nule tedy nemůže prohrát nic, a to musí být na plátně vidět,
 * než sázku potvrdí, ne až když si to v sále někdo spočítá nahlas.
 */
const realLoss = computed(() =>
  props.floorZero ? Math.min(amount.value, Math.max(0, props.team.score)) : amount.value,
)
const root = ref<HTMLElement | null>(null)
const slider = ref<HTMLInputElement | null>(null)

/**
 * Krok posuvníku.
 *
 * Deset bodů pevně, ne podíl z maxima. Krok se v HTML počítá **od
 * `min`, ne od nuly**, takže hrubý krok posuvníku na horní mez nedojede:
 * u pole za tisíc byl krok padesát, posuvník skončil na 960 a nad ním
 * přitom svítilo 1 000. Deseti se sázka dělí vždycky, protože se z něj
 * skládají i hodnoty na desce.
 *
 * Jemné ladění nese posuvník, hrubá volba tři tlačítka pod ním, takže
 * si krok nemusí hrát na obojí.
 */
const STEP = 10

/** Nejvyšší hodnota, na kterou posuvník dojede. */
const TOP = computed(() =>
  Math.max(MIN.value, MIN.value + Math.floor((props.max - MIN.value) / STEP) * STEP),
)

/** Zaokrouhlí na mřížku posuvníku, ať tlačítko a posuvník ukazují totéž. */
function snap(value: number): number {
  const off = Math.round((value - MIN.value) / STEP) * STEP
  return Math.min(TOP.value, Math.max(MIN.value, MIN.value + off))
}

/** Napoprvé hodnota pole, zarovnaná na mřížku, ať posuvník nezačíná mezi
 *  dvěma body a nepřeskočí hned při prvním stisku šipky. */
const amount = ref(snap(props.base))

/**
 * Tři pevné sázky: nejmíň, půlka, všechno.
 *
 * U stolu se rozhoduje mezi „neriskujeme", „něco" a „jdeme do všeho",
 * a na tohle je posuvník nepraktický: moderátorka na projektoru míří
 * myší na pár pixelů a hodnotu pak stejně dolaďuje. Tlačítka jsou tři
 * vždy, tedy i u pole za tisíc, kde se dřív základní hodnota rovnala
 * maximu a z nabídky zbyla dvě. Posuvník zůstává na sázky mezi tím.
 *
 * Každé tlačítko nese slovo i číslo. Samotné číslo se z místnosti čte
 * jako údaj, ne jako volba, a v řadě tří čísel není poznat, co znamenají.
 */
const steps = computed(() => {
  const trio = [
    { label: 'Minimum', value: MIN.value },
    { label: 'Půlka', value: snap(TOP.value / 2) },
    { label: 'Všechno', value: TOP.value },
  ]
  // Na velmi malém maximu by hodnoty splynuly. Radši dvě tlačítka než
  // dvě stejná.
  return trio.filter((s, i) => trio.findIndex((o) => o.value === s.value) === i)
})

function confirm() {
  emit('confirm', Math.min(props.max, Math.max(MIN.value, Math.round(amount.value))))
}

/**
 * Sázka se musí dát vyřídit od klávesnice.
 *
 * Celou hru vede moderátorka mezerníkem, čísly a Esc, a tohle je jediný
 * krok, který ji dřív poslal pro myš. Zaměření drží posuvník, takže
 * šipkami jde sázkou hýbat hned, Enter ji potvrdí a Esc se vrátí na desku
 * stejně jako všude jinde.
 */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
    return
  }
  if (e.key === 'Enter') {
    // Enter na tlačítku ať udělá to, co tlačítko slibuje, ne něco jiného.
    const el = document.activeElement
    if (el instanceof HTMLButtonElement && root.value?.contains(el)) return
    e.preventDefault()
    confirm()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKey, true)
  await nextTick()
  slider.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <div ref="root" class="wager" role="dialog" aria-modal="true" aria-label="Pole Riziko">
    <div class="wager__panel" :style="{ '--team': `var(${teamColor(team.color).cssVar})` }">
      <p class="wager__kicker">tohle pole je rizikové</p>
      <h2 class="wager__title">Riziko!</h2>

      <p class="wager__lead">
        <span class="wager__who">
          <span class="wager__badge">{{ teamBadge(teamIndex) }}</span>
          <strong>{{ team.name }}</strong>
        </span>
        si volí, kolik bodů vsadí. Za správnou odpověď sázku získá, za špatnou ji ztratí.
      </p>

      <output class="wager__amount">{{ formatScore(amount) }}</output>

      <p class="wager__risk" :class="{ 'wager__risk--none': realLoss === 0 }">
        <template v-if="realLoss === amount">Při špatné odpovědi ztratí {{ formatScore(amount) }}.</template>
        <template v-else-if="realLoss === 0">Tým je na nule, takže při špatné odpovědi neztratí nic.</template>
        <template v-else>Při špatné odpovědi ztratí jen {{ formatScore(realLoss) }}, víc na kontě nemá.</template>
      </p>

      <input
        ref="slider"
        v-model.number="amount"
        class="wager__slider"
        type="range"
        :min="MIN"
        :max="TOP"
        :step="STEP"
        :aria-label="`Sázka, maximum ${TOP}`"
      />

      <div class="wager__steps">
        <button
          v-for="s in steps"
          :key="s.value"
          type="button"
          :aria-label="`${s.label}, ${s.value} bodů`"
          @click="amount = s.value"
        >
          <span class="wager__stepWord" aria-hidden="true">{{ s.label }}</span>
          <span class="wager__stepValue" aria-hidden="true">{{ formatScore(s.value) }}</span>
        </button>
      </div>

      <div class="wager__actions">
        <UiButton variant="ghost" @click="emit('cancel')">Zpět na desku</UiButton>
        <UiButton variant="spark" size="lg" @click="confirm">Vsadit a zobrazit otázku</UiButton>
      </div>

      <p class="wager__hint">
        Šipkami měníš sázku, Enter ji potvrdí, Esc se vrátí na desku.
      </p>
    </div>
  </div>
</template>

<style scoped>
.wager__risk {
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
  text-align: center;
}
.wager__risk--none { color: var(--c-spark); font-weight: 700; }

.wager {
  position: fixed;
  inset: 0;
  z-index: var(--z-stage);
  display: grid;
  place-items: center;
  padding: var(--sp-5);
  background: var(--c-scrim);
  backdrop-filter: blur(8px);
  animation: fade var(--dur-base) var(--ease-out) both;
}
.wager__panel {
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  width: min(100%, 34rem);
  padding: var(--sp-7) var(--sp-6);
  text-align: center;
  border: 1px solid var(--c-spark-deep);
  border-radius: var(--r-xl);
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--c-spark) 16%, transparent), transparent 60%), var(--c-surface);
  box-shadow: var(--shadow-lg);
  animation: pop var(--dur-slow) var(--ease-back) both;
}
/* Ruční písmo, druhé ze tří povolených míst. Úřední rubrika nad slovem
   Riziko! by tu vtip zabila. */
.wager__kicker {
  font-family: var(--font-hand);
  font-weight: 500;
  font-size: var(--fs-xl);
  line-height: 1;
  color: var(--c-text-faint);
}
.wager__title {
  font-size: var(--fs-3xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--c-spark);
  text-shadow: 0 4px 30px var(--c-spark-glow);
}
.wager__lead {
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  max-width: 34ch;
  line-height: var(--lh-body);
}
.wager__who {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  margin-right: var(--sp-1);
  vertical-align: middle;
}
.wager__badge {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: var(--r-sm);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-xs);
  line-height: 1;
}
.wager__lead strong { color: var(--c-text); }

.wager__amount {
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 5rem);
  font-weight: 800;
  line-height: 1;
  color: var(--c-spark);
  font-variant-numeric: tabular-nums;
}

.wager__slider {
  width: 100%;
  accent-color: var(--c-spark);
}
/* Tři sázky na jeden klik. Stejná šířka, aby z nich byla řada voleb,
   ne tři náhodně široké chipsy. */
.wager__steps { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }
.wager__steps button {
  display: grid;
  gap: var(--sp-1);
  min-width: 7rem;
  padding: var(--sp-2) var(--sp-4);
  border: var(--border-w) solid var(--c-line);
  border-radius: var(--r-lg);
  background: transparent;
  color: var(--c-text-muted);
  transition: var(--tr-surface);
}
.wager__steps button:hover,
.wager__steps button:focus-visible {
  border-color: var(--c-spark-mid);
  background: color-mix(in oklab, var(--c-spark) 10%, transparent);
  color: var(--c-text);
}
.wager__stepWord {
  font-size: var(--fs-2xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
.wager__stepValue {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--c-text);
}
.wager__steps button:hover { color: var(--c-text); border-color: var(--c-spark); }

.wager__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; margin-top: var(--sp-2); }

/* Stejně tichá nápověda jako pod otázkou. Čte ji moderátorka z notebooku,
   ne sál z projektoru. */
.wager__hint {
  margin-top: var(--sp-3);
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
}

@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: translateY(20px) scale(0.94); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .wager, .wager__panel { animation: none; }
}

/* Dotyk až nakonec, jinak by pravidla nad ním výšku přebila. */
@media (pointer: coarse) {
  .wager__steps button { min-height: var(--control-touch); }
}
</style>
