<script setup lang="ts">
import { nextTick } from 'vue'
import type { Category, Question } from '@/types'
import { formatScore } from '@/lib/teams'
import { useMediaQuery, NARROW } from '@/lib/media'

const props = defineProps<{
  categories: Category[]
  ladder: number[]
  questionOf: (categoryId: string, value: number) => Question | undefined
  isReady: (categoryId: string, value: number) => boolean
  selected: { categoryId: string; value: number } | null
  maxCategories: number
  maxRows: number
  canRemoveCategory: boolean
  canRemoveRow: boolean
}>()

const emit = defineEmits<{
  select: [categoryId: string, value: number]
  moveCategory: [index: number, by: number]
  removeCategory: [categoryId: string]
  addCategory: []
  editRow: [index: number, value: string]
  removeRow: [value: number]
  addRow: []
}>()

const narrow = useMediaQuery(NARROW)

function preview(text: string | undefined, limit: number): string {
  const t = (text ?? '').trim()
  return t.length > limit ? `${t.slice(0, limit)}…` : t
}

function readyIn(categoryId: string): number {
  return props.ladder.filter((v) => props.isReady(categoryId, v)).length
}

async function onValueChange(index: number, event: Event) {
  const el = event.target as HTMLInputElement
  emit('editRow', index, el.value)
  await nextTick()
  el.value = String(props.ladder[index] ?? '')
}
</script>

<template>
  <!-- Seznam pro úzkou obrazovku ---------------------------------------- -->
  <div v-if="narrow" class="list">
    <section v-for="(cat, i) in categories" :key="cat.id" class="cat">
      <header class="cat__head">
        <input
          v-model="cat.name"
          class="cat__name"
          type="text"
          maxlength="30"
          :aria-label="`Název ${i + 1}. kategorie`"
          placeholder="Název kategorie"
        />
        <span class="cat__count" :class="{ 'cat__count--done': readyIn(cat.id) === ladder.length }">
          {{ readyIn(cat.id) }}/{{ ladder.length }}
        </span>
        <div class="cat__tools">
          <button type="button" :disabled="i === 0" :aria-label="`Posunout ${cat.name || 'kategorii'} nahoru`" @click="emit('moveCategory', i, -1)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m18 15-6-6-6 6" /></svg>
          </button>
          <button type="button" :disabled="i === categories.length - 1" :aria-label="`Posunout ${cat.name || 'kategorii'} dolů`" @click="emit('moveCategory', i, 1)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <button type="button" class="cat__x" :disabled="!canRemoveCategory" :aria-label="`Smazat kategorii ${cat.name}`" @click="emit('removeCategory', cat.id)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </header>

      <ul class="rows">
        <li v-for="(value, ri) in ladder" :key="value" class="row-wrap">
          <div class="row-value">
            <input
              class="row-value__input"
              type="number"
              step="50"
              min="10"
              :value="value"
              inputmode="numeric"
              :aria-label="`Hodnota ${ri + 1}. řádku`"
              @change="onValueChange(ri, $event)"
              @wheel.prevent
            />
            <button
              type="button"
              class="row-value__x"
              :disabled="!canRemoveRow"
              :aria-label="`Smazat řádek za ${formatScore(value)} bodů`"
              @click="emit('removeRow', value)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <button
            type="button"
            class="row"
            :class="{
              'row--ready': isReady(cat.id, value),
              'row--on': selected?.categoryId === cat.id && selected?.value === value,
            }"
            :aria-label="`${cat.name}, ${value} bodů, ${isReady(cat.id, value) ? 'vyplněno' : 'chybí otázka'}`"
            @click="emit('select', cat.id, value)"
          >
            <span v-if="isReady(cat.id, value)" class="row__text">
              {{ preview(questionOf(cat.id, value)?.prompt, 64) }}
            </span>
            <span v-else class="row__empty">Doplnit otázku</span>
            <span class="row__mark" aria-hidden="true">
              <svg v-if="isReady(cat.id, value)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <div class="list__adds">
      <button type="button" class="add" :disabled="categories.length >= maxCategories" @click="emit('addCategory')">
        + Přidat kategorii
      </button>
      <button type="button" class="add" :disabled="ladder.length >= maxRows" @click="emit('addRow')">
        + Přidat hodnotu
      </button>
    </div>
  </div>

  <!-- Matice pro širokou obrazovku --------------------------------------- -->
  <div v-else class="wrap">
    <div class="grid" :style="{ '--cols': categories.length }">
      <div class="grid__corner" aria-hidden="true"></div>

      <div v-for="(cat, i) in categories" :key="cat.id" class="grid__cat">
        <span class="grid__cat-count" :class="{ 'grid__cat-count--done': readyIn(cat.id) === ladder.length }">
          {{ readyIn(cat.id) }}/{{ ladder.length }}
        </span>
        <input
          v-model="cat.name"
          class="grid__cat-name"
          type="text"
          maxlength="30"
          :aria-label="`Název ${i + 1}. kategorie`"
          placeholder="Název"
        />
        <div class="grid__cat-tools">
          <button type="button" :disabled="i === 0" :aria-label="`Posunout ${cat.name || 'kategorii'} doleva`" @click="emit('moveCategory', i, -1)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button type="button" :disabled="i === categories.length - 1" :aria-label="`Posunout ${cat.name || 'kategorii'} doprava`" @click="emit('moveCategory', i, 1)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <button type="button" class="x" :disabled="!canRemoveCategory" :aria-label="`Smazat kategorii ${cat.name}`" @click="emit('removeCategory', cat.id)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="grid__add-col"
        :disabled="categories.length >= maxCategories"
        aria-label="Přidat kategorii"
        @click="emit('addCategory')"
      >
        +
      </button>

      <template v-for="(value, ri) in ladder" :key="value">
        <div class="grid__value">
          <input
            class="grid__value-input"
            type="number"
            step="50"
            min="10"
            :value="value"
            inputmode="numeric"
            :aria-label="`Hodnota ${ri + 1}. řádku`"
            @change="onValueChange(ri, $event)"
            @wheel.prevent
          />
          <button
            type="button"
            class="grid__value-x"
            :disabled="!canRemoveRow"
            :aria-label="`Smazat řádek za ${formatScore(value)} bodů`"
            @click="emit('removeRow', value)"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <button
          v-for="cat in categories"
          :key="cat.id + ':' + value"
          type="button"
          class="cell"
          :class="{
            'cell--ready': isReady(cat.id, value),
            'cell--on': selected?.categoryId === cat.id && selected?.value === value,
          }"
          :aria-label="`${cat.name}, ${value} bodů, ${isReady(cat.id, value) ? 'vyplněno' : 'chybí otázka'}`"
          @click="emit('select', cat.id, value)"
        >
          <span v-if="isReady(cat.id, value)" class="cell__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>

          <span v-if="preview(questionOf(cat.id, value)?.prompt, 90)" class="cell__text">
            {{ preview(questionOf(cat.id, value)?.prompt, 90) }}
          </span>
          <span v-else class="cell__empty">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Doplnit
          </span>
        </button>

        <div class="grid__spacer" aria-hidden="true"></div>
      </template>

      <button
        type="button"
        class="grid__add-row"
        :disabled="ladder.length >= maxRows"
        aria-label="Přidat hodnotu"
        @click="emit('addRow')"
      >
        + Přidat hodnotu
      </button>
    </div>
  </div>
