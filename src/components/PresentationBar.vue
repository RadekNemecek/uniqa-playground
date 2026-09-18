<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import AppSettings from '@/components/AppSettings.vue'

/**
 * Moderátorský pás nad běžící hrou.
 *
 * Dvě věci, které předtím chyběly.
 *
 * Za prvé: během hry na plátně nemá co dělat rozhraní aplikace. Značka,
 * pilulky Hrát/Otázky a ozubené kolo patří do přípravy, ne na projektor
 * před sálem. Tenhle pás je to jediné, co nad hrou zůstane.
 *
 * Za druhé: pás se sám schová. Skrývá se po nečinnosti **myši**, ne
 * klávesnice. Hra se vede mezerníkem, takže by jinak byl pořád vidět;
 * takhle plátno zčistí, jakmile moderátorka pustí myš, a vrátí se ve
 * chvíli, kdy po ní sáhne.
 */
withDefaults(
  defineProps<{
    /** Název hry. Drobně, vlevo: sál ví, co hraje, tohle je pro moderátorku. */
    title: string
    /** Co udělá další stisk. Hlavní obsah pásu. */
    hint?: string
  }>(),
  { hint: '' },
)

const IDLE_MS = 2600

const visible = ref(true)
let timer = 0

function wake(): void {
  visible.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    visible.value = false
  }, IDLE_MS)
}

/** Dotykové zařízení pás neschovává: není čím ho probudit bez kliknutí. */
const coarse =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const settingsOpen = ref(false)

onMounted(() => {
  if (coarse) return
  window.addEventListener('pointermove', wake, { passive: true })
  window.addEventListener('pointerdown', wake, { passive: true })
  wake()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', wake)
  window.removeEventListener('pointerdown', wake)
  window.clearTimeout(timer)
})
</script>

<template>
  <header class="bar" :class="{ 'bar--hidden': !visible && !settingsOpen }">
    <p class="bar__title">{{ title }}</p>

    <!-- Co udělá další stisk. Dřív to nesl nejmenší a nejsvětlejší text na
         plátně, takže se z druhé řady místnosti nedal přečíst. -->
    <p class="bar__hint">{{ hint }}</p>

    <div class="bar__tools">
      <slot name="tools" />
      <UiIconButton icon="settings" label="Nastavení" size="sm" @click="settingsOpen = true" />
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
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}

/* Schovaný pás si drží místo. Kdyby zmizel z toku, obsah pod ním by
   poposkočil, a ten je změřený na jednu obrazovku. */
.bar--hidden {
  opacity: 0;
  transform: translateY(calc(var(--sp-2) * -1));
  pointer-events: none;
}

/* Kdo pás potřebuje od klávesnice, dostane ho zpátky zaměřením. */
.bar:focus-within {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.bar__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-md);
  letter-spacing: -0.02em;
  color: var(--c-text-muted);
}

.bar__hint {
  justify-self: center;
  min-height: 1em;
  color: var(--c-text);
  font-size: var(--fs-md);
  font-weight: 600;
  text-align: center;
  text-wrap: balance;
}

.bar__tools { display: flex; justify-self: end; align-items: center; gap: var(--sp-2); }

@media (max-width: 720px) {
  .bar { grid-template-columns: minmax(0, 1fr) auto; padding-inline: var(--sp-3); }
  .bar__hint { grid-row: 2; grid-column: 1 / -1; font-size: var(--fs-sm); }
}

/* Bez pohybu pás nemizí do ztracena, jen zhasne. */
@media (prefers-reduced-motion: reduce) {
  .bar--hidden { transform: none; }
}
</style>
