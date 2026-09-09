<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' | 'lg'; dismissible?: boolean }>(),
  { size: 'md', dismissible: true },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' && props.dismissible) {
    e.stopPropagation()
    emit('close')
  }
  if (e.key === 'Tab' && panel.value) {
    const focusable = panel.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) {
      requestAnimationFrame(() => {
        panel.value?.querySelector<HTMLElement>('input, textarea, button')?.focus()
      })
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal" role="dialog" aria-modal="true" :aria-label="title">
        <div class="modal__scrim" @click="dismissible && emit('close')" />
        <div ref="panel" class="modal__panel" :class="`modal__panel--${size}`">
          <header class="modal__head">
            <h2 class="modal__title">{{ title }}</h2>
            <button v-if="dismissible" class="modal__x" type="button" aria-label="Zavřít" @click="emit('close')">
              &#215;
            </button>
          </header>
          <div class="modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="modal__foot"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-5);
}
.modal__scrim { position: absolute; inset: 0; background: var(--c-scrim); backdrop-filter: blur(6px); }
.modal__panel {
  position: relative;
  width: min(100%, 34rem);
  max-height: min(86dvh, 52rem);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.modal__panel--sm { width: min(100%, 26rem); }
.modal__panel--lg { width: min(100%, 52rem); }

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-5) var(--sp-4);
  border-bottom: 1px solid var(--c-line-soft);
}
.modal__title { font-size: var(--fs-xl); }
.modal__x {
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  font-size: 1.75rem;
  line-height: 1;
  padding: 0 var(--sp-2);
  border-radius: var(--r-sm);
}
.modal__x:hover { color: var(--c-text); }

@media (pointer: coarse) {
  .modal__x { width: 2.75rem; height: 2.75rem; }
}

.modal__body { padding: var(--sp-5); overflow-y: auto; }
.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid var(--c-line-soft);
  background: color-mix(in oklab, var(--c-abyss) 45%, transparent);
}

.modal-enter-active, .modal-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.modal-enter-active .modal__panel { transition: transform var(--dur-base) var(--ease-back); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal__panel { transform: translateY(12px) scale(0.97); }
</style>
