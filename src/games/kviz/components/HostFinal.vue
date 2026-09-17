<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { confetti } from '@/lib/confetti'
import { duration, prefersReducedMotion } from '@/lib/motion'
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

const emit = defineEmits<{ again: []; report: []; download: []; end: [] }>()

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

const visible = ref<string[]>(prefersReducedMotion() ? topThree.value.map((s) => s.uid) : [])
const activePlace = ref<number | null>(null)
const sequenceDone = ref(prefersReducedMotion())
const timers: number[] = []

const headline = computed(() => {
  if (visible.value.includes(topThree.value[0]?.uid ?? '')) {
    if (winners.value.length === 0) return 'Konec'
    if (winners.value.length === 1) return `Vyhrál ${winners.value[0]!.nick}`
    return 'Shoda na prvním místě'
  }
  return activePlace.value ? `${activePlace.value}. místo` : 'Výsledky'
})

function isVisible(s: QuizStanding): boolean {
  return visible.value.includes(s.uid)
}

function celebrate(): void {
  confetti(
    winners.value.length > 0 ? TEAM_COLORS.slice(0, 4).map((c) => c.hex) : [],
    fx.value ?? undefined,
  )
}

onMounted(async () => {
  await nextTick()
  if (prefersReducedMotion()) {
    if (winners.value.length > 0) celebrate()
    return
  }

  const order = [...topThree.value].reverse()
  if (order.length === 0) {
    sequenceDone.value = true
    return
  }
  const whole = duration('--dur-podium-sequence', 10000)
  const firstAt = 0.12
  const lastAt = 0.68

  order.forEach((standing, index) => {
    const share = order.length === 1 ? lastAt : firstAt + (lastAt - firstAt) * (index / (order.length - 1))
    timers.push(window.setTimeout(() => {
      visible.value = [...visible.value, standing.uid]
      activePlace.value = place(standing)
    }, whole * share))
  })

  timers.push(window.setTimeout(() => {
    if (winners.value.length > 0) celebrate()
  }, whole * 0.76))
  timers.push(window.setTimeout(() => {
    sequenceDone.value = true
  }, whole * 0.96))
})
onUnmounted(() => timers.forEach((timer) => window.clearTimeout(timer)))
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
        :class="{ 'slot--champ': place(s) === 1, 'slot--shown': isVisible(s) }"
        :style="{ '--tint': tint(s), '--h': height(s) }"
        :aria-hidden="!isVisible(s)"
      >
        <span class="slot__nick">{{ s.nick }}</span>
        <span class="slot__score">{{ formatScore(s.score) }}</span>
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
  grid-template-rows: auto auto 1fr;
  justify-items: center;
  gap: var(--sp-1);
  flex: 1 1 0;
  max-width: 16rem;
  min-width: 0;
  height: 100%;
  opacity: 0;
  transform: translateY(var(--sp-5)) scale(0.96);
}
.slot--shown {
  opacity: 1;
  transform: none;
  animation: podiumPlace var(--dur-podium-place) var(--ease-back) both;
}
.slot__nick {
  font-size: var(--fs-lg);
  font-weight: 700;
  overflow-wrap: anywhere;
  align-self: end;
}
.slot--champ .slot__nick { font-size: var(--fs-2xl); }
.slot__score {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 900;
  color: var(--c-brand);
  font-variant-numeric: tabular-nums;
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
.slot--shown .slot__riser { animation: rise var(--dur-podium-place) var(--ease-back) both; }
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

@media (prefers-reduced-motion: reduce) {
  .slot,
  .slot__riser { animation: none; transform: none; }
}

@media (max-width: 720px) {
  .podium { flex-wrap: wrap; height: auto; }
  .slot { height: 12rem; }
}
</style>
