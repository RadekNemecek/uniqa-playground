<script setup lang="ts">
import { computed } from 'vue'
import { BOOLEAN_LABELS, optionCountFor, optionLabel, quizOption } from '../options'
import type { QuizKind } from '../types'

const props = withDefaults(
  defineProps<{
    locked: boolean
    chosen: number | null
    /** Tvar otázky. U tvrzení jsou tlačítka dvě a nesou slova. */
    kind?: QuizKind
  }>(),
  { kind: 'choice' },
)

const emit = defineEmits<{ pick: [index: number] }>()

const slots = computed(() => Array.from({ length: optionCountFor(props.kind) }, (_, i) => i))

/**
 * Znění na tlačítku. U čtveřice možností tam žádné není, texty jsou na
 * plátně. U tvrzení ano: ANO a NE nejsou obsah otázky, jsou to
 * dvě stálá slova, a bez nich by hráč hádal, co znamená A.
 */
function word(i: number): string {
  return props.kind === 'boolean' ? (BOOLEAN_LABELS[i] ?? '') : ''
}
</script>

<template>
  <div class="pad" :class="{ 'pad--two': kind === 'boolean' }">
    <button
      v-for="i in slots"
      :key="i"
      type="button"
      class="key"
      :class="{ 'key--off': locked && chosen !== i, 'key--on': chosen === i }"
      :style="{ '--tint': `var(${quizOption(i).color.cssVar})`, '--d': i }"
      :disabled="locked"
      :aria-label="optionLabel(i, kind)"
      @click="emit('pick', i)"
    >
      <span v-if="word(i)" class="key__word" aria-hidden="true">{{ word(i) }}</span>
      <span class="key__letter" :class="{ 'key__letter--small': word(i) }" aria-hidden="true">
        {{ quizOption(i).letter }}
      </span>
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

/* Tvrzení má dvě možnosti, tedy dva pruhy přes celou šířku. Palec je
   trefí i poslepu a slovo se vejde na jeden řádek. */
.pad--two { grid-template-columns: minmax(0, 1fr); }

.key {
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--sp-2);
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
  /* Tlačítka nastupují po sobě, aby bylo znát, že přišla nová otázka.
     Výplň je `backwards`, ne `both`: dojetá animace by jinak držela
     `transform: none` a přebila zvětšení zvolené dlaždice. */
  animation: key-in var(--dur-base) var(--ease-back) calc(var(--d) * 50ms) backwards;
}
.key:active:not(:disabled) { transform: scale(0.96); }

.key__letter {
  font-family: var(--font-display);
  font-size: var(--fs-phone-option);
  font-weight: 900;
  line-height: 1;
}
/* U tvrzení nese tlačítko slovo a písmeno je jen druhý rozlišovací znak. */
.key__letter--small { font-size: var(--fs-lg); opacity: 0.7; }
.key__word {
  font-family: var(--font-display);
  font-size: var(--fs-phone-word);
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

@keyframes key-in {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .key { animation: none; }
  .key--on { transform: none; }
  .key:active:not(:disabled) { transform: none; }
}
</style>
