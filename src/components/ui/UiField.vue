<script setup lang="ts">
defineProps<{ label: string; hint?: string; id?: string }>()
</script>

<template>
  <label class="field" :for="id">
    <span class="field__label">{{ label }}</span>
    <slot />
    <span v-if="hint" class="field__hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.field { display: grid; gap: var(--sp-2); }
.field__label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-muted);
  letter-spacing: 0.01em;
}
.field__hint { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.4; }

.field :deep(input),
.field :deep(textarea),
.field :deep(select) {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text);
  font-size: var(--fs-md);
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.field :deep(textarea) { resize: vertical; min-height: 5.5rem; line-height: var(--lh-body); }
.field :deep(input:hover),
.field :deep(textarea:hover) { border-color: var(--c-surface-3); }
.field :deep(input:focus),
.field :deep(textarea:focus),
.field :deep(select:focus) { border-color: var(--c-brand); background: var(--c-sunken-focus); }
.field :deep(::placeholder) { color: var(--c-text-faint); }
</style>
