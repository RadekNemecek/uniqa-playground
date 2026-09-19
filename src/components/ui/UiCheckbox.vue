<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="check">
    <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
    <span class="check__copy"><slot /></span>
  </label>
</template>

<style scoped>
.check { display: flex; align-items: center; gap: var(--sp-3); cursor: pointer; min-height: var(--control-touch); }
.check input { flex: none; width: var(--control-check); height: var(--control-check); margin: 0; accent-color: var(--c-brand); }
.check__copy { flex: 1; min-width: 0; }
</style>
