<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Team } from '@/types'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { countTo, duration } from '@/lib/motion'

const props = defineProps<{ team: Team; index: number; active: boolean }>()
defineEmits<{ activate: [] }>()

const shown = ref(props.team.score)
let cancel: (() => void) | null = null

watch(
  () => props.team.score,
  (to, from) => {
    cancel?.()
    cancel = countTo(from ?? 0, to, duration('--dur-count', 900), (v) => {
      shown.value = v
    })
  },
)
</script>

<template>
  <button
    type="button"
    class="team"
    :data-team-id="team.id"
    :class="{ 'team--active': active }"
    :style="{ '--team': `var(${teamColor(team.color).cssVar})` }"
    :aria-label="`${team.name}, ${formatScore(team.score)} bodů${active ? ', na tahu' : ''}`"
    :aria-pressed="active"
    @click="$emit('activate')"
  >
    <span class="team__badge">{{ teamBadge(index) }}</span>
    <span class="team__body">
      <span class="team__name">{{ team.name }}</span>
      <span class="team__score" :class="{ 'team__score--neg': team.score < 0 }">
        {{ formatScore(shown) }}
      </span>
    </span>
    <span v-if="active" class="team__turn">na tahu</span>
  </button>
</template>

<style scoped>
.team {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  min-width: 0;
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  color: var(--c-text);
  text-align: left;
  transition:
    border-color var(--dur-base) var(--ease-out),
    background-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.team:hover { border-color: var(--c-surface-3); }

.team--active {
  border-color: var(--team);
  background: color-mix(in oklab, var(--team) 14%, var(--c-surface));
  transform: translateY(-2px);
  box-shadow: 0 10px 28px -16px var(--team);
}
.team--active::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid var(--team);
  opacity: 0.6;
  animation: pulse 2.6s var(--ease-both) infinite;
  pointer-events: none;
}

.team__badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-lg);
  line-height: 1;
}

.team__body { display: grid; min-width: 0; }
.team__name {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.team__score {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.team__score--neg { color: var(--c-bad); }

.team__turn {
  position: absolute;
  top: calc(var(--sp-2) * -1);
  right: var(--sp-3);
  padding: 1px var(--sp-2);
  border-radius: var(--r-full);
  background: var(--team);
  color: var(--c-text-ink);
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

@keyframes pulse {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.75; }
}
@media (prefers-reduced-motion: reduce) {
  .team--active::before { animation: none; }
}
</style>
