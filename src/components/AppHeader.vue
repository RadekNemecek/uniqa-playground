<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSettings from '@/components/AppSettings.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { GAMES } from '@/games/registry'
import { degraded } from '@/stores/ui'
import BrandTile from '@/components/BrandTile.vue'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    game?: string
    section?: 'play' | 'questions' | 'reports'
  }>(),
  { compact: false, game: '', section: undefined },
)

const currentGame = computed(() => GAMES.find((entry) => entry.slug === props.game) ?? null)
const settingsOpen = ref(false)
const isFullscreen = ref(false)

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* Prohlížeč může celou obrazovku odmítnout. */
  }
}

/**
 * Stav čteme z prohlížeče, ne z vlastního přepínače.
 *
 * Z celé obrazovky se dá odejít Escapem nebo F11, o čemž se tlačítko
 * nikdy nedozví. Ikona pak ukazovala „opustit" i po návratu a další klik
 * celou obrazovku zapnul místo vypnul.
 */
function syncFullscreen() {
  isFullscreen.value = document.fullscreenElement !== null
}

onMounted(() => {
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))
</script>

<template>
  <header class="head" :class="{ 'head--compact': compact }">
    <div class="identity">
      <RouterLink to="/" class="brand" aria-label="Mučírna, vybrat jinou hru">
        <BrandTile class="brand__mark" aria-hidden="true" />
        <span class="brand__name">Mučírna</span>
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
      <!-- Výsledky mají vlastní záložku jen tam, kde vůbec vznikají. -->
      <RouterLink
        v-if="currentGame.reportsRoute"
        :to="currentGame.reportsRoute"
        class="nav__item"
        :class="{ 'nav__item--active': section === 'reports' }"
        :aria-current="section === 'reports' ? 'page' : undefined"
      >
        Výsledky
      </RouterLink>
    </nav>

    <div class="tools">
      <!-- Degradovaný režim musí zůstat vidět. Oznámení, které zmizí,
           nestačí: chybí balíčky kolegů a telefony se nemají kam
           připojit, a přijde se na to až před místností. -->
      <span v-if="degraded.local" class="local" title="Sdílená databáze není dostupná. Otázky se berou jen z tohoto počítače.">
        <UiIcon name="warning" size="sm" />
        Jen tento počítač
      </span>
      <UiIconButton
        :icon="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"
        :label="isFullscreen ? 'Opustit celou obrazovku' : 'Celá obrazovka'"
        :pressed="isFullscreen"
        @click="toggleFullscreen"
      />
      <UiIconButton icon="settings" label="Nastavení" @click="settingsOpen = true" />
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
  flex: none;
  width: var(--mark-size);
  height: var(--mark-size);
}
.brand__name { font-weight: 900; font-size: var(--fs-lg); letter-spacing: -0.02em; }

.identity__slash { width: var(--separator-w); height: var(--sp-6); background: var(--c-border); transform: rotate(18deg); }
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

/* Sloupce se dopočítají podle počtu záložek: kvíz má navíc Výsledky,
   Pojišťuj! zůstává u dvou. */
.nav {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: var(--sp-1);
  padding: var(--sp-1);
  border: var(--border-w) solid var(--c-border-soft);
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

.tools { display: flex; justify-self: end; align-items: center; gap: var(--sp-2); }
.local {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  border: var(--border-w) solid color-mix(in oklab, var(--c-bad) 45%, transparent);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-bad) 12%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-xs);
  font-weight: 700;
  white-space: nowrap;
}
@media (max-width: 720px) {
  .local { display: none; }
}

@media (max-width: 720px) {
  .head { grid-template-columns: minmax(0, 1fr) auto; }
  .nav { grid-row: 2; grid-column: 1 / -1; width: 100%; }
  .brand__name { display: none; }
}

@media (pointer: coarse) {
  .brand { min-height: var(--control-touch); min-width: var(--control-touch); }
  .nav__item { min-height: var(--control-touch); padding-block: var(--sp-3); }
}
</style>
