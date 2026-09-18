<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import { confetti } from '@/lib/confetti'
import { countTo, duration, prefersReducedMotion } from '@/lib/motion'
import { formatScore, TEAM_COLORS } from '@/lib/teams'
import { count } from '@/lib/format'
import { QUIZ_OPTIONS } from '../options'
import type { QuizStanding } from '../types'

const props = defineProps<{
  standings: QuizStanding[]
  round: number
  questionCount: number
  hasReport: boolean
  reportSaved: boolean
}>()

const emit = defineEmits<{ again: []; report: []; download: []; end: []; retrySave: [] }>()

const fx = ref<HTMLElement | null>(null)

const best = computed(() => props.standings[0]?.score ?? 0)
/** Při shodě bodů vyhrává víc lidí naráz. */
const winners = computed(() => props.standings.filter((s) => s.score === best.value && best.value > 0))

/** Zobrazuje se jen první trojice. Na bedně stojí druhý, první, třetí. */
const topThree = computed(() => props.standings.slice(0, 3))
const podium = computed(() => {
  const top = topThree.value
  if (top.length === 3) return [top[1]!, top[0]!, top[2]!]
  if (top.length === 2) return [top[1]!, top[0]!]
  return top
})

function place(s: QuizStanding): number {
  return topThree.value.findIndex((x) => x.uid === s.uid) + 1
}

/** Výška stupně. Nese ji poměr k nejlepšímu výsledku, ne pořadí, aby
 *  těsný souboj vypadal jako těsný souboj. */
function height(s: QuizStanding): number {
  const share = best.value > 0 ? s.score / best.value : 0
  return 0.45 + share * 0.55
}

/** Barva stupně. Zlatá v systému není, tak se bere paleta možností,
 *  kterou hráči celou hru viděli na tlačítkách. */
function tint(s: QuizStanding): string {
  const at = props.standings.indexOf(s)
  return `var(${QUIZ_OPTIONS[at % QUIZ_OPTIONS.length]!.color.cssVar})`
}

/**
 * Vyhlášení po beatech.
 *
 * Napětí nedělá čekání, ale to, že se něco děje: nejdřív se ohlásí místo
 * a vyroste prázdný stupeň, teprve pak na něj dosedne jméno se zvířetem
 * a body se dopočítají nahoru. Prázdná obrazovka mezi místy není napětí,
 * je to jen prodleva, proto je každý beat krátký a pořád se něco hýbe.
 */
const CUE_MS = 700
const HOLD_MS = 1200

const cued = ref<string[]>([])
const visible = ref<string[]>([])
const activePlace = ref<number | null>(null)
const sequenceDone = ref(false)
/** Body, jak se zrovna dopočítávají. Klíč je uid. */
const counted = ref<Record<string, number>>({})
const timers: number[] = []
const stopCounts: Array<() => void> = []

const ORDINAL = ['', 'První místo', 'Druhé místo', 'Třetí místo']

const headline = computed(() => {
  if (visible.value.includes(topThree.value[0]?.uid ?? '')) {
    if (winners.value.length === 0) return 'Konec'
    // Přítomný čas, protože nevíme, jestli je za přezdívkou on, nebo ona.
    if (winners.value.length === 1) return `Vyhrává ${winners.value[0]!.nick}`
    return 'Shoda na prvním místě'
  }
  if (activePlace.value === 1) return 'A vítězem je…'
  if (activePlace.value) return `${ORDINAL[activePlace.value] ?? 'Další místo'}…`
  return 'Výsledky'
})

function isCued(s: QuizStanding): boolean {
  return cued.value.includes(s.uid)
}

function isVisible(s: QuizStanding): boolean {
  return visible.value.includes(s.uid)
}

function scoreOf(s: QuizStanding): number {
  return counted.value[s.uid] ?? s.score
}

function celebrate(): void {
  confetti(
    winners.value.length > 0 ? TEAM_COLORS.slice(0, 4).map((c) => c.hex) : [],
    fx.value ?? undefined,
  )
}

/** Všechno naráz. Používá to mezerník i režim bez pohybu: moderátorka
 *  nemá čekat na animaci, když chce výsledky hned. */
function finish(): void {
  timers.forEach((t) => window.clearTimeout(t))
  timers.length = 0
  stopCounts.forEach((stop) => stop())
  stopCounts.length = 0
  cued.value = topThree.value.map((s) => s.uid)
  visible.value = [...cued.value]
  counted.value = Object.fromEntries(topThree.value.map((s) => [s.uid, s.score]))
  activePlace.value = null
  if (!sequenceDone.value && winners.value.length > 0) celebrate()
  sequenceDone.value = true
}

