<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

defineProps<{ open: boolean; steal: boolean }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (!e) return
  if (e.key === 'Escape' || e.key === '?') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Teleport to="body">
    <Transition name="keys">
      <div v-if="open" class="keys" role="dialog" aria-modal="true" aria-label="Klávesové zkratky">
        <div class="keys__scrim" @click="emit('close')" />
        <div class="keys__panel">
          <header class="keys__head">
            <h2 class="keys__title">Klávesy</h2>
            <button type="button" class="keys__x" aria-label="Zavřít" @click="emit('close')">&#215;</button>
          </header>
          <dl class="keys__list">
            <div><dt>Mezerník</dt><dd>odhalí odpověď, podruhé potvrdí správnou odpověď týmu na tahu</dd></div>
            <div><dt>N nebo 0</dt><dd>neuhodl nikdo</dd></div>
            <div><dt>1–6</dt><dd>{{ steal ? 'přizná body danému týmu' : 'body jen týmu na tahu (přebírání je vypnuté)' }}</dd></div>
            <div><dt>Esc</dt><dd>zavře políčko bez bodování</dd></div>
            <div><dt>Klik na tým</dt><dd>dočasně přesune tah; pořadí jde vrátit tlačítkem</dd></div>
            <div><dt>?</dt><dd>tato nápověda</dd></div>
          </dl>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.keys {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-5);
}
.keys__scrim { position: absolute; inset: 0; background: var(--c-scrim); backdrop-filter: blur(6px); }
.keys__panel {
  position: relative;
  width: min(100%, 26rem);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.keys__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--c-line-soft);
}
.keys__title { font-size: var(--fs-xl); }
.keys__x {
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  font-size: 1.75rem;
  line-height: 1;
  padding: 0 var(--sp-2);
}
.keys__x:hover { color: var(--c-text); }
.keys__list {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-5);
  margin: 0;
}
.keys__list > div {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: var(--sp-3);
  align-items: baseline;
}
.keys__list dt {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-sm);
  color: var(--c-brand);
}
.keys__list dd { margin: 0; font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }

.keys-enter-active, .keys-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.keys-enter-from, .keys-leave-to { opacity: 0; }

@media (pointer: coarse) {
  .keys__x { width: 2.75rem; height: 2.75rem; }
}
</style>
