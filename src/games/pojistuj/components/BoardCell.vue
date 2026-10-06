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
/* Dlaždice desky: plná modrá UNIQA, inkoustová hrana a tvrdý stín.
   Hmotu jí dává stín, ne přechod ani lesk. Odehrané políčko se do
   stínu zamáčkne a vezme si barvu týmu, takže je z dálky vidět, co je
   pryč a komu to patří. */
.cell {
  --i: 0;
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: var(--control-lg);
  padding: var(--sp-2);
  border: var(--border-w-heavy) solid var(--c-tile-edge);
  border-radius: var(--r-tile);
  background: var(--c-tile-top);
  color: var(--c-value);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition:
    translate var(--dur-press) var(--ease-out),
    box-shadow var(--dur-press) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
  animation: dealIn var(--dur-slow) var(--ease-back) calc(var(--i) * 22ms) both;
}

/* Pole Riziko! tady vlastní styl nemá. Na desce vypadá jako každé jiné
   a --c-spark se objeví až v dialogu se sázkou a nad otázkou. */

/* Výběr myší: jediný kurzor na desce, musí jít přečíst z projektoru.
   Dlaždice se zvedne ze stránky a ztmavne, prstenec nese obrys. */
.cell--open:hover,
.cell--open:focus-visible {
  outline: var(--focus-ring-w) solid var(--focus-ring-c);
  outline-offset: var(--focus-ring-offset);
  z-index: 1;
  translate: calc(var(--shadow-x-sm) * -1) calc(var(--shadow-x-sm) * -1);
  background: var(--c-brand-deep);
  box-shadow: var(--shadow-x-md) var(--shadow-x-md) 0 var(--c-ink), var(--shadow-x-lg) var(--shadow-x-lg) 0 var(--c-ink);
}

.cell--open:active {
  translate: var(--shadow-x-md) var(--shadow-x-md);
  box-shadow: var(--shadow-none);
}

.cell__value {
  font-family: var(--font-display);
  font-size: var(--fs-value);
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1;
}

.cell--won,
.cell--lost {
  cursor: default;
  translate: var(--shadow-x-md) var(--shadow-x-md);
  box-shadow: var(--shadow-none);
  animation: settle var(--dur-slow) var(--ease-out) both;
}

/* Odehrané patří týmu: jeho barva, inkoustové písmeno. Barvy týmů drží
   aspoň 7:1 vůči inkoustu. */
.cell--won {
  background: var(--team);
  color: var(--c-text-ink);
}
.cell__won { display: grid; justify-items: center; gap: 2px; }
.cell__badge {
  font-family: var(--font-display);
  font-size: calc(var(--fs-value) * 0.58);
  font-weight: 900;
  line-height: 1;
}
/* Body jsou jen stopa, ne údaj k rozhodnutí. */
.cell__points {
  font-size: var(--fs-xs);
  font-weight: 900;
  color: var(--c-text-ink);
}

/* Neuhodnuté zůstane prázdné a čárkované. Razítko je tmavě červené
   (--c-bad-deep na --c-dead), chladnější než jiskra u Rizika. */
.cell--lost {
  border-style: dashed;
  background: var(--c-dead);
  color: var(--c-bad-deep);
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
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-align: center;
  white-space: nowrap;
}

@keyframes dealIn {
  from { opacity: 0; transform: translateY(-1.5rem) scale(0.7) rotate(-6deg); }
  to { opacity: 1; transform: none; }
}
@keyframes settle {
  0% { transform: scale(1.08) rotate(-3deg); }
  60% { transform: scale(0.95) rotate(1deg); }
  100% { transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cell, .cell--won, .cell--lost { animation: none; }
}
</style>
