<script setup lang="ts">
import { computed } from 'vue'
import PlayerAvatar from './PlayerAvatar.vue'
import { formatScore } from '@/lib/teams'
import { count } from '@/lib/format'
import type { QuizStanding } from '../types'

const props = defineProps<{ standings: QuizStanding[]; index: number; total: number }>()

/**
 * Průběžně se ukazuje jen bedna, tedy tři jména. Delší seznam se z druhého
 * konce místnosti stejně nečte a hru zdržuje; kdo je čtvrtý, se dozví na
 * svém telefonu a celé pořadí je na konci ve vyhodnocení.
 */
const TOP = 3
const shown = computed(() => props.standings.slice(0, TOP))
const rest = computed(() => Math.max(0, props.standings.length - shown.value.length))
/** Od nejvyššího skóre se odvíjí délka pruhů. */
const peak = computed(() => Math.max(1, props.standings[0]?.score ?? 1))
</script>

<template>
  <section class="scores">
    <header class="scores__head">
      <p class="scores__pos">Po {{ index + 1 }}. otázce z {{ total }}</p>
      <h2 class="scores__title">Průběžně</h2>
    </header>

    <ol v-if="shown.length" class="board">
      <li
        v-for="(s, i) in shown"
        :key="s.uid"
        class="line"
        :class="{ 'line--lead': i === 0 }"
        :style="{ '--fill': `${s.score / peak}`, '--d': i }"
      >
        <span class="line__rank">{{ i + 1 }}</span>
        <PlayerAvatar class="line__ava" :id="s.avatar" />
        <span class="line__nick">{{ s.nick }}</span>
        <span class="line__bar" aria-hidden="true"></span>
        <span class="line__score">{{ formatScore(s.score) }}</span>
      </li>
    </ol>

    <p v-else class="scores__empty">Zatím nikdo nebodoval.</p>

    <p v-if="rest > 0" class="scores__rest">
      a {{ count(rest, 'další hráč', 'další hráči', 'dalších hráčů') }}
    </p>

    <p class="scores__hint">Mezerník pustí další otázku</p>
  </section>
</template>

<style scoped>
.scores {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: var(--sp-4);
  align-content: center;
  height: 100%;
  min-height: 0;
  padding: var(--sp-5) var(--sp-6);
}
.scores__head { text-align: center; }
.scores__pos {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.scores__title { font-size: var(--fs-hero); font-weight: 900; letter-spacing: -0.03em; }
.scores__empty { text-align: center; color: var(--c-text-faint); }
.scores__rest { text-align: center; font-size: var(--fs-sm); color: var(--c-text-faint); }
.scores__hint { text-align: center; font-size: var(--fs-xs); color: var(--c-text-faint); }

.board {
  list-style: none;
  padding: 0;
  display: grid;
  align-content: center;
  gap: var(--sp-3);
  width: min(100%, 60rem);
  margin-inline: auto;
  min-height: 0;
}

.line {
  display: grid;
  grid-template-columns: 2.5rem auto minmax(6rem, 14rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-xl);
  /* Řádky nastupují po sobě, aby bylo vidět pořadí, ne jen výsledek. */
  animation: slide var(--dur-base) var(--ease-out) calc(var(--d) * 70ms) both;
}
.line__rank {
  font-family: var(--font-display);
  font-weight: 900;
  color: var(--c-text-faint);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.line__ava { --ava-size: 2.25rem; }
.line--lead .line__ava { --ava-size: 3rem; }
.line__nick { font-weight: 700; overflow-wrap: anywhere; }
.line__bar {
  height: 0.75rem;
  width: calc(var(--fill) * 100%);
  min-width: 3px;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--c-brand-deep), var(--c-brand));
  transition: width var(--dur-slow) var(--ease-out);
}
.line__score {
  font-family: var(--font-display);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  min-width: 5ch;
  text-align: right;
}
/* První místo se liší velikostí a barvou pruhu, ne zlatou: tu systém nemá. */
.line--lead { font-size: var(--fs-2xl); }
.line--lead .line__rank { color: var(--c-brand); }

@keyframes slide {
  from { opacity: 0; transform: translateX(-1rem); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .line { animation: none; }
}
</style>
