<script setup lang="ts">
import { quizOption, optionLabel, OPTION_COUNT } from '../options'

defineProps<{ locked: boolean; chosen: number | null }>()
const emit = defineEmits<{ pick: [index: number] }>()

const slots = Array.from({ length: OPTION_COUNT }, (_, i) => i)
</script>

<template>
  <div class="pad">
    <button
      v-for="i in slots"
      :key="i"
      type="button"
      class="key"
      :class="{ 'key--off': locked && chosen !== i, 'key--on': chosen === i }"
      :style="{ '--tint': `var(${quizOption(i).color.cssVar})` }"
      :disabled="locked"
      :aria-label="optionLabel(i)"
      @click="emit('pick', i)"
    >
      <span class="key__letter" aria-hidden="true">{{ quizOption(i).letter }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Čtyři dlaždice vyplní obrazovku telefonu. Mačká se to v ruce, často
   ve spěchu, takže cíl je celá čtvrtina displeje, ne tlačítko. */
.pad {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: var(--sp-3);
  height: 100%;
  min-height: 0;
}

.key {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 0;
  border: var(--separator-w) solid color-mix(in oklab, var(--c-text-ink) 30%, var(--tint));
  border-radius: var(--r-xl);
  background: var(--tint);
  color: var(--c-text-ink);
  box-shadow: var(--shadow-sm), inset 0 var(--separator-w) 0 color-mix(in oklab, var(--c-value) 42%, transparent);
  transition:
    transform var(--dur-fast) var(--ease-both),
    opacity var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out);
}
.key:active:not(:disabled) { transform: scale(0.96); }

.key__letter {
  font-family: var(--font-display);
  font-size: var(--fs-phone-option);
  font-weight: 900;
  line-height: 1;
}

/* Zvolená zůstane svítit, ostatní zhasnou. Rozdíl nestojí jen na jasu:
   zvolená má plný rámeček a zvětšené písmeno. */
.key--on {
  outline: var(--sp-1) solid var(--c-text-ink);
  outline-offset: calc(var(--sp-1) * -1);
  transform: scale(1.02);
}
.key--off { opacity: 0.25; }
.key:disabled { cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .key--on { transform: none; }
  .key:active:not(:disabled) { transform: none; }
}
</style>
