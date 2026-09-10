<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'

const props = defineProps<{ seconds: number; running: boolean }>()
const emit = defineEmits<{ expired: [] }>()

const left = ref(props.seconds)
const paused = ref(false)
let handle = 0
let lastTick = -1
/** Zbývající ms v momentě pauzy, ať se po obnovení počítá dál. */
let remainingMs = props.seconds * 1000

const pct = computed(() => (props.seconds ? Math.max(0, left.value / props.seconds) : 0))
const urgent = computed(() => left.value <= Math.max(3, props.seconds * 0.2))
const done = computed(() => left.value <= 0)

function stopLoop() {
  cancelAnimationFrame(handle)
  handle = 0
}

function loop() {
  stopLoop()
  const end = performance.now() + remainingMs
  const step = () => {
    if (paused.value) return
    remainingMs = Math.max(0, end - performance.now())
    left.value = remainingMs / 1000
    const whole = Math.ceil(left.value)
    if (urgent.value && whole !== lastTick && whole > 0 && settings.sound) {
      lastTick = whole
      sfx.tick()
    }
    if (remainingMs <= 0) {
      left.value = 0
      if (settings.sound) sfx.timeout()
      emit('expired')
      return
    }
    handle = requestAnimationFrame(step)
  }
  handle = requestAnimationFrame(step)
}

function togglePause() {
  if (done.value) return
  if (paused.value) {
    paused.value = false
    loop()
  } else {
    paused.value = true
    stopLoop()
  }
}

watch(
  () => props.running,
  (run) => {
    if (!run) {
      paused.value = true
      stopLoop()
    } else if (!done.value) {
      paused.value = false
      loop()
    }
  },
)

onMounted(() => {
  if (props.running && props.seconds > 0) loop()
})
onBeforeUnmount(() => stopLoop())
</script>

<template>
  <div v-if="seconds > 0" class="timer" :class="{ 'timer--urgent': urgent && !paused, 'timer--paused': paused }">
    <div class="timer__track">
      <div class="timer__fill" :style="{ transform: `scaleX(${pct})` }" />
    </div>
    <span class="timer__num" role="timer" :aria-label="`Zbývá ${Math.ceil(left)} sekund`">
      {{ Math.ceil(left) }}
    </span>
    <button
      v-if="!done"
      type="button"
      class="timer__pause"
      :aria-label="paused ? 'Spustit časomíru' : 'Pozastavit časomíru'"
      @click="togglePause"
    >
      <svg v-if="!paused" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.timer { display: flex; align-items: center; gap: var(--sp-3); width: 100%; }
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
.timer__pause {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  flex: none;
}
.timer__pause:hover { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface-2); }
.timer--urgent .timer__fill { background: linear-gradient(90deg, var(--c-bad-deep), var(--c-bad)); }
.timer--urgent .timer__num { color: var(--c-bad); animation: beat 1s var(--ease-both) infinite; }
.timer--paused .timer__num { color: var(--c-text-faint); }

@keyframes beat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@media (prefers-reduced-motion: reduce) {
  .timer--urgent .timer__num { animation: none; }
}
@media (pointer: coarse) {
  .timer__pause { width: 2.75rem; height: 2.75rem; }
}
</style>
