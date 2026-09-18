<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import PresentationBar from '@/components/PresentationBar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import KeysHelp from './KeysHelp.vue'

defineProps<{
  canUndo: boolean
  steal: boolean
  /** Co udělá další stisk. Nese ho pás nad hrou. */
  hint?: string
}>()

const emit = defineEmits<{ undo: []; results: []; end: [] }>()

const keysOpen = ref(false)
const isFullscreen = ref(false)

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* prohlížeč to nemusí povolit */
  }
}

/* Stav čteme z prohlížeče. Z celé obrazovky se odchází i Escapem a F11,
   o čemž se tlačítko samo nedozví: ikona pak ukazovala „opustit" i po
   návratu a další klik celou obrazovku zapnul místo vypnul. */
function syncFullscreen() {
  isFullscreen.value = document.fullscreenElement !== null
}

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
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', syncFullscreen)
})
</script>

<template>
  <PresentationBar title="Pojišťuj!" :hint="hint">
    <template #tools>
      <UiButton size="sm" variant="quiet" icon="undo" :disabled="!canUndo" @click="emit('undo')">
        Zpět
      </UiButton>
      <UiButton size="sm" variant="quiet" @click="emit('results')">Výsledky</UiButton>
      <UiButton size="sm" variant="quiet" @click="keysOpen = true">Klávesy</UiButton>
      <UiIconButton
        :icon="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"
        :label="isFullscreen ? 'Opustit celou obrazovku' : 'Celá obrazovka'"
        :pressed="isFullscreen"
        size="sm"
        @click="toggleFullscreen"
      />
      <UiButton size="sm" variant="quiet" @click="emit('end')">Konec</UiButton>
    </template>
  </PresentationBar>

  <KeysHelp :open="keysOpen" :steal="steal" @close="keysOpen = false" />
</template>
