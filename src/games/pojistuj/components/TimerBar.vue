<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'

const props = defineProps<{ seconds: number; running: boolean }>()
const emit = defineEmits<{ expired: [] }>()

const left = ref(props.seconds)
let handle = 0
let lastTick = -1

const pct = computed(() => (props.seconds ? Math.max(0, left.value / props.seconds) : 0))
const urgent = computed(() => left.value <= Math.max(3, props.seconds * 0.2))

function loop() {
  const end = performance.now() + left.value * 1000
  const step = () => {
    const remaining = Math.max(0, (end - performance.now()) / 1000)
    left.value = remaining
    const whole = Math.ceil(remaining)
    if (urgent.value && whole !== lastTick && whole > 0 && settings.sound) {
      lastTick = whole
      sfx.tick()
    }
    if (remaining <= 0) {
      if (settings.sound) sfx.timeout()
      emit('expired')
      return
    }
    handle = requestAnimationFrame(step)
  }
  handle = requestAnimationFrame(step)
}

onMounted(() => {
  if (props.running && props.seconds > 0) loop()
})
onBeforeUnmount(() => cancelAnimationFrame(handle))
</script>

<template>
  <div v-if="seconds > 0" class="timer" :class="{ 'timer--urgent': urgent }">
    <div class="timer__track">
      <div class="timer__fill" :style="{ transform: `scaleX(${pct})` }" />
    </div>
    <span class="timer__num" role="timer" :aria-label="`Zbývá ${Math.ceil(left)} sekund`">
      {{ Math.ceil(left) }}
    </span>
  </div>
</template>

<style scoped>
.timer { display: flex; align-items: center; gap: var(--sp-4); width: 100%; }
.timer__track {
  flex: 1;
  height: 6px;
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  overflow: hidden;
}
.timer__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--c-brand-deep), var(--c-brand));
  transform-origin: left center;
  transition: background var(--dur-base) var(--ease-out);
}
.timer__num {
  min-width: 2.5ch;
  text-align: right;
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-muted);
  transition: color var(--dur-base) var(--ease-out);
}
.timer--urgent .timer__fill { background: linear-gradient(90deg, var(--c-bad-deep), var(--c-bad)); }
.timer--urgent .timer__num { color: var(--c-bad); animation: beat 1s var(--ease-both) infinite; }

@keyframes beat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@media (prefers-reduced-motion: reduce) {
  .timer--urgent .timer__num { animation: none; }
}
</style>
