<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GameState } from '@/types'
import { cellKey } from '@/types'
import BoardCell from './BoardCell.vue'
import TeamScore from './TeamScore.vue'
import {
  restoreTurnOrder,
  setActiveTeam,
  teamById,
  turnOverridden,
  turnTeam,
} from '@/stores/game'
import { teamBadge, teamColor } from '@/lib/teams'

const props = defineProps<{ game: GameState }>()
const emit = defineEmits<{ open: [key: string, el: HTMLElement] }>()

const cols = computed(() => props.game.categories.length)
const rows = computed(() => props.game.ladder.length)

interface Cell {
  key: string
  value: number
  categoryName: string
}

const flat = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (const value of props.game.ladder) {
    for (const cat of props.game.categories) {
      out.push({ key: cellKey(cat.id, value), value, categoryName: cat.name })
    }
  }
  return out
})

function teamIndexOf(key: string): number {
  const id = props.game.cells[key]?.teamId
  return id ? props.game.teams.findIndex((t) => t.id === id) : 0
}

function open(key: string, el: HTMLElement) {
  emit('open', key, el)
}

/* --- Ovládání desky od klávesnice ---------------------------------------
   Otázku moderátorka vede mezerníkem, ale výběr políčka ji dosud pokaždé
   poslal zpátky pro myš, nebo pětadvacetkrát přes tabulátor. Šipky chodí
   po mřížce, Enter a mezerník políčko otevřou.

   Zaměření drží prohlížeč na skutečném tlačítku, nedržíme si vlastní
   „vybranou" buňku: dvě představy o tom, kde uživatelka je, se dřív nebo
   později rozejdou. */
const grid = ref<HTMLElement | null>(null)

function cellButtons(): HTMLButtonElement[] {
  return Array.from(grid.value?.querySelectorAll<HTMLButtonElement>('.cell') ?? [])
}

function onGridKey(e: KeyboardEvent): void {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return

  const buttons = cellButtons()
  if (buttons.length === 0) return

  const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
  // Zaměření je někde jinde v desce: šipka ho přivede na první políčko.
  if (at < 0) {
    e.preventDefault()
    buttons[0]?.focus()
    return
  }

  const c = cols.value
  let next = at
  switch (e.key) {
    case 'ArrowRight': next = at + 1; break
    case 'ArrowLeft': next = at - 1; break
    case 'ArrowDown': next = at + c; break
    case 'ArrowUp': next = at - c; break
    case 'Home': next = Math.floor(at / c) * c; break
    case 'End': next = Math.floor(at / c) * c + c - 1; break
  }
  if (next < 0 || next >= buttons.length) return

  e.preventDefault()
  buttons[next]?.focus()
}
</script>

<template>
  <div class="board">
    <div class="board__top">
      <div class="board__teams" role="group" aria-label="Skóre týmů">
        <TeamScore
          v-for="(t, i) in game.teams"
          :key="t.id"
          :team="t"
          :index="i"
          :active="i === game.activeTeamIndex"
          @activate="setActiveTeam(i)"
        />
      </div>

      <p v-if="turnOverridden && turnTeam" class="board__turn-fix">
        <span class="board__turn-note">
          Tah byl ručně přesunut. Původně byl na řadě
          <span
            class="board__turn-who"
            :style="{ '--team': `var(${teamColor(turnTeam.color).cssVar})` }"
          >
            <span class="board__turn-badge">{{ teamBadge(game.turnResumeIndex ?? 0) }}</span>
            {{ turnTeam.name }}
          </span>
        </span>
        <button type="button" class="board__turn-btn" @click="restoreTurnOrder">
          Vrátit tah
        </button>
      </p>
    </div>

    <!-- role="grid" bez řádků a buněk slibovala odečítači víc, než uměla.
         Obyčejná skupina tlačítek se šipkami je poctivější. -->
    <div
      ref="grid"
      class="board__grid"
      :style="{ '--cols': cols, '--rows': rows }"
      role="group"
      aria-label="Herní deska, šipkami mezi políčky"
      @keydown="onGridKey"
    >
      <div v-for="cat in game.categories" :key="cat.id" class="board__cat">
        <span v-fit-text>{{ cat.name }}</span>
      </div>

      <div v-for="(c, i) in flat" :key="c.key" class="board__cell">
        <BoardCell
          :value="c.value"
          :state="game.cells[c.key] ?? { status: 'open' }"
          :team="teamById(game.cells[c.key]?.teamId)"
          :team-index="teamIndexOf(c.key)"
          :category-name="c.categoryName"
          :index="i"
          @open="(el) => open(c.key, el)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--sp-4);
  padding: 0 var(--sp-5) var(--sp-5);
  width: min(100%, 1720px);
  margin-inline: auto;
  min-height: 0;
  height: 100%;
}

.board__top {
  display: grid;
  gap: var(--sp-3);
}

.board__teams {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: var(--sp-3);
}

.board__turn-fix {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-brand-wash);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.board__turn-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
.board__turn-who {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-weight: 900;
  color: var(--c-text);
}
.board__turn-badge {
  display: inline-grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
}
.board__turn-btn {
  flex: none;
  padding: var(--sp-2) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-brand);
  box-shadow: var(--shadow-sm);
  color: var(--c-on-accent);
  font-size: var(--fs-sm);
  font-weight: 900;
}
.board__turn-btn:hover { background: var(--c-brand-deep); }
.board__turn-btn:active { translate: var(--shadow-x-sm) var(--shadow-x-sm); box-shadow: var(--shadow-none); }

.board__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-template-rows: auto repeat(var(--rows), minmax(0, 1fr));
  gap: clamp(8px, 0.9vw, 16px);
  min-height: 0;
  height: 100%;
}

.board__cat {
  position: relative;
  display: grid;
  place-items: center;
  min-height: clamp(3.25rem, 2.4rem + 1.2vh, 4.75rem);
  padding: var(--sp-3) var(--sp-3) calc(var(--sp-3) + 2px);
  border-radius: var(--r-md);
  background: var(--c-ink);
  border: 0;
  color: var(--c-on-ink);
  text-align: center;
  animation: dropIn var(--dur-slow) var(--ease-out) both;
}
.board__cat::after {
  display: none;
}
.board__cat span {
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  max-width: 100%;
  /* Dlouhé slovo se nedělí, ani podle slovníku. „ODPOVĚDNOSTNÍ" rozseknuté
     na dva řádky se z posledního stolu čte jako dvě slova. Když je širší
     než sloupec, ubere `v-fit-text` na velikosti, dokud se nevejde. */
  font-size: calc(var(--fs-cat) * var(--fit-text, 1));
}

.board__cell { display: contents; }
.board__cell > * { width: 100%; }

@keyframes dropIn {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .board__cat { animation: none; }
}

@media (max-width: 720px) {
  .board { padding-inline: var(--sp-3); }
  .board__cat { min-height: 2.75rem; padding-block: var(--sp-2) calc(var(--sp-2) + 4px); }
}

@media (max-height: 560px), (max-width: 560px) {
  .board { height: auto; }
  .board__grid { grid-auto-rows: minmax(3.25rem, auto); }
}

@media (pointer: coarse) {
  .board__turn-btn { min-height: 2.75rem; }
}
</style>
