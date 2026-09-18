<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { lockScroll, unlockScroll } from '@/lib/scrollLock'

const props = withDefaults(
  defineProps<{ open: boolean; title: string; size?: 'sm' | 'md' | 'lg'; dismissible?: boolean }>(),
  { size: 'md', dismissible: true },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const titleId = useId()

/**
 * Prvky, na které smí skočit tabulátor.
 *
 * Filtr na `disabled` a na skryté je podstatný: bez něj mohl být prvním
 * prvkem zakázaný knoflík, Shift+Tab na začátku seznamu skočil na něco,
 * co zaměření nepřijme, a past se rozpadla. Tabulátor pak odešel na
 * stránku za ztmavením.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusables(): HTMLElement[] {
  if (!panel.value) return []
  return Array.from(panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' && props.dismissible) {
    e.stopPropagation()
    emit('close')
  }
  if (e.key === 'Tab' && panel.value) {
    const focusable = focusables()
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

/** Kam vrátit zaměření, až se okno zavře. */
let restoreTo: HTMLElement | null = null

watch(
  () => props.open,
  async (open) => {
    if (open) lockScroll()
    else unlockScroll()

    if (open) {
      restoreTo = document.activeElement as HTMLElement | null
      // nextTick, ne requestAnimationFrame: rámec přišel dřív, než Vue
      // panel vykreslilo, ref byl prázdný a zaměření zůstalo venku na
      // tlačítku, které okno otevřelo. Past na Tab se pak vůbec nechytla,
      // protože se spouští jen zevnitř panelu, a tabulátor procházel
      // stránku za ztmavením.
      await nextTick()
      // Pole napřed, zavírací křížek až jako náhrada. Kdo okno otevře,
      // chce psát, ne ho hned zavřít.
      const first =
        panel.value?.querySelector<HTMLElement>('input, textarea, select') ?? panel.value
      first?.focus()
      return
    }

    // Bez tohohle skončí zaměření na <body> a kdo jede od klávesnice,
    // začíná procházet stránku znovu od začátku.
    restoreTo?.focus?.()
    restoreTo = null
  },
)

onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey, true)
  if (props.open) unlockScroll()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="modal__scrim" @click="dismissible && emit('close')" />
        <div ref="panel" class="modal__panel" :class="`modal__panel--${size}`" tabindex="-1">
          <header class="modal__head">
            <h2 :id="titleId" class="modal__title">{{ title }}</h2>
            <UiIconButton
              v-if="dismissible"
              icon="close"
              label="Zavřít"
              variant="plain"
              @click="emit('close')"
            />
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
  /* Panel je jen náhradní místo pro zaměření, když uvnitř není žádné pole.
     Prstenec kolem celého okna by nic neřekl, hranici kreslí samo okno.
     U prvků, do kterých se dá dostat tabulátorem, se prstenec neruší. */
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
  border-bottom: var(--border-w) solid var(--c-border-soft);
}
.modal__title { font-size: var(--fs-xl); }
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
.modal__panel:focus { outline: none; }

.modal-enter-active .modal__panel { transition: transform var(--dur-base) var(--ease-back); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal__panel { transform: translateY(12px) scale(0.97); }
</style>
