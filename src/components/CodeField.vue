<script setup lang="ts">
import { computed, ref } from 'vue'
import { CODE_LENGTH, normalizeCode } from '@/games/kviz/code'

/**
 * Pole na kód z plátna, jako řada dlaždic.
 *
 * Opisuje se znak po znaku a překlep stojí hráče celou hru, takže každý
 * znak má vlastní velké místo, stejné jako kód na plátně. Pole je
 * skutečné a neviditelné, leží přes dlaždice: klávesnice, vkládání
 * i čtečka tak fungují jako u každého pole.
 *
 * Sdílí ho kvíz i Výslech, obojí opisuje stejný kód stejným způsobem.
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'Kód' })

const model = defineModel<string>({ required: true })

/** Dlaždice, do které poputuje další znak, svítí jen se zaměřeným polem. */
const focused = ref(false)
const slots = computed(() => {
  const typed = normalizeCode(model.value)
  const next = Math.min(typed.length, CODE_LENGTH - 1)
  return Array.from({ length: CODE_LENGTH }, (_, i) => ({
    char: typed[i] ?? '',
    next: focused.value && i === next,
  }))
})
</script>

<template>
  <label class="code">
    <input
      v-model="model"
      class="code__input"
      type="text"
      inputmode="text"
      autocapitalize="characters"
      autocomplete="off"
      spellcheck="false"
      :maxlength="CODE_LENGTH"
      :aria-label="label"
      @focus="focused = true"
      @blur="focused = false"
    />
    <span class="code__slots" :style="{ '--n': CODE_LENGTH }" aria-hidden="true">
      <span
        v-for="(slot, i) in slots"
        :key="i"
        class="code__slot"
        :class="{ 'code__slot--filled': slot.char, 'code__slot--next': slot.next }"
        :style="{ '--i': i }"
      ><span v-if="slot.char" :key="slot.char" class="code__char">{{ slot.char }}</span></span>
    </span>
  </label>
</template>

<style scoped>
.code {
  position: relative;
  display: block;
  width: min(100%, 20rem);
  margin-block: var(--sp-2);
  cursor: text;
}
.code__input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  opacity: 0;
  /* Pod 16 px by iOS při zaměření přiblížil stránku. */
  font-size: var(--fs-md);
  caret-color: transparent;
}
.code__slots {
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: var(--sp-2);
}
.code__slot {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 5;
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  color: var(--c-brand);
  font-family: var(--font-display);
  font-size: var(--fs-3xl);
  font-weight: 900;
  line-height: 1;
  transition:
    translate var(--dur-press) var(--ease-out),
    box-shadow var(--dur-press) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
/* Napsaný znak se do dlaždice plácne a dlaždice se každá trochu jinak
   natočí, jako by ležely na stole. */
.code__slot--filled { rotate: calc((var(--i) - (var(--n) - 1) / 2) * 1.5deg); }
.code__char { animation: code-in var(--dur-pop) var(--ease-back) both; }
/* Kam poputuje další znak: dlaždice povyskočí a zmodrá. */
.code__slot--next {
  translate: 0 calc(var(--sp-1) * -1);
  background: var(--c-brand-wash);
  box-shadow: var(--shadow-md);
}
.code__slot--next:not(.code__slot--filled)::after {
  content: '';
  width: var(--border-w-heavy);
  height: 45%;
  background: var(--c-brand);
  animation: code-caret 1s steps(2, jump-none) infinite;
}

@keyframes code-in {
  from { transform: scale(1.8) rotate(12deg); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@keyframes code-caret {
  from { opacity: 1; }
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .code__char,
  .code__slot--next::after { animation: none; }
}
</style>