</template>

<style scoped>
/* --- Seznam ---------------------------------------------------------------- */
.list { display: grid; gap: var(--sp-5); }

.cat { display: grid; gap: var(--sp-2); }
.cat__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name count'
    'tools tools';
  gap: var(--sp-2);
  align-items: center;
  padding: var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
}
.cat__name {
  grid-area: name;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 700;
  padding: var(--sp-1);
}
.cat__name:focus { outline: none; color: var(--c-brand); }
.cat__name::placeholder { color: var(--c-text-faint); font-weight: 500; }
.cat__count {
  grid-area: count;
  flex: none;
  padding: 2px var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cat__count--done { background: color-mix(in oklab, var(--c-ok) 22%, transparent); color: var(--c-ok); }
.cat__tools {
  grid-area: tools;
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-1);
  border-top: 1px solid var(--c-line-soft);
  padding-top: var(--sp-1);
}
.cat__tools button {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-faint);
}
.cat__tools button:hover:not(:disabled) { background: var(--c-surface-2); color: var(--c-text); }
.cat__tools button:disabled { opacity: 0.3; }
.cat__x:hover:not(:disabled) { color: var(--c-bad) !important; }

.rows { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.row-wrap {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: var(--sp-2);
  align-items: stretch;
}
.row-value {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 2px;
  padding: var(--sp-1);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-surface);
}
.row-value__input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--c-brand);
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.row-value__input:focus { outline: none; }
.row-value__x {
  display: grid;
  place-items: center;
  width: 100%;
  height: 1.75rem;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-faint);
}
.row-value__x:hover:not(:disabled) { color: var(--c-bad); background: color-mix(in oklab, var(--c-bad) 10%, transparent); }
.row-value__x:disabled { opacity: 0.25; }

