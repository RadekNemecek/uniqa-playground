<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    id?: string
    /** Text chyby. Když je vyplněný, pole se obarví a hint ustoupí. */
    error?: string
    required?: boolean
    labelHidden?: boolean
  }>(),
  { hint: '', id: '', error: '', required: false },
)

const fallbackId = useId()
const describedBy = computed(() => (props.error ? `${props.id || fallbackId}-err` : undefined))
</script>

<template>
  <label class="field" :class="{ 'field--invalid': !!error }" :for="id || undefined">
    <span class="field__label" :class="{ vh: labelHidden }">
      {{ label }}
      <!-- Hvězdička sama o sobě nic neříká tomu, kdo ji nevidí, proto
           k ní patří i text pro odečítač. -->
      <span v-if="required" class="field__req" aria-hidden="true">*</span>
      <span v-if="required" class="vh">povinné</span>
    </span>

    <slot :invalid="!!error" :described-by="describedBy" />

    <!-- Chyba nahrazuje nápovědu. Obojí naráz znamená, že uživatelka čte
         dvě věty, aby zjistila jednu věc. -->
    <span v-if="error" :id="describedBy" class="field__error" role="alert">{{ error }}</span>
    <span v-else-if="hint" class="field__hint">{{ hint }}</span>
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
.field__req { color: var(--c-brand); }
.field__hint { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.4; }
.field__error {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-bad);
  line-height: 1.4;
}

.field :deep(input),
.field :deep(textarea),
.field :deep(select) {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
  font-size: var(--fs-md);
  transition: var(--tr-surface);
}
.field :deep(textarea) { resize: vertical; min-height: var(--field-textarea-min); line-height: var(--lh-body); }
.field :deep(input:hover),
.field :deep(textarea:hover) { border-color: var(--c-bg-active); }

/* :focus-visible, ne :focus. Kliknutím myší do pole už uživatelka ví, kde
   je; prstenec navíc patří tomu, kdo přišel od klávesnice. */
.field :deep(input:focus-visible),
.field :deep(textarea:focus-visible),
.field :deep(select:focus-visible) { border-color: var(--c-brand); background: var(--c-bg-field-focus); }
.field :deep(::placeholder) { color: var(--c-text-faint); }

.field--invalid :deep(input),
.field--invalid :deep(textarea),
.field--invalid :deep(select) {
  border-color: var(--c-bad);
  background: color-mix(in oklab, var(--c-bad) 8%, var(--c-bg-field));
}
</style>
