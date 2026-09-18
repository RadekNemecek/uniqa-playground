<script setup lang="ts">
/**
 * Přepínač zapnuto/vypnuto.
 *
 * Dřív žil jako `.switch` uvnitř přípravy hry, takže si ho nastavení
 * aplikace nemohlo půjčit a mělo místo něj tlačítko, které měnilo popisek.
 * Tlačítko ale neřekne odečítači, že je něco zapnuté, jen že se dá
 * zmáčknout.
 */
defineProps<{ label: string; hint?: string }>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="switch">
    <input v-model="model" type="checkbox" role="switch" />
    <span class="switch__box" aria-hidden="true"></span>
    <span class="switch__copy">
      <strong>{{ label }}</strong>
      <em v-if="hint">{{ hint }}</em>
    </span>
  </label>
</template>

<style scoped>
.switch { display: flex; gap: var(--sp-3); align-items: flex-start; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 0; height: 0; }

.switch__box {
  flex: none;
  margin-top: var(--sp-1);
  width: 2.6rem;
  height: 1.5rem;
  border-radius: var(--r-full);
  background: var(--c-bg-raised);
  border: var(--border-w) solid var(--c-border);
  position: relative;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.switch__box::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: var(--r-full);
  background: var(--c-text-muted);
  transition:
    transform var(--dur-fast) var(--ease-back),
    background-color var(--dur-fast) var(--ease-out);
}
.switch input:checked + .switch__box { background: var(--c-brand); border-color: var(--c-brand); }
.switch input:checked + .switch__box::after {
  transform: translateX(1.1rem);
  background: var(--c-on-accent);
}
.switch input:focus-visible + .switch__box {
  outline: var(--focus-ring-w) solid var(--focus-ring-c);
  outline-offset: var(--focus-ring-offset);
}

.switch__copy { display: grid; gap: 2px; }
.switch__copy strong { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text); }
.switch__copy em {
  font-style: normal;
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  line-height: 1.4;
}

@media (pointer: coarse) {
  .switch { min-height: var(--control-touch); align-items: center; }
}
</style>
