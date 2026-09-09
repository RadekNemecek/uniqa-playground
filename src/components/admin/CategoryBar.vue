<script setup lang="ts">
import type { Category } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'

const props = defineProps<{
  categories: Category[]
  /** Kolik otázek je v dané kategorii hotových. */
  readyCount: (categoryId: string) => number
  total: number
  max: number
}>()

const emit = defineEmits<{
  move: [index: number, by: number]
  remove: [categoryId: string]
  add: []
}>()

function ready(id: string): boolean {
  return props.readyCount(id) === props.total
}
</script>

<template>
  <section class="bar">
    <div class="bar__head">
      <h3 class="bar__title">Kategorie</h3>
      <p class="bar__note">Každá kategorie je jeden sloupec herní desky.</p>
    </div>

    <ul class="chips">
      <li v-for="(cat, i) in categories" :key="cat.id" class="chip" :class="{ 'chip--ready': ready(cat.id) }">
        <span class="chip__state" aria-hidden="true">
          <svg v-if="ready(cat.id)" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <template v-else>{{ readyCount(cat.id) }}/{{ total }}</template>
        </span>

        <input
          v-model="cat.name"
          class="chip__name"
          type="text"
          maxlength="30"
          :aria-label="`Název ${i + 1}. kategorie`"
          placeholder="Název kategorie"
          :size="Math.max(8, Math.min(24, cat.name.length || 8))"
        />

        <span class="chip__tools">
          <button type="button" :disabled="i === 0" :aria-label="`Posunout ${cat.name} doleva`" @click="emit('move', i, -1)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button type="button" :disabled="i === categories.length - 1" :aria-label="`Posunout ${cat.name} doprava`" @click="emit('move', i, 1)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <button type="button" class="chip__x" :aria-label="`Smazat kategorii ${cat.name}`" @click="emit('remove', cat.id)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </span>
      </li>

      <li>
        <UiButton size="sm" variant="ghost" :disabled="categories.length >= max" @click="emit('add')">
          Přidat kategorii
        </UiButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bar { display: grid; gap: var(--sp-3); }
.bar__head { display: flex; align-items: baseline; gap: var(--sp-3); flex-wrap: wrap; }
.bar__title { font-size: var(--fs-md); font-family: var(--font-ui); font-weight: 600; }
.bar__note { font-size: var(--fs-xs); color: var(--c-text-faint); }

.chips { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-2) var(--sp-1) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: var(--c-surface);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.chip:hover, .chip:focus-within { border-color: var(--c-surface-3); }
.chip--ready { border-color: color-mix(in oklab, var(--c-ok) 34%, var(--c-line)); }

.chip__state {
  display: inline-grid;
  place-items: center;
  min-width: 2.25rem;
  height: 1.5rem;
  padding-inline: var(--sp-1);
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  color: var(--c-text-faint);
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.chip--ready .chip__state {
  background: color-mix(in oklab, var(--c-ok) 22%, transparent);
  color: var(--c-ok);
  min-width: 1.5rem;
}

.chip__name {
  min-width: 5rem;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 700;
  padding: var(--sp-1) 0;
}
.chip__name:focus { outline: none; color: var(--c-gold); }
.chip__name::placeholder { color: var(--c-text-faint); font-weight: 500; }

.chip__tools { display: inline-flex; gap: 1px; opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
.chip:hover .chip__tools,
.chip:focus-within .chip__tools { opacity: 1; }

.chip__tools button {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-faint);
}
.chip__tools button:hover:not(:disabled) { background: var(--c-surface-2); color: var(--c-text); }
.chip__tools button:disabled { opacity: 0.25; cursor: not-allowed; }
.chip__x:hover:not(:disabled) { color: var(--c-bad) !important; }

@media (hover: none) {
  .chip__tools { opacity: 1; }
}

/* Dotykové ovládání: na telefonu je každá kategorie vlastní řádek přes
   celou šířku a ovládací prvky mají velikost, do které jde trefit prstem. */
/* Na telefonu je každá kategorie vlastní řádek přes celou šířku a ovládání
   se odsune pod název. Ve vodorovné řadě by tlačítka sebrala tolik místa,
   že by se do zbytku vešla jen půlka názvu. */
@media (max-width: 720px) {
  .chips { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sp-2); }
  .chip {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--sp-1) var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--r-lg);
  }
  .chip__name { width: 100%; font-size: var(--fs-md); }
  .chip__tools {
    grid-column: 1 / -1;
    justify-content: flex-end;
    border-top: 1px solid var(--c-line-soft);
    padding-top: var(--sp-1);
  }
}

@media (pointer: coarse) {
  .chip { min-height: 3rem; }
  .chip__state { min-width: 2.5rem; height: 1.9rem; font-size: var(--fs-xs); }
  .chip__name { padding-block: var(--sp-2); }
  .chip__tools button { width: 2.75rem; height: 2.75rem; }
  .chip__tools svg { width: 16px; height: 16px; }
}
</style>
