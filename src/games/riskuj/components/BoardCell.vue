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
  return `${props.categoryName}, ${props.value} bodů, neuhodl nikdo`
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
    :class="[`cell--${state.status}`]"
    :style="{ '--i': index, '--team': color ? `var(${color})` : 'transparent' }"
    :disabled="state.status !== 'open'"
    :aria-label="label"
    @click="open"
  >
    <span v-if="state.status === 'open'" class="cell__value">{{ formatScore(value) }}</span>

    <span v-else-if="state.status === 'won'" class="cell__won">
      <span class="cell__badge">{{ teamBadge(teamIndex) }}</span>
      <span class="cell__points">{{ (state.points ?? 0) >= 0 ? '+' : '' }}{{ formatScore(state.points ?? value) }}</span>
    </span>

    <span v-else class="cell__lost" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
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
  border: 1px solid var(--c-surface-3);
  border-radius: var(--r-lg);
  background: linear-gradient(165deg, var(--c-surface-2) 0%, var(--c-surface) 100%);
  color: var(--c-gold);
  overflow: hidden;
  transition:
    transform var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
  animation: dealIn var(--dur-slow) var(--ease-out) calc(var(--i) * 22ms) both;
}

/* Lesk, který přejede přes dlaždici při najetí. */
.cell::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.14) 50%, transparent 65%);
  translate: -120% 0;
  transition: translate var(--dur-slow) var(--ease-out);
}

.cell--open:hover {
  transform: translateY(-3px);
  border-color: var(--c-gold);
  box-shadow: 0 12px 30px -14px var(--c-gold-glow);
}
.cell--open:hover::after { translate: 120% 0; }
.cell--open:active { transform: translateY(-1px) scale(0.99); }

.cell__value {
  font-family: var(--font-display);
  font-size: var(--fs-value);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  text-shadow: 0 2px 14px var(--c-gold-glow);
}

/* Vyřešená políčka ------------------------------------------------------- */
.cell--won,
.cell--lost {
  cursor: default;
  animation: settle var(--dur-slow) var(--ease-out) both;
}

.cell--won {
  border-color: color-mix(in oklab, var(--team) 60%, transparent);
  /* Barva týmu musí zůstat dost světlá, aby na ní tmavý text držel kontrast. */
  background: linear-gradient(165deg, var(--team) 0%, color-mix(in oklab, var(--team) 76%, black) 100%);
  color: var(--c-text-ink);
}
.cell__won { display: grid; justify-items: center; gap: 2px; }
.cell__badge {
  font-family: var(--font-display);
  font-size: calc(var(--fs-value) * 0.72);
  font-weight: 800;
  line-height: 1;
}
.cell__points { font-size: var(--fs-xs); font-weight: 700; opacity: 0.85; }

.cell--lost {
  border-color: #12172B;
  background: var(--c-dead);
  color: #2A3252;
  box-shadow: inset 0 2px 20px rgba(0, 0, 0, 0.8);
}

@keyframes dealIn {
  from { opacity: 0; transform: translateY(18px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
@keyframes settle {
  0% { transform: scale(1.06); }
  100% { transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cell { animation: none; }
  .cell::after { display: none; }
}
</style>
