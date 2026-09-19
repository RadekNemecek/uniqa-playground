<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'

defineProps<{ label: string }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function focusTrigger() {
  root.value?.querySelector<HTMLButtonElement>('.iconbtn')?.focus()
}

function onFocusOut(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) close()
}

function onDoc(e: MouseEvent) {
  if (!open.value || !root.value) return
  if (!root.value.contains(e.target as Node)) close()
}

function onKey(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
    focusTrigger()
    return
  }
  if (!root.value?.contains(document.activeElement)) return
  const items = Array.from(root.value.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'))
  if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
  e.preventDefault()
  const at = items.indexOf(document.activeElement as HTMLElement)
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
    : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
  items[next]?.focus()
}

watch(open, async (v) => {
  if (!v) return
  await nextTick()
  root.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
})

onMounted(() => {
  document.addEventListener('mousedown', onDoc)
  window.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDoc)
  window.removeEventListener('keydown', onKey, true)
})

defineExpose({ close })
</script>

<template>
  <div ref="root" class="menu" @focusout="onFocusOut">
    <UiIconButton
      icon="dots"
      :label="label"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
      @keydown.down.prevent="open = true"
    />

    <div v-if="open" class="menu__panel" role="menu" :aria-label="label">
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.menu { position: relative; display: inline-flex; }

.menu__panel {
  position: absolute;
  top: calc(100% + var(--sp-1));
  right: 0;
  z-index: var(--z-header);
  min-width: var(--menu-width);
  padding: var(--sp-1);
  border: var(--border-w) solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  display: grid;
}

.menu__panel :deep(button[role='menuitem']),
.menu__panel :deep(a[role='menuitem']) {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.menu__panel :deep(button[role='menuitem']:hover),
.menu__panel :deep(a[role='menuitem']:hover) {
  background: var(--c-surface-2);
}
.menu__panel :deep(button[role='menuitem'].danger) {
  color: var(--c-bad);
}
.menu__panel :deep(hr) {
  border: 0;
  border-top: var(--border-w) solid var(--c-line-soft);
  margin: var(--sp-1) 0;
}

@media (pointer: coarse) {
  .menu__panel :deep(button[role='menuitem']),
  .menu__panel :deep(a[role='menuitem']) {
    min-height: var(--control-touch);
  }
}
</style>
