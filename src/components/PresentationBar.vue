<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import AppSettings from '@/components/AppSettings.vue'

/**
 * Moderátorský pás nad běžící hrou.
 *
 * Během hry na plátně nemá co dělat rozhraní aplikace. Značka, záložky
 * a nastavení patří do přípravy, nad hrou zůstane jen tenhle pás: vlevo
 * název hry, uprostřed co udělá další stisk, vpravo jediné tlačítko
 * s nabídkou.
 *
 * Pás je vidět pořád. Dřív se po chvíli bez myši schovával, jenže se
 * při každém pohybu vracel a víc rušil, než šetřil místo. Plátno zčistí
 * to, že nástroje nesvítí v řadě vedle sebe, ale leží pod jedním
 * tlačítkem: nahoře to, co patří ke hře, pod tím zobrazení a úplně dole,
 * oddělené, ukončení hry.
 */
withDefaults(
  defineProps<{
    /** Název hry. Drobně, vlevo: sál ví, co hraje, tohle je pro moderátorku. */
    title: string
    /** Co udělá další stisk. Hlavní obsah pásu. */
    hint?: string
    /** Popisek ukončení. Bez něj se položka nezobrazí, třeba na vyhlášení. */
    endLabel?: string
  }>(),
  { hint: '', endLabel: '' },
)

const emit = defineEmits<{ end: [] }>()

const settingsOpen = ref(false)
const isFullscreen = ref(false)

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* prohlížeč to nemusí povolit */
  }
}

/* Stav se čte z prohlížeče. Z celé obrazovky se odchází i Escapem a F11,
   o čemž by se vlastní přepínač nedozvěděl. */
function syncFullscreen(): void {
  isFullscreen.value = document.fullscreenElement !== null
}

onMounted(() => {
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))
</script>

<template>
  <header class="bar">
    <p class="bar__title">{{ title }}</p>

    <!-- Co udělá další stisk. Dřív to nesl nejmenší a nejsvětlejší text na
         plátně, takže se z druhé řady místnosti nedal přečíst. -->
    <p class="bar__hint">{{ hint }}</p>

    <div class="bar__tools">
      <UiMenu label="Nabídka hry">
        <template #default="{ close }">
          <slot name="menu" :close="close" />
          <hr v-if="$slots.menu" />
          <button type="button" role="menuitem" @click="close(); toggleFullscreen()">
            <UiIcon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" size="sm" />
            {{ isFullscreen ? 'Opustit celou obrazovku' : 'Celá obrazovka' }}
          </button>
          <button type="button" role="menuitem" @click="close(); settingsOpen = true">
            <UiIcon name="settings" size="sm" />
            Písmo a zvuk
          </button>
          <template v-if="endLabel">
            <hr />
            <button type="button" role="menuitem" class="danger" @click="close(); emit('end')">
              <UiIcon name="close" size="sm" />
              {{ endLabel }}
            </button>
          </template>
        </template>
      </UiMenu>
    </div>
  </header>

  <AppSettings :open="settingsOpen" @close="settingsOpen = false" />
</template>

<style scoped>
.bar {
  position: relative;
  z-index: var(--z-header);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-4);
  width: min(100% - var(--sp-6), var(--page-max));
  margin-inline: auto;
  padding: var(--sp-3) 0;
}

.bar__title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
  color: var(--c-text);
}

.bar__hint {
  justify-self: center;
  min-height: 1em;
  padding: var(--sp-1) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--fs-md);
  font-weight: 700;
  text-align: center;
  text-wrap: balance;
}

.bar__hint:empty { border-color: transparent; background: transparent; }

.bar__tools { display: flex; justify-self: end; align-items: center; gap: var(--sp-2); }
/* Položky nabídky se nelámou, nabídka se rozšíří podle nejdelší. */
.bar__tools :deep(.menu__panel) { min-width: max-content; }

@media (max-width: 720px) {
  .bar { grid-template-columns: minmax(0, 1fr) auto; padding-inline: var(--sp-3); }
  .bar__hint { grid-row: 2; grid-column: 1 / -1; font-size: var(--fs-sm); }
}
</style>
