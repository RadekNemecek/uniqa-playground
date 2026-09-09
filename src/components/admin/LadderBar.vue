<script setup lang="ts">
import { nextTick } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { formatScore } from '@/lib/teams'

const props = defineProps<{ ladder: number[]; max: number }>()

const emit = defineEmits<{
  edit: [index: number, value: string]
  remove: [value: number]
  add: []
}>()

/** Když rodič změnu nepřijme, políčko musí ukázat skutečnou hodnotu zpátky. */
async function change(index: number, event: Event) {
  const el = event.target as HTMLInputElement
  emit('edit', index, el.value)
  await nextTick()
  el.value = String(props.ladder[index] ?? '')
}
</script>

<template>
  <section class="bar">
    <div class="bar__head">
      <h3 class="bar__title">Bodové hodnoty</h3>
      <p class="bar__note">Každá hodnota je jeden řádek desky, od nejlehčí otázky po nejtěžší.</p>
    </div>

    <ul class="chips">
      <li v-for="(value, i) in ladder" :key="i" class="chip">
        <input
          class="chip__value"
          type="number"
          step="50"
          min="10"
          :value="value"
          inputmode="numeric"
          :aria-label="`Hodnota ${i + 1}. řádku`"
          @change="change(i, $event)"
          @wheel.prevent
        />
        <button
          type="button"
          class="chip__x"
          :disabled="ladder.length <= 2"
          :aria-label="`Smazat řádek za ${formatScore(value)} bodů`"
          @click="emit('remove', value)"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </li>

      <li>
        <UiButton size="sm" variant="ghost" :disabled="ladder.length >= max" @click="emit('add')">
          Přidat hodnotu
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
  gap: var(--sp-1);
  padding: var(--sp-1) var(--sp-1) var(--sp-1) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: var(--c-surface);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.chip:hover, .chip:focus-within { border-color: var(--c-brand); }

.chip__value {
  width: 4.25rem;
  border: 0;
  background: transparent;
  color: var(--c-brand);
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
  padding: var(--sp-1) 0;
  /* Šipky number inputu tu jen překážejí. */
  appearance: textfield;
  -moz-appearance: textfield;
}
.chip__value::-webkit-outer-spin-button,
.chip__value::-webkit-inner-spin-button { appearance: none; margin: 0; }
.chip__value:focus { outline: none; }

.chip__x {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 0;
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-faint);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.chip:hover .chip__x,
.chip:focus-within .chip__x { opacity: 1; }
.chip__x:hover:not(:disabled) { background: var(--c-surface-2); color: var(--c-bad); }
.chip__x:disabled { opacity: 0 !important; cursor: not-allowed; }

@media (hover: none) {
  .chip__x { opacity: 1; }
}

@media (pointer: coarse) {
  .chip { min-height: 3rem; padding-inline: var(--sp-3) var(--sp-2); }
  .chip__value { width: 5rem; font-size: var(--fs-lg); padding-block: var(--sp-2); }
  .chip__x { width: 2.5rem; height: 2.5rem; }
  .chip__x svg { width: 16px; height: 16px; }
}
</style>
