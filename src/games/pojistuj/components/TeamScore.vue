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
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  color: var(--c-text);
  text-align: left;
  transition:
    background-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-back),
    box-shadow var(--dur-base) var(--ease-out);
}
.team:hover { background: var(--c-surface-2); }

/* Tým na tahu se vyplní svou barvou a povyskočí nad ostatní. Tým se
   tím nerozlišuje jen barvou: písmeno i štítek „na tahu" zůstávají. */
.team--active,
.team--active:hover {
  background: var(--team);
  color: var(--c-text-ink);
  transform: translateY(calc(var(--sp-1) * -1));
  box-shadow: var(--shadow-md);
}
.team--active .team__name { color: var(--c-text-ink); }
.team--active .team__badge { background: var(--c-ink); color: var(--team); }

.team__badge {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--control-lg);
  height: var(--control-lg);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-lg);
  line-height: 1;
}

.team__body { display: grid; min-width: 0; }
.team__name {
  font-size: var(--fs-md);
  font-weight: 900;
  color: var(--c-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.team__score {
  font-family: var(--font-display);
  font-size: var(--fs-team-score);
  font-weight: 900;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.team__score--neg { color: var(--c-bad); }
.team--active .team__score--neg { color: var(--c-bad-deep); }

.team__turn {
  position: absolute;
  top: calc(var(--sp-2) * -1);
  right: var(--sp-3);
  padding: 1px var(--sp-2);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-surface);
  color: var(--c-text-ink);
  font-size: var(--fs-2xs);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

</style>
