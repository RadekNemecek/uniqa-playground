<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import PresentationBar from '@/components/PresentationBar.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import KeysHelp from './KeysHelp.vue'

defineProps<{
  canUndo: boolean
  steal: boolean
  /** Co udělá další stisk. Nese ho pás nad hrou. */
  hint?: string
}>()

const emit = defineEmits<{ undo: []; results: []; end: [] }>()

const keysOpen = ref(false)

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.key === '?' && !keysOpen.value) {
    e.preventDefault()
    keysOpen.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <PresentationBar title="Pojišťuj!" :hint="hint" end-label="Ukončit hru" @end="emit('end')">
    <template #menu="{ close }">
      <button type="button" role="menuitem" :disabled="!canUndo" @click="close(); emit('undo')">
        <UiIcon name="undo" size="sm" />
        Vrátit poslední bodování
      </button>
      <button type="button" role="menuitem" @click="close(); emit('results')">
        <UiIcon name="chevron-right" size="sm" />
        Výsledky
      </button>
      <button type="button" role="menuitem" @click="close(); keysOpen = true">
        <UiIcon name="info" size="sm" />
        Klávesové zkratky
      </button>
    </template>
  </PresentationBar>

  <KeysHelp :open="keysOpen" :steal="steal" @close="keysOpen = false" />
</template>
