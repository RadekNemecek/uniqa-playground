<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSettings from '@/components/AppSettings.vue'
import { GAMES } from '@/games/registry'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    game?: string
    section?: 'play' | 'questions'
  }>(),
  { compact: false, game: '', section: undefined },
)

const currentGame = computed(() => GAMES.find((entry) => entry.slug === props.game) ?? null)
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
    /* Prohlížeč může celou obrazovku odmítnout. */
  }
}
</script>

<template>
  <header class="head" :class="{ 'head--compact': compact }">
    <div class="identity">
      <RouterLink to="/" class="brand" aria-label="Playground, vybrat jinou hru">
        <span class="brand__mark" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </span>
        <span class="brand__name">Playground</span>
      </RouterLink>

      <template v-if="currentGame">
        <span class="identity__slash" aria-hidden="true"></span>
        <RouterLink to="/" class="identity__game" title="Vybrat jinou hru">
          {{ currentGame.title }}
        </RouterLink>
      </template>
    </div>

    <nav v-if="currentGame" class="nav" :aria-label="`Navigace hry ${currentGame.title}`">
      <RouterLink
        :to="currentGame.route"
        class="nav__item"
        :class="{ 'nav__item--active': section === 'play' }"
        :aria-current="section === 'play' ? 'page' : undefined"
      >
        Hrát
      </RouterLink>
      <RouterLink
        :to="currentGame.editRoute"
        class="nav__item"
        :class="{ 'nav__item--active': section === 'questions' }"
        :aria-current="section === 'questions' ? 'page' : undefined"
      >
        Otázky
      </RouterLink>
    </nav>

    <p v-else class="head__context">Vyber si hru</p>

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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-4);
  width: min(100% - var(--sp-6), var(--page-max));
  min-height: var(--header-h);
  margin-inline: auto;
  padding-block: var(--sp-3);
}
.head--compact { min-height: var(--header-h-compact); padding-block: var(--sp-2); }

.identity { display: flex; align-items: center; min-width: 0; gap: var(--sp-3); }
.brand { display: inline-flex; flex: none; align-items: center; gap: var(--sp-3); color: var(--c-text); text-decoration: none; }
.brand__mark {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--mark-gap);
  width: var(--mark-size);
  height: var(--mark-size);
}
.brand__mark span { border-radius: var(--r-xs); background: color-mix(in oklab, var(--c-brand) 30%, var(--c-surface)); }
.brand__mark span:first-child { background: var(--c-brand); }
.brand__name { font-weight: 900; font-size: var(--fs-lg); letter-spacing: -0.02em; }

.identity__slash { width: var(--separator-w); height: var(--sp-6); background: var(--c-line); transform: rotate(18deg); }
.identity__game {
  min-width: 0;
  overflow: hidden;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.identity__game:hover { color: var(--c-text); }

.nav {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-1);
  padding: var(--sp-1);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-sunken) 74%, transparent);
}
.nav__item {
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.nav__item:hover { color: var(--c-text); }
.nav__item--active { background: var(--c-surface-2); color: var(--c-text); box-shadow: var(--shadow-sm); }

.head__context { justify-self: center; color: var(--c-text-faint); font-size: var(--fs-sm); font-weight: 700; }
.tools { display: flex; justify-self: end; align-items: center; gap: var(--sp-2); }
.tool {
  display: grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-surface) 55%, transparent);
  color: var(--c-text-muted);
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.tool:hover { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface); }

@media (max-width: 760px) {
  .head { grid-template-columns: minmax(0, 1fr) auto; }
  .nav { grid-row: 2; grid-column: 1 / -1; width: 100%; }
  .head__context { display: none; }
  .brand__name { display: none; }
}

@media (pointer: coarse) {
  .brand { min-height: var(--control-touch); min-width: var(--control-touch); }
  .tool { width: var(--control-touch); height: var(--control-touch); }
  .nav__item { min-height: var(--control-touch); padding-block: var(--sp-3); }
}
</style>