function land(standing: QuizStanding): void {
  const ms = duration('--dur-count', 900)
  visible.value = [...visible.value, standing.uid]
  counted.value = { ...counted.value, [standing.uid]: 0 }
  stopCounts.push(
    countTo(0, standing.score, ms, (value) => {
      counted.value = { ...counted.value, [standing.uid]: value }
    }),
  )
  // Odpočet jede na snímcích a ty se v schované záložce nekreslí. Kdyby
  // moderátorka mezitím přepnula okno, zůstala by na bedně nula, proto
  // se výsledná hodnota dosadí i natvrdo.
  timers.push(
    window.setTimeout(() => {
      counted.value = { ...counted.value, [standing.uid]: standing.score }
    }, ms + 100),
  )
}

/** Mezerník vyhlášení doskáče na konec. Na plátně se čeká jen tehdy,
 *  když to moderátorce vyhovuje. */
function onKey(e: KeyboardEvent): void {
  if (sequenceDone.value) return
  if (e.key === ' ' || e.code === 'Space') finish()
}

onMounted(async () => {
  await nextTick()
  window.addEventListener('keydown', onKey)

  if (prefersReducedMotion() || topThree.value.length === 0) {
    finish()
    return
  }

  // Od posledního místa k prvnímu. Každé dostane svůj nástup a chvíli
  // stání, než se ohlásí to další.
  const order = [...topThree.value].reverse()
  order.forEach((standing, index) => {
    const cueAt = index * (CUE_MS + HOLD_MS)
    timers.push(
      window.setTimeout(() => {
        cued.value = [...cued.value, standing.uid]
        activePlace.value = place(standing)
      }, cueAt),
    )
    timers.push(window.setTimeout(() => land(standing), cueAt + CUE_MS))
  })

  const done = order.length * (CUE_MS + HOLD_MS) - HOLD_MS + CUE_MS
  timers.push(window.setTimeout(() => {
    if (winners.value.length > 0) celebrate()
  }, done))
  timers.push(window.setTimeout(() => {
    sequenceDone.value = true
  }, done + duration('--dur-count', 900)))
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  timers.forEach((timer) => window.clearTimeout(timer))
  stopCounts.forEach((stop) => stop())
})
</script>

<template>
  <section class="final">
    <div ref="fx" class="final__fx" aria-hidden="true"></div>

    <header class="final__head">
      <p class="eyebrow">{{ round }}. kolo · {{ count(questionCount, 'otázka', 'otázky', 'otázek') }}</p>
      <Transition name="place" mode="out-in">
        <h1 :key="headline" class="final__title">{{ headline }}</h1>
      </Transition>
    </header>

    <ol v-if="podium.length" class="podium">
      <li
        v-for="s in podium"
        :key="s.uid"
        class="slot"
        :class="{ 'slot--champ': place(s) === 1, 'slot--cued': isCued(s), 'slot--shown': isVisible(s) }"
        :style="{ '--tint': tint(s), '--h': height(s) }"
        :aria-hidden="!isVisible(s)"
      >
        <!-- Stupeň vyroste první a chvíli stojí prázdný. Až pak na něj
             dosedne zvíře se jménem a body se dopočítají nahoru. -->
        <PlayerAvatar class="slot__ava" :id="s.avatar" />
        <span v-fit-text class="slot__nick">{{ s.nick }}</span>
        <span class="slot__score">{{ formatScore(scoreOf(s)) }}</span>
        <span class="slot__riser" aria-hidden="true">
          <span class="slot__place">{{ place(s) }}</span>
        </span>
      </li>
    </ol>

    <p v-if="standings.length === 0" class="final__empty">
      Nikdo neodpovídal, takže není co vyhlašovat.
    </p>

    <footer v-if="sequenceDone" class="final__foot">
      <UiButton variant="brand" size="lg" @click="emit('again')">Další kolo</UiButton>
      <UiButton v-if="hasReport" variant="ghost" size="lg" @click="emit('report')">
        Jak to dopadlo
      </UiButton>
      <UiButton v-if="hasReport" variant="quiet" size="lg" @click="emit('download')">
        Stáhnout tabulku
      </UiButton>
      <UiButton variant="quiet" size="lg" @click="emit('end')">Ukončit a uklidit</UiButton>
    </footer>

    <p v-if="sequenceDone && hasReport && !reportSaved" class="final__warn">
      Vyhodnocení se nepodařilo uložit do databáze. Stáhni si tabulku, než
      obrazovku zavřeš.
      <UiButton size="sm" variant="quiet" @click="emit('retrySave')">Uložit znovu</UiButton>
    </p>
  </section>
