<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { GameState } from '@/types'
import { cellKey } from '@/types'
import BoardCell from './BoardCell.vue'
import TeamScore from './TeamScore.vue'
import { setActiveTeam, teamById } from '@/stores/game'

const props = defineProps<{ game: GameState }>()
const emit = defineEmits<{ open: [key: string, el: HTMLElement] }>()

const grid = ref<HTMLElement | null>(null)
const cursor = ref(0)

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

/* --- Ovládání klávesnicí -------------------------------------------------
   Moderátorka musí zvládnout hru bez míření myší. */
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

  const total = flat.value.length
  if (total === 0) return

  let next = cursor.value
  switch (e.key) {
    case 'ArrowRight': next = (cursor.value + 1) % total; break
    case 'ArrowLeft': next = (cursor.value - 1 + total) % total; break
    case 'ArrowDown': next = (cursor.value + cols.value) % total; break
    case 'ArrowUp': next = (cursor.value - cols.value + total) % total; break
    default: return
  }
  e.preventDefault()
  cursor.value = next
  focusCursor()
}

function focusCursor() {
  const buttons = grid.value?.querySelectorAll<HTMLButtonElement>('.board__cell button')
  buttons?.[cursor.value]?.focus()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="board">
    <!-- Skóre týmů -------------------------------------------------------- -->
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

    <!-- Deska ------------------------------------------------------------- -->
    <div
      ref="grid"
      class="board__grid"
      :style="{ '--cols': cols, '--rows': rows }"
      role="grid"
      aria-label="Herní deska"
    >
      <div v-for="cat in game.categories" :key="cat.id" class="board__cat">
        <span>{{ cat.name }}</span>
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
  /* Deska musí padnout na jednu obrazovku. Na projektoru se nescrolluje. */
  min-height: 0;
  height: 100%;
}

.board__teams {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: var(--sp-3);
}

/* Studiové světlo nad deskou. Nesmí být vidět jako efekt, jen bere
   ploše plochost. */
.board__grid::before {
  content: '';
  position: absolute;
  inset: -12% -6% auto;
  height: 60%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(60% 100% at 50% 0%, rgba(120, 142, 255, 0.16), transparent 70%);
}

.board__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-template-rows: auto repeat(var(--rows), minmax(0, 1fr));
  gap: clamp(6px, 0.7vw, 14px);
  min-height: 0;
  height: 100%;
}

.board__cat {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 2.75rem;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: linear-gradient(180deg, var(--c-surface-3) 0%, var(--c-surface-2) 100%);
  border: 0;
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 var(--c-tile-edge);
  color: var(--c-text);
  text-align: center;
  animation: dropIn var(--dur-slow) var(--ease-out) both;
}
/* Tenká zlatá linka pod hlavičkou drží sloupec pohromadě. */
.board__cat::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 4px;
  height: 2px;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--c-brand) 60%, transparent), transparent);
}
.board__cat span {
  font-family: var(--font-display);
  font-size: calc(clamp(0.75rem, 0.55rem + 0.65vw, 1.15rem) * var(--scale));
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  line-height: 1.15;
  text-wrap: balance;
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
  .board__cat { min-height: 2.25rem; }
}

/* Na malé nebo nízké obrazovce se radši scrolluje, než aby se deska
   smrskla do nečitelna. */
@media (max-height: 560px), (max-width: 560px) {
  .board { height: auto; }
  .board__grid { grid-auto-rows: minmax(3.25rem, auto); }
}
</style>
