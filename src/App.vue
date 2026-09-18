<script setup lang="ts">
import { onMounted } from 'vue'
import UiToasts from '@/components/ui/UiToasts.vue'
import UiConfirm from '@/components/ui/UiConfirm.vue'
import { initPacks } from '@/stores/packs'
import { setDbErrorHandler } from '@/lib/db'
import { primeAudio } from '@/lib/sound'
import { toast } from '@/stores/ui'

setDbErrorHandler((message) => toast(message, 'bad', 6000))

onMounted(async () => {
  try {
    await initPacks()
  } catch (e) {
    toast('Nepodařilo se načíst balíčky otázek.', 'bad')
    console.error(e)
  }
  // Prohlížeč pustí zvuk až po první interakci uživatele.
  const prime = () => {
    primeAudio()
    window.removeEventListener('pointerdown', prime)
    window.removeEventListener('keydown', prime)
  }
  window.addEventListener('pointerdown', prime, { once: true })
  window.addEventListener('keydown', prime, { once: true })
})
</script>

<template>
  <!-- Před obsahem stojí na každé obrazovce šest fokusovatelných prvků
       hlavičky. Kdo jede od klávesnice, jimi jinak prochází pokaždé znovu.
       Odkaz je vidět, až na něj skočí zaměření. -->
  <a class="skip" href="#obsah">Přeskočit na obsah</a>

  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <UiToasts />
  <UiConfirm />
</template>

<style scoped>
.skip {
  position: fixed;
  top: var(--sp-3);
  left: var(--sp-3);
  z-index: var(--z-toast);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--c-brand);
  color: var(--c-on-accent);
  font-weight: 700;
  text-decoration: none;
  transform: translateY(-200%);
}
.skip:focus-visible { transform: none; }

.page-enter-active,
.page-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