</template>

<style scoped>
.final {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: var(--sp-4);
  align-content: center;
  justify-items: center;
  height: 100%;
  min-height: 0;
  padding: var(--sp-5) var(--sp-6);
  text-align: center;
}
.final__fx { position: absolute; inset: 0; pointer-events: none; }

.final__head { display: grid; gap: var(--sp-2); }
.final__title { font-size: var(--fs-hero); font-weight: 900; letter-spacing: -0.03em; text-wrap: balance; }
.final__empty { color: var(--c-text-faint); }
.final__warn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  max-width: 40rem;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-bad) 15%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-sm);
}

/* Stupně vítězů ------------------------------------------------------------ */
.podium {
  list-style: none;
  padding: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--sp-4);
  min-height: 0;
  height: 100%;
  width: min(100%, 60rem);
}
.slot {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  justify-items: center;
  gap: var(--sp-1);
  flex: 1 1 0;
  max-width: 16rem;
  min-width: 0;
  height: 100%;
  opacity: 0;
}
/* Ohlášené místo: stojí tu prázdný stupeň, jméno ještě ne. */
.slot--cued { opacity: 1; }
.slot--cued .slot__ava,
.slot--cued .slot__nick,
.slot--cued .slot__score { visibility: hidden; opacity: 0; }
.slot--shown .slot__ava,
.slot--shown .slot__nick,
.slot--shown .slot__score {
  visibility: visible;
  opacity: 1;
  animation: podiumPlace var(--dur-podium-place) var(--ease-back) backwards;
}
.slot__ava {
  --ava-size: 3.5rem;
  align-self: end;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.slot--champ .slot__ava { --ava-size: 5rem; }
.slot__nick {
  font-size: calc(var(--fs-lg) * var(--fit-text, 1));
  font-weight: 700;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.slot--champ .slot__nick { font-size: calc(var(--fs-2xl) * var(--fit-text, 1)); }
.slot__score {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 900;
  color: var(--c-brand);
  font-variant-numeric: tabular-nums;
  transition: opacity var(--dur-fast) var(--ease-out);
}

/* Sloup roste zdola nahoru, poměrem k nejlepšímu výsledku. */
.slot__riser {
  display: grid;
  place-items: start center;
  align-self: end;
  width: 100%;
  height: calc(var(--h) * 100%);
  padding-top: var(--sp-3);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  background: linear-gradient(180deg, var(--tint) 0%, color-mix(in oklab, var(--tint) 35%, var(--c-surface)) 100%);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.3);
  transform-origin: bottom center;
  transform: scaleY(0);
}
.slot--cued .slot__riser { animation: rise var(--dur-podium-place) var(--ease-back) both; }
.slot__place {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 900;
  color: var(--c-text-ink);
}

.final__foot { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }

@keyframes rise {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
@keyframes podiumPlace {
  from { opacity: 0; transform: translateY(var(--sp-5)) scale(0.96); }
  to { opacity: 1; transform: none; }
}

.place-enter-active,
.place-leave-active { transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out); }
.place-enter-from { opacity: 0; transform: translateY(var(--sp-2)); }
.place-leave-to { opacity: 0; transform: translateY(calc(var(--sp-2) * -1)); }

/* Ohlášené místo lehce dýchá, dokud na něj někdo nedosedne. Je to
   jediný pohyb v tu chvíli a drží místnost u obrazovky. */
.slot--cued:not(.slot--shown) .slot__riser { animation: rise var(--dur-podium-place) var(--ease-back) both, waiting var(--dur-breathe) ease-in-out var(--dur-podium-place) infinite; }

@keyframes waiting {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.18); }
}

@media (prefers-reduced-motion: reduce) {
  .slot,
  .slot__ava,
  .slot__nick,
  .slot__score,
  .slot__riser,
  .slot--cued:not(.slot--shown) .slot__riser { animation: none; transform: none; }
}

@media (max-width: 720px) {
  .podium { flex-wrap: wrap; height: auto; }
  .slot { height: 12rem; }
}
</style>
