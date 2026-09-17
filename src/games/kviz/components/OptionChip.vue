<script setup lang="ts">
import { computed } from 'vue'
import { quizOption, optionLabel } from '../options'

const props = withDefaults(
  defineProps<{
    index: number
    text?: string
    /** Vyhodnocení jen ztlumí chybnou možnost. */
    state?: 'idle' | 'wrong'
  }>(),
  { text: '', state: 'idle' },
)

const option = computed(() => quizOption(props.index))
const label = computed(() => optionLabel(props.index))
</script>

<template>
  <div class="chip" :class="`chip--${state}`" :style="{ '--tint': `var(${option.color.cssVar})` }">
    <span class="chip__letter" aria-hidden="true">{{ option.letter }}</span>
    <span v-if="text" class="chip__text">{{ text }}</span>

    <span class="vh">{{ label }}</span>
  </div>
</template>

<style scoped>
/* Celá plocha nese barvu možnosti. Tmavý text na všech čtyřech odstínech
   drží nejméně 7:1, takže jsou volby výrazné a stále dobře čitelné. */
.chip {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(var(--sp-4) * var(--fit, 1));
  min-width: 0;
  min-height: calc(var(--sp-9) * var(--fit, 1));
  padding: calc(var(--sp-4) * var(--fit, 1)) calc(var(--sp-5) * var(--fit, 1));
  border: var(--separator-w) solid color-mix(in oklab, var(--c-text-ink) 30%, var(--tint));
  border-radius: var(--r-lg);
  background: var(--tint);
  box-shadow: var(--shadow-md), inset 0 var(--separator-w) 0 color-mix(in oklab, var(--c-value) 42%, transparent);
  color: var(--c-text-ink);
  transition:
    opacity var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

.chip__letter {
  display: grid;
  place-items: center;
  width: calc(var(--sp-8) * var(--fit, 1));
  aspect-ratio: 1;
  border-radius: var(--r-lg);
  background: color-mix(in oklab, var(--c-text-ink) 10%, transparent);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: calc(var(--fs-2xl) * var(--fit, 1));
  line-height: 1;
  color: var(--c-text-ink);
  box-shadow: inset 0 0 0 var(--separator-w) color-mix(in oklab, var(--c-text-ink) 28%, transparent);
}

.chip__text {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
  line-height: var(--lh-snug);
  text-wrap: balance;
}

.chip--wrong { opacity: 0.4; }
</style>