.row {
  width: 100%;
  min-height: 3.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.5rem;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text-faint);
  text-align: left;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.row--ready {
  border-style: solid;
  background: var(--c-surface);
  color: var(--c-text-muted);
}
.row--on {
  border-color: var(--c-brand) !important;
  background: color-mix(in oklab, var(--c-brand) 12%, var(--c-sunken));
  color: var(--c-text);
}
.row__text {
  font-size: var(--fs-sm);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row__empty { font-size: var(--fs-sm); font-style: italic; }
.row__mark { display: grid; place-items: center; }
.row--ready .row__mark { color: var(--c-ok); }

.list__adds { display: grid; gap: var(--sp-2); }
.add {
  min-height: 2.75rem;
  padding: var(--sp-3);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.add:hover:not(:disabled) { border-color: var(--c-brand); color: var(--c-brand); }
.add:disabled { opacity: 0.4; }

/* --- Matice ---------------------------------------------------------------- */
.wrap { overflow-x: auto; padding-bottom: var(--sp-2); }

.grid {
  display: grid;
  grid-template-columns: 5.25rem repeat(var(--cols), minmax(7.5rem, 1fr)) 2.5rem;
  gap: var(--sp-2);
  width: 100%;
}

.grid__cat {
  display: grid;
  gap: var(--sp-1);
  padding: var(--sp-2);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  align-content: start;
}
.grid__cat-count {
  justify-self: end;
  padding: 1px var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-surface);
  color: var(--c-text-faint);
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.grid__cat-count--done { background: color-mix(in oklab, var(--c-ok) 22%, transparent); color: var(--c-ok); }
.grid__cat-name {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
}
.grid__cat-name:focus { outline: none; color: var(--c-brand); }
.grid__cat-name::placeholder { color: var(--c-text-faint); font-weight: 500; }
.grid__cat-tools {
  display: flex;
  justify-content: center;
  gap: 1px;
  opacity: 0.55;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.grid__cat:hover .grid__cat-tools,
.grid__cat:focus-within .grid__cat-tools { opacity: 1; }
.grid__cat-tools button {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-faint);
}
.grid__cat-tools button:hover:not(:disabled) { background: var(--c-surface); color: var(--c-text); }
.grid__cat-tools button:disabled { opacity: 0.25; }
.grid__cat-tools .x:hover:not(:disabled) { color: var(--c-bad) !important; }

.grid__add-col {
  display: grid;
  place-items: center;
  min-height: 4rem;
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-lg);
  font-weight: 700;
}
.grid__add-col:hover:not(:disabled) { border-color: var(--c-brand); color: var(--c-brand); }
.grid__add-col:disabled { opacity: 0.35; }

.grid__value {
  display: grid;
  place-items: center;
  gap: 2px;
  position: relative;
}
.grid__value-input {
  width: 100%;
  max-width: 4.5rem;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-brand);
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
  padding: var(--sp-1);
}
.grid__value-input:hover { border-color: var(--c-line); }
.grid__value-input:focus { outline: none; border-color: var(--c-brand); background: var(--c-sunken-focus); }
.grid__value-x {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-faint);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.grid__value:hover .grid__value-x,
.grid__value:focus-within .grid__value-x { opacity: 1; }
.grid__value-x:hover:not(:disabled) { color: var(--c-bad); background: color-mix(in oklab, var(--c-bad) 12%, transparent); }
.grid__value-x:disabled { opacity: 0.2; }

.grid__spacer { }

.grid__add-row {
  grid-column: 1 / -1;
  justify-self: start;
  padding: var(--sp-2) var(--sp-3);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.grid__add-row:hover:not(:disabled) { border-color: var(--c-brand); color: var(--c-brand); }
.grid__add-row:disabled { opacity: 0.4; }

.cell {
  position: relative;
  min-width: 0;
  display: grid;
  place-items: center;
  min-height: 4.75rem;
  padding: var(--sp-3) var(--sp-3);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  line-height: 1.45;
  text-align: center;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}
.cell:hover { border-color: var(--c-surface-3); color: var(--c-text-muted); background: var(--c-surface); }

.cell--ready {
  border-style: solid;
  border-color: var(--c-line);
  background: var(--c-surface);
  color: var(--c-text-muted);
  text-align: left;
  align-items: start;
  justify-items: start;
}
.cell--ready:hover { border-color: var(--c-surface-3); }

.cell--on {
  border-color: var(--c-brand) !important;
  background: color-mix(in oklab, var(--c-brand) 12%, var(--c-sunken));
  color: var(--c-text);
}

.cell__check {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-ok) 22%, transparent);
  color: var(--c-ok);
}

.cell__text {
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-right: var(--sp-4);
}

.cell__empty { display: inline-flex; align-items: center; gap: var(--sp-1); font-weight: 600; }

@media (hover: none) {
  .grid__cat-tools { opacity: 1; }
  .grid__value-x { opacity: 1; }
}

@media (pointer: coarse) {
  .grid__cat-tools button { width: 2.25rem; height: 2.25rem; }
  .grid__value-x { width: 2rem; height: 2rem; opacity: 1; }
  .grid__add-col { min-height: 2.75rem; }
}
</style>
