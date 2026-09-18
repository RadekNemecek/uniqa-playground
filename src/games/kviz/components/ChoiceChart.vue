<script setup lang="ts">
import { computed } from 'vue'
import { BOOLEAN_LABELS, quizOption } from '../options'
import { count as plural } from '@/lib/format'
import type { QuizKind } from '../types'

const props = withDefaults(
  defineProps<{
    /** Kolik voleb padlo na kterou možnost. Null, dokud se neodhalilo. */
    counts: number[] | null
    /** Kolik sloupců graf drží. Bere se z otázky, ne z došlých odpovědí. */
    slots: number
    correctIndex: number
    kind?: QuizKind
    /** Do odhalení je graf jen rezervované místo. */
    revealed?: boolean
  }>(),
  { kind: 'choice', revealed: false },
)

const columns = computed(() => Array.from({ length: props.slots }, (_, i) => i))

/** Nejvyšší sloupec. Od něj se odvíjejí ostatní, aby byl rozdíl vidět
 *  i tehdy, když odpovídalo pět lidí. */
const peak = computed(() => Math.max(1, ...(props.counts ?? [0])))

function value(i: number): number {
  return props.revealed ? (props.counts?.[i] ?? 0) : 0
}

/** Jak vysoký je sloupec. Nula má pořád tenký proužek, aby bylo vidět,
 *  že možnost existovala a nikdo ji nevybral. */
function share(i: number): number {
  return value(i) / peak.value
}

function word(i: number): string {
  return props.kind === 'boolean' ? (BOOLEAN_LABELS[i] ?? '') : quizOption(i).letter
}

const summary = computed(() =>
  columns.value
    .map((i) => `${word(i)}: ${plural(value(i), 'odpověď', 'odpovědi', 'odpovědí')}`)
    .join(', '),
)
</script>

<template>
  <div class="chart" :class="{ 'chart--hidden': !revealed }" :aria-hidden="!revealed">
    <div
      v-for="i in columns"
      :key="i"
      class="col"
      :class="{ 'col--right': i === correctIndex, 'col--wrong': i !== correctIndex }"
      :style="{ '--share': String(share(i)), '--tint': `var(${quizOption(i).color.cssVar})`, '--d': i }"
    >
      <p class="col__num" aria-hidden="true">{{ value(i) }}</p>
      <div class="col__track" aria-hidden="true">
        <div class="col__bar"></div>
      </div>
      <p class="col__tag" aria-hidden="true">
        <span class="col__letter">{{ quizOption(i).letter }}</span>
        <span v-if="kind === 'boolean'" class="col__word">{{ BOOLEAN_LABELS[i] }}</span>
      </p>
    </div>

    <p class="vh">Rozložení odpovědí. {{ summary }}</p>
  </div>
</template>

<style scoped>
/* Jak kdo odpovídal. Sloupce stojí vedle sebe pod možnostmi a nesou
   stejné písmeno i stejnou barvu jako ony, takže se pohled z dlaždice
   do grafu nemusí nikam překládat. Místo si graf drží od začátku otázky:
   kdyby naskočil až s odhalením, obsah by poskočil a přeměřil se. */
.chart {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  align-items: end;
  gap: calc(var(--sp-4) * var(--fit, 1));
  width: 100%;
  max-width: var(--quiz-stage-max);
  height: calc(var(--quiz-chart-h) * var(--fit, 1));
  margin-inline: auto;
  transition: opacity var(--dur-base) var(--ease-out);
}
.chart--hidden { visibility: hidden; opacity: 0; }

.col {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: calc(var(--sp-1) * var(--fit, 1));
  height: 100%;
  justify-items: center;
  /* Rámeček drží každý sloupec, i když je průhledný: jinak by správná
     možnost byla o jeho tloušťku vyšší než ostatní. */
  border-bottom: calc(var(--sp-1) * var(--fit, 1)) solid transparent;
}

.col__num {
  font-family: var(--font-display);
  font-size: calc(var(--fs-xl) * var(--fit, 1));
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}

.col__track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  min-height: 0;
}
.col__bar {
  /* Sloupec, ne pruh: užší než sloupec mřížky, aby se dal graf přečíst
     jako graf a ne jako čtyři obarvené plochy vedle sebe. */
  width: min(100%, calc(var(--quiz-chart-bar) * var(--fit, 1)));
  height: max(calc(var(--share) * 100%), 3px);
  border-radius: var(--r-sm) var(--r-sm) 0 0;
  background: var(--tint);
  /* Sloupce vyrůstají po sobě, aby se dalo číst jeden po druhém. */
  transition: height var(--dur-slow) var(--ease-out) calc(var(--d) * 80ms);
}

.col__tag {
  display: flex;
  align-items: baseline;
  gap: calc(var(--sp-2) * var(--fit, 1));
  font-family: var(--font-display);
  font-weight: 900;
  line-height: 1;
}
.col__letter { font-size: calc(var(--fs-lg) * var(--fit, 1)); color: var(--tint); }
.col__word { font-size: calc(var(--fs-sm) * var(--fit, 1)); color: var(--c-text-muted); }

/* Správná možnost svítí, ostatní se ztlumí. Stejně jako u dlaždic to
   nestojí jen na jasu: pod správným sloupcem je podtržení. */
.col--right { border-bottom-color: var(--c-ok); }
.col--wrong { opacity: 0.45; }
.col--wrong .col__num { color: var(--c-text-faint); }

@media (prefers-reduced-motion: reduce) {
  .col__bar { transition: none; }
}
</style>
