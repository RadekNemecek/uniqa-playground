<script setup lang="ts">
/**
 * Zástupná plocha, dokud nedorazí data.
 *
 * Je to protijed na konkrétní chybu: prázdný stav se ukazoval jako fakt.
 * Na pomalé firemní síti řekla správa „Zatím tu není žádný balíček"
 * a nabídla založení ukázky dřív, než dorazily skutečné balíčky.
 * Rozdíl mezi „nic tu není" a „ještě nevím" musí být na obrazovce vidět.
 */
withDefaults(defineProps<{ lines?: number; height?: string }>(), { lines: 3, height: '' })
</script>

<template>
  <div class="skel" role="status" aria-live="polite">
    <span class="vh">Načítám…</span>
    <span
      v-for="n in lines"
      :key="n"
      class="skel__line"
      :style="height ? { height } : undefined"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.skel { display: grid; gap: var(--sp-3); }
.skel__line {
  height: var(--sp-6);
  border-radius: var(--r-md);
  background: linear-gradient(
    90deg,
    var(--c-bg-card) 0%,
    var(--c-bg-raised) 50%,
    var(--c-bg-card) 100%
  );
  background-size: 200% 100%;
  animation: skel-sweep var(--dur-ambient) linear infinite;
}
/* Poslední řádek je kratší, aby ta plocha vypadala jako text a ne jako
   tabulka. */
.skel__line:last-child { width: 60%; }

@keyframes skel-sweep {
  to { background-position: -200% 0; }
}

/* Bez pohybu zůstane plocha klidná. Že se načítá, říká `role="status"`. */
@media (prefers-reduced-motion: reduce) {
  .skel__line { animation: none; }
}
</style>
