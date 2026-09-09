<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Team } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'

const props = defineProps<{ team: Team; teamIndex: number; max: number; base: number }>()
const emit = defineEmits<{ confirm: [amount: number]; cancel: [] }>()

const amount = ref(props.base)

const steps = computed(() => {
  const out = new Set<number>([props.base, Math.round(props.max / 2), props.max])
  return [...out].filter((v) => v > 0 && v <= props.max).sort((a, b) => a - b)
})

function confirm() {
  emit('confirm', Math.min(props.max, Math.max(0, Math.round(amount.value))))
}
</script>

<template>
  <div class="wager" role="dialog" aria-modal="true" aria-label="Pole Nepojištěno">
    <div class="wager__panel" :style="{ '--team': `var(${teamColor(team.color).cssVar})` }">
      <p class="wager__kicker">tohle pole nekryje</p>
      <h2 class="wager__title">Nepojištěno!</h2>

      <p class="wager__lead">
        <span class="wager__badge">{{ teamBadge(teamIndex) }}</span>
        <strong>{{ team.name }}</strong> si volí, kolik bodů vsadí. Za správnou odpověď
        sázku získá, za špatnou ji ztratí.
      </p>

      <output class="wager__amount">{{ formatScore(amount) }}</output>

      <input
        v-model.number="amount"
        class="wager__slider"
        type="range"
        min="0"
        :max="max"
        :step="Math.max(10, Math.round(max / 20))"
        :aria-label="`Sázka, maximum ${max}`"
      />

      <div class="wager__steps">
        <button v-for="s in steps" :key="s" type="button" @click="amount = s">
          {{ formatScore(s) }}
        </button>
      </div>

      <div class="wager__actions">
        <UiButton variant="ghost" @click="emit('cancel')">Zpět na desku</UiButton>
        <UiButton variant="spark" size="lg" @click="confirm">Vsadit a zobrazit otázku</UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wager {
  position: fixed;
  inset: 0;
  z-index: var(--z-stage);
  display: grid;
  place-items: center;
  padding: var(--sp-5);
  background: var(--c-scrim);
  backdrop-filter: blur(8px);
  animation: fade var(--dur-base) var(--ease-out) both;
}
.wager__panel {
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  width: min(100%, 34rem);
  padding: var(--sp-7) var(--sp-6);
  text-align: center;
  border: 1px solid var(--c-spark-deep);
  border-radius: var(--r-xl);
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--c-spark) 16%, transparent), transparent 60%), var(--c-surface);
  box-shadow: var(--shadow-lg);
  animation: pop var(--dur-slow) var(--ease-back) both;
}
/* Ruční písmo, druhé ze tří povolených míst. Úřední rubrika nad slovem
   Nepojištěno! by tu vtip zabila. */
.wager__kicker {
  font-family: var(--font-hand);
  font-weight: 500;
  font-size: var(--fs-xl);
  line-height: 1;
  color: var(--c-text-faint);
}
.wager__title {
  font-size: var(--fs-3xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--c-spark);
  text-shadow: 0 4px 30px var(--c-spark-glow);
}
.wager__lead { color: var(--c-text-muted); font-size: var(--fs-sm); max-width: 34ch; line-height: var(--lh-body); }
.wager__badge {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: var(--sp-1);
  vertical-align: -0.3em;
  border-radius: var(--r-full);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
}
.wager__lead strong { color: var(--c-text); }

.wager__amount {
  font-family: var(--font-display);
  font-size: clamp(3rem, 9vw, 5rem);
  font-weight: 800;
  line-height: 1;
  color: var(--c-spark);
  font-variant-numeric: tabular-nums;
}

.wager__slider {
  width: 100%;
  accent-color: var(--c-spark);
}
.wager__steps { display: flex; gap: var(--sp-2); flex-wrap: wrap; justify-content: center; }
.wager__steps button {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.wager__steps button:hover { color: var(--c-text); border-color: var(--c-spark); }

.wager__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; margin-top: var(--sp-2); }

@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: translateY(20px) scale(0.94); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .wager, .wager__panel { animation: none; }
}
</style>
