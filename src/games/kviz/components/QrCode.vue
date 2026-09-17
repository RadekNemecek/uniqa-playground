<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ url: string; label?: string }>()

/** Cesty tmavých modulů. Kreslí se jako jedna cesta, ne tisíc obdélníků. */
const path = ref('')
const size = ref(0)

/**
 * Knihovna se načítá až tady, aby neztěžovala balík, který si do telefonu
 * stahuje hráč. Ten QR kód nikdy nevidí, čte ho z plátna.
 */
async function render(url: string): Promise<void> {
  if (!url) return
  const { default: qrcode } = await import('qrcode-generator')
  const qr = qrcode(0, 'M')
  qr.addData(url)
  qr.make()

  const count = qr.getModuleCount()
  const parts: string[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) parts.push(`M${col} ${row}h1v1h-1z`)
    }
  }
  size.value = count
  path.value = parts.join('')
}

watch(() => props.url, render, { immediate: true })
</script>

<template>
  <div class="qr">
    <svg
      v-if="path"
      :viewBox="`-2 -2 ${size + 4} ${size + 4}`"
      role="img"
      :aria-label="label ?? 'QR kód pro připojení do hry'"
    >
      <!-- Tichá zóna je součástí viewBoxu, bez ní část čteček kód nenajde. -->
      <rect :x="-2" :y="-2" :width="size + 4" :height="size + 4" fill="var(--c-text)" />
      <path :d="path" fill="var(--c-abyss)" shape-rendering="crispEdges" />
    </svg>
    <div v-else class="qr__wait" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
/* Kód se snímá z plátna, takže potřebuje světlou plochu a ostré hrany.
   Odstíny jsou z tokenů, kontrast mezi nimi je přes 15:1. */
.qr {
  display: grid;
  place-items: center;
  padding: var(--sp-2);
  border-radius: var(--r-lg);
  background: var(--c-text);
  box-shadow: var(--shadow-lg);
}
.qr svg { display: block; width: 100%; height: auto; }
.qr__wait { width: 100%; aspect-ratio: 1; background: var(--c-text); }
</style>
