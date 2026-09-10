<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import AppSettings from '@/components/AppSettings.vue'
import KeysHelp from './KeysHelp.vue'

defineProps<{
  canUndo: boolean
  steal: boolean
}>()

const emit = defineEmits<{ undo: []; results: []; end: [] }>()

const keysOpen = ref(false)
const settingsOpen = ref(false)
const isFullscreen = ref(false)

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      isFullscreen.value = false
    } else {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    }
  } catch {
    /* prohlížeč to nemusí povolit */
  }
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.key === '?' && !keysOpen.value) {
    e.preventDefault()
    keysOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="play">
    <p class="play__brand">Pojišťuj!</p>

    <div class="play__tools">
      <UiButton size="sm" variant="quiet" :disabled="!canUndo" @click="emit('undo')">Zpět</UiButton>
      <UiButton size="sm" variant="quiet" @click="emit('results')">Výsledky</UiButton>
      <UiButton size="sm" variant="quiet" @click="keysOpen = true">Klávesy</UiButton>
      <button type="button" class="play__icon" title="Celá obrazovka" aria-label="Celá obrazovka" @click="toggleFullscreen">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path v-if="!isFullscreen" d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          <path v-else d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4" />
        </svg>
      </button>
      <button type="button" class="play__icon" title="Nastavení" aria-label="Nastavení" @click="settingsOpen = true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      </button>
      <UiButton size="sm" variant="quiet" @click="emit('end')">Konec</UiButton>
    </div>
  </header>

  <KeysHelp :open="keysOpen" :steal="steal" @close="keysOpen = false" />
  <AppSettings :open="settingsOpen" @close="settingsOpen = false" />
</template>

<style scoped>
.play {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-3) var(--sp-5);
  width: min(100% - var(--sp-6), var(--page-max));
  margin-inline: auto;
}
.play__brand {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
  color: var(--c-text);
}
.play__tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); }
.play__icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
}
.play__icon:hover { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface); }

@media (pointer: coarse) {
  .play__icon { width: 2.75rem; height: 2.75rem; }
}
@media (max-width: 720px) {
  .play { padding-inline: var(--sp-3); }
  .play__brand { font-size: var(--fs-md); }
}
</style>
