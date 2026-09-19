<script setup lang="ts">
import { computed } from 'vue'
import type { CellState, Team } from '@/types'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'

const props = defineProps<{
  value: number
  state: CellState
  team?: Team
  teamIndex: number
  categoryName: string
  index: number
}>()

const emit = defineEmits<{ open: [el: HTMLElement] }>()

const color = computed(() => (props.team ? teamColor(props.team.color).cssVar : ''))

const label = computed(() => {
  if (props.state.status === 'open') return `${props.categoryName}, ${props.value} bodů`
  if (props.state.status === 'won')
    return `${props.categoryName}, ${props.value} bodů, získal tým ${props.team?.name}`
  return `${props.categoryName}, ${props.value} bodů, Nepojištěno`
})

function open(e: MouseEvent) {
  if (props.state.status !== 'open') return
  emit('open', e.currentTarget as HTMLElement)
}
</script>

<template>
  <button
    type="button"
    class="cell"
    :class="`cell--${state.status}`"
    :style="{ '--i': index, '--team': color ? `var(${color})` : 'transparent' }"
    :disabled="state.status !== 'open'"
    :aria-label="label"
    @click="open"
  >
    <!-- Pole Riziko! se na desce nijak neliší, a to je celý jeho smysl:
         má padnout náhodou, ne po výběru. Kdo ho vidí dopředu, buď se mu
         vyhne, nebo si ho schová na konec, a z divokého okamžiku je
         taktika. Ohlásí se samo v okamžiku otevření, dialog nese přes
         celé plátno nápis Riziko! a moderátorka ho nemá jak přehlédnout.

         Dřív tu štítek byl, protože se sázka otevírala nečekaně. Řeší to
         ale ten dialog, ne prozrazené políčko. -->
    <span v-if="state.status === 'open'" class="cell__value">{{ formatScore(value) }}</span>

    <span v-else-if="state.status === 'won'" class="cell__won">
      <span class="cell__badge">{{ teamBadge(teamIndex) }}</span>
      <span class="cell__points">{{ (state.points ?? 0) >= 0 ? '+' : '' }}{{ formatScore(state.points ?? value) }}</span>
    </span>

    <span v-else class="cell__lost" aria-hidden="true">
      <span class="cell__lostWord">Nepojištěno!</span>
    </span>
  </button>
</template>

<style scoped>
.cell {
  --i: 0;
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 2.75rem;
  padding: var(--sp-2);
  border: 0;
  border-radius: var(--r-tile);
  background: linear-gradient(178deg, var(--c-tile-top) 0%, var(--c-tile-bottom) 100%);
  color: var(--c-value);
  overflow: hidden;
  box-shadow:
    inset 0 1.5px 0 var(--c-tile-sheen),
    inset 0 -2px 0 var(--shade-strong),
    inset 0 0 0 var(--border-w) var(--sheen-faint),
    0 4px 0 var(--c-tile-edge),
    0 10px 18px -8px rgba(0, 0, 0, 0.7);
  transition:
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out),
    filter var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
  animation: dealIn var(--dur-slow) var(--ease-out) calc(var(--i) * 22ms) both;
}

.cell::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.14) 50%, transparent 65%);
  translate: -120% 0;
  transition: translate var(--dur-slow) var(--ease-out);
}

/* Pole Riziko! tady vlastní styl nemá. Na desce vypadá jako každé jiné
   a --c-spark se objeví až v dialogu se sázkou a nad otázkou. */

/* Výběr myší: jediný kurzor na desce, musí jít přečíst z projektoru.
   Overflow zůstává hidden, ať záře nepřeteče na sousední políčko.
   Vnější rámeček nese outline, ten se neořezává. */
.cell--open:hover,
.cell--open:focus-visible {
  outline: var(--focus-ring-w) solid var(--focus-ring-c);
  outline-offset: var(--focus-ring-offset);
  z-index: 1;
  transform: translateY(-5px) scale(1.06);
  filter: brightness(1.18);
  color: var(--c-brand-soft);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.28),
    inset 0 0 0 2px color-mix(in oklab, var(--c-brand) 70%, white),
    0 10px 0 var(--c-tile-edge),
    0 22px 40px -8px var(--c-brand-glow);
}
.cell--open:hover .cell__value,
.cell--open:focus-visible .cell__value {
  color: var(--c-brand-soft);
  text-shadow:
    0 0 22px var(--c-brand-glow),
    0 0 8px color-mix(in oklab, var(--c-brand) 70%, transparent),
    0 2px 0 rgba(0, 0, 0, 0.5);
}

.cell--open:active {
  transform: translateY(3px) scale(1);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.5),
    0 0 0 var(--c-tile-edge);
}

.cell__value {
  font-family: var(--font-display);
  font-size: var(--fs-value);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1;
  text-shadow:
    0 -1px 0 rgba(255, 255, 255, 0.18),
    0 2px 0 rgba(0, 0, 0, 0.45),
    0 4px 22px var(--c-value-glow);
  transition:
    color var(--dur-fast) var(--ease-out),
    text-shadow var(--dur-fast) var(--ease-out);
}

.cell--won,
.cell--lost {
  cursor: default;
  animation: settle var(--dur-slow) var(--ease-out) both;
  /* Odehrané ustoupí: méně hrany, méně zdvihu, ať živá dlaždice drží pozornost. */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 1px 0 color-mix(in oklab, var(--c-tile-edge) 55%, transparent);
  transform: scale(0.97);
}

/* Odehrané políčko ustupuje do desky, ale ne krytím celého prvku.
   `opacity` by zředila i písmeno týmu pod 4,5:1. Ztlumení nese
   pozadí (víc --c-base) a text je světlý, protože na tmavším mixu
   --c-text-ink neprojde. --c-text na mixu 48 % / 34 % drží nejméně
   4,7:1 (limeta nahoře); písmeno týmu bere stejnou barvu. */
.cell--won {
  background: linear-gradient(
    178deg,
    color-mix(in oklab, var(--team) 48%, var(--c-base)) 0%,
    color-mix(in oklab, var(--team) 34%, var(--c-base)) 100%
  );
  color: var(--c-text);
}
.cell__won { display: grid; justify-items: center; gap: 2px; }
.cell__badge {
  font-family: var(--font-display);
  font-size: calc(var(--fs-value) * 0.58);
  font-weight: 800;
  line-height: 1;
}
/* Body jsou jen stopa, ne údaj k rozhodnutí. */
.cell__points {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
}

/* Neuhodnuté zhasne ještě hlouběji. Razítko je červené (--c-bad na
   --c-dead: 9,2:1), chladnější než jiskra u Rizika, ať se nepletou. */
.cell--lost {
  background: var(--c-dead);
  color: var(--c-bad);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 1px 0 color-mix(in oklab, var(--c-tile-edge) 55%, transparent);
}
.cell__lost {
  display: grid;
  place-items: center;
  max-width: 100%;
  padding-inline: var(--sp-1);
}
.cell__lostWord {
  font-family: var(--font-display);
  font-size: calc(var(--fs-value) * 0.3);
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-align: center;
  white-space: nowrap;
}

@keyframes dealIn {
  from { opacity: 0; transform: translateY(18px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
@keyframes settle {
  0% { transform: scale(1.06); }
  60% { transform: scale(0.95); }
  100% { transform: scale(0.97); }
}
.cell--won::after { animation: sweep var(--dur-slow) var(--ease-out) var(--dur-fast) both; }
@keyframes sweep {
  from { translate: -120% 0; }
  to { translate: 120% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cell { animation: none; }
  .cell::after { display: none; }
}
</style>
