<script setup lang="ts" generic="T extends string | number">
/**
 * Volba jedné možnosti z mála.
 *
 * Je to `radiogroup`, ne řada nezávislých tlačítek: odečítač pak ohlásí
 * „30 s, 3 z 5", a ne pětkrát po sobě „stisknuto". Dřív si tenhle prvek
 * tři obrazovky nakreslily zvlášť a každá jinak.
 */
import type { Segment } from '@/components/ui/segmented'
import { computed } from 'vue'

const props = defineProps<{ options: Segment<T>[]; ariaLabel: string }>()

const model = defineModel<T>({ required: true })
const tabStop = computed(() => {
  const selected = props.options.findIndex((opt) => opt.value === model.value && !opt.disabled)
  return selected >= 0 ? selected : props.options.findIndex((opt) => !opt.disabled)
})

function onKey(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const enabled = props.options.map((opt, i) => opt.disabled ? -1 : i).filter((i) => i >= 0)
  if (!enabled.length) return
  const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
  const next = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)!
    : enabled[(enabled.indexOf(index) + step + enabled.length) % enabled.length]!
  model.value = props.options[next]!.value
  const root = (event.currentTarget as HTMLElement).parentElement
  root?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
}
</script>

<template>
  <div class="seg" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="(opt, i) in options"
      :key="String(opt.value)"
      type="button"
      role="radio"
      class="seg__item"
      :class="{ 'seg__item--on': model === opt.value }"
      :aria-checked="model === opt.value"
      :disabled="opt.disabled"
      :tabindex="i === tabStop ? 0 : -1"
      @click="model = opt.value"
      @keydown="onKey($event, i)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
}
.seg__item {
  flex: 1 1 auto;
  min-width: var(--control-xs);
  padding: var(--sp-2) var(--sp-3);
  /* Popisek se nikdy nezlomí. „15 s" rozseknuté na dva řádky vypadá jako
     chyba sazby a rozhodí výšku celého přepínače. */
  white-space: nowrap;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  transition: var(--tr-surface);
}
.seg__item:hover:not(:disabled):not(.seg__item--on) {
  background: var(--c-bg-raised);
  color: var(--c-text);
}
.seg__item--on { background: var(--c-brand); color: var(--c-on-accent); }
.seg__item:disabled { opacity: 0.3; cursor: not-allowed; }

@media (pointer: coarse) {
  .seg__item { min-height: var(--control-touch); }
}
</style>
