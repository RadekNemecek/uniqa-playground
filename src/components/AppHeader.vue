<script setup lang="ts">
import { ref } from 'vue'
import AppSettings from '@/components/AppSettings.vue'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

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
    /* prohlížeč to nemusí povolit, není to chyba hry */
  }
}
</script>

<template>
  <header class="head" :class="{ 'head--compact': compact }">
    <RouterLink to="/" class="brand" aria-label="Playground, domů">
      <span class="brand__mark" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </span>
      <span class="brand__name">Playground</span>
    </RouterLink>

    <nav class="nav" aria-label="Hlavní">
      <RouterLink to="/riskuj" class="nav__link">Hrát</RouterLink>
      <RouterLink to="/admin" class="nav__link">Otázky</RouterLink>
    </nav>

    <div class="tools">
      <button type="button" class="tool" title="Celá obrazovka" aria-label="Celá obrazovka" @click="toggleFullscreen">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path v-if="!isFullscreen" d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          <path v-else d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4" />
        </svg>
      </button>
      <button type="button" class="tool" title="Nastavení" aria-label="Nastavení" @click="settingsOpen = true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      </button>
      <slot name="tools" />
    </div>
  </header>

  <AppSettings :open="settingsOpen" @close="settingsOpen = false" />
</template>

<style scoped>
.head {
  position: relative;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  width: min(100% - var(--sp-6), var(--page-max));
  margin-inline: auto;
}
.head--compact { padding-block: var(--sp-3); }

.brand { display: inline-flex; align-items: center; gap: var(--sp-3); text-decoration: none; color: var(--c-text); }
.brand__mark {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  width: 22px;
  height: 22px;
}
.brand__mark span {
  border-radius: 2px;
  background: var(--c-surface-3);
  transition: background-color var(--dur-slow) var(--ease-out);
}
.brand__mark span:nth-child(1) { background: var(--c-gold); }
.brand:hover .brand__mark span:nth-child(4) { background: var(--c-gold); }
.brand__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
}

.nav { display: flex; gap: var(--sp-1); margin-left: auto; }
.nav__link {
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-full);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.nav__link:hover { color: var(--c-text); background: var(--c-surface); }
.nav__link.router-link-active { color: var(--c-text); background: var(--c-surface-2); }

.tools { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.tool {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  transition: all var(--dur-fast) var(--ease-out);
}
.tool:hover { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface); }

@media (max-width: 720px) {
  .head { gap: var(--sp-2) var(--sp-3); }
  .brand__name { display: none; }
  .nav { margin-left: auto; }
  /* Na úzké obrazovce se ovládání radši zalomí, než aby přetékalo. */
  .tools { flex: 1 0 100%; justify-content: flex-end; }
}
</style>
