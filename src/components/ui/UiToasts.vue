<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { ui, dismissToast } from '@/stores/ui'

/**
 * Oznámení jdou dvěma kanály.
 *
 * Chyba patří do `assertive`: odečítač ji přečte hned, protože po ní se
 * něco musí udělat. Zbytek je `polite` a počká, až uživatelka domluví.
 * Dřív šlo obojí zdvořilým kanálem, takže se chyba mohla ztratit.
 */
const problems = computed(() => ui.toasts.filter((t) => t.tone === 'bad'))
const notices = computed(() => ui.toasts.filter((t) => t.tone !== 'bad'))
</script>

<template>
  <Teleport to="body">
    <div class="toasts">
      <div class="toasts__lane" role="alert" aria-live="assertive">
        <TransitionGroup name="toast">
          <button
            v-for="t in problems"
            :key="t.id"
            type="button"
            class="toast toast--bad"
            @click="dismissToast(t.id)"
          >
            <UiIcon name="warning" size="sm" />
            <span class="toast__text">{{ t.text }}</span>
            <!-- Chyba nezmizí sama, takže musí být vidět, čím se zavře. -->
            <span class="toast__x"><UiIcon name="close" size="xs" label="Zavřít oznámení" /></span>
          </button>
        </TransitionGroup>
      </div>

      <div class="toasts__lane" role="status" aria-live="polite">
        <TransitionGroup name="toast">
          <button
            v-for="t in notices"
            :key="t.id"
            type="button"
            class="toast"
            :class="`toast--${t.tone}`"
            :aria-label="`${t.text}. Zavřít oznámení.`"
            @click="dismissToast(t.id)"
          >
            <UiIcon v-if="t.tone === 'ok'" name="check" size="sm" />
            <span class="toast__text">{{ t.text }}</span>
          </button>
        </TransitionGroup>
      </div>
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
.toasts__lane { display: grid; gap: var(--sp-2); justify-items: center; }

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  max-width: min(92vw, 34rem);
  padding: var(--sp-3) var(--sp-5);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-bg-raised);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-weight: 500;
  text-align: left;
  box-shadow: var(--shadow-md);
  transition: var(--tr-surface);
}
.toast:hover { background: var(--c-bg-active); }

.toast--ok { border-color: color-mix(in oklab, var(--c-ok) 50%, transparent); color: var(--c-ok); }
.toast--ok .toast__text { color: var(--c-text); }
.toast--bad { border-color: color-mix(in oklab, var(--c-bad) 55%, transparent); color: var(--c-bad); }
.toast--bad .toast__text { color: var(--c-text); font-weight: 600; }

.toast__text { flex: 1 1 auto; line-height: 1.4; }
.toast__x { flex: none; opacity: 0.7; }
.toast:hover .toast__x { opacity: 1; }

.toast-enter-active, .toast-leave-active { transition: var(--tr-enter); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px) scale(0.96); }
</style>
