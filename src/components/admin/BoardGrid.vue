<script setup lang="ts">
import type { Category, Question } from '@/types'
import { formatScore } from '@/lib/teams'

defineProps<{
  categories: Category[]
  ladder: number[]
  questionOf: (categoryId: string, value: number) => Question | undefined
  isReady: (categoryId: string, value: number) => boolean
  selected: { categoryId: string; value: number } | null
}>()

defineEmits<{ select: [categoryId: string, value: number] }>()

function preview(text: string | undefined): string {
  const t = (text ?? '').trim()
  return t.length > 90 ? `${t.slice(0, 90)}…` : t
}
</script>

<template>
  <div class="wrap">
    <div class="grid" :style="{ '--cols': categories.length }">
      <div class="grid__corner" aria-hidden="true"></div>

      <div v-for="cat in categories" :key="cat.id" class="grid__cat">
        {{ cat.name || 'Bez názvu' }}
      </div>

      <template v-for="value in ladder" :key="value">
        <div class="grid__value">{{ formatScore(value) }}</div>

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
          @click="$emit('select', cat.id, value)"
        >
          <span v-if="isReady(cat.id, value)" class="cell__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>

          <span v-if="preview(questionOf(cat.id, value)?.prompt)" class="cell__text">
            {{ preview(questionOf(cat.id, value)?.prompt) }}
          </span>
          <span v-else class="cell__empty">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Doplnit
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wrap { overflow-x: auto; padding-bottom: var(--sp-2); }

.grid {
  display: grid;
  /* Bez min-width: max-content. Vnitřní šířka buňky by se jinak počítala
     z nezalomené otázky a mřížka by přerostla obrazovku. */
  grid-template-columns: 4.5rem repeat(var(--cols), minmax(7.5rem, 1fr));
  gap: var(--sp-2);
  width: 100%;
}

.grid__corner { }

.grid__cat {
  display: grid;
  place-items: center;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
  text-align: center;
  text-wrap: balance;
}

.grid__value {
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 800;
  color: var(--c-gold);
  font-variant-numeric: tabular-nums;
}

.cell {
  position: relative;
  min-width: 0;
  display: grid;
  place-items: center;
  min-height: 4.75rem;
  padding: var(--sp-3) var(--sp-3);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
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
  border-color: var(--c-gold) !important;
  background: color-mix(in oklab, var(--c-gold) 12%, var(--c-abyss));
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
</style>
