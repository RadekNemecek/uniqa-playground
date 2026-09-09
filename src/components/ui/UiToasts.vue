<script setup lang="ts">
import { ui, dismissToast } from '@/stores/ui'
</script>

<template>
  <Teleport to="body">
    <div class="toasts" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <button
          v-for="t in ui.toasts"
          :key="t.id"
          type="button"
          class="toast"
          :class="`toast--${t.tone}`"
          @click="dismissToast(t.id)"
        >
          {{ t.text }}
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: var(--sp-5);
  translate: -50% 0;
  z-index: var(--z-toast);
  display: grid;
  gap: var(--sp-2);
  justify-items: center;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  max-width: min(92vw, 30rem);
  padding: var(--sp-3) var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-weight: 500;
  box-shadow: var(--shadow-md);
}
.toast--ok { border-color: color-mix(in oklab, var(--c-ok) 50%, transparent); }
.toast--bad { border-color: color-mix(in oklab, var(--c-bad) 55%, transparent); }

.toast-enter-active, .toast-leave-active { transition: all var(--dur-base) var(--ease-out); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px) scale(0.96); }
</style>
