<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'

defineProps<{ label: string }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDoc(e: MouseEvent) {
  if (!open.value || !root.value) return
  if (!root.value.contains(e.target as Node)) close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    close()
  }
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
  <div ref="root" class="menu">
    <button
      type="button"
      class="menu__btn"
      :aria-expanded="open"
      :aria-label="label"
      @click="toggle"
    >
      <slot name="trigger">
        <UiIcon name="dots" size="md" />
      </slot>
    </button>

    <div v-if="open" class="menu__panel" role="menu" :aria-label="label">
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.menu { position: relative; display: inline-flex; }

.menu__btn {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.menu__btn:hover {
  color: var(--c-text);
  border-color: var(--c-surface-3);
  background: var(--c-surface-2);
}

.menu__panel {
  position: absolute;
  top: calc(100% + var(--sp-1));
  right: 0;
  z-index: var(--z-header);
  min-width: 12rem;
  padding: var(--sp-1);
  border: 1px solid var(--c-line);
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
  font-weight: 600;
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
  border-top: 1px solid var(--c-line-soft);
  margin: var(--sp-1) 0;
}

@media (pointer: coarse) {
  .menu__btn { width: 2.75rem; height: 2.75rem; }
  .menu__panel :deep(button[role='menuitem']),
  .menu__panel :deep(a[role='menuitem']) {
    min-height: 2.75rem;
  }
}
</style>
