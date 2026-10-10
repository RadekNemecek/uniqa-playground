<script setup lang="ts">
import { ref, watch } from 'vue'
import BrandTile from '@/components/BrandTile.vue'
import { duration, prefersReducedMotion } from '@/lib/motion'

/**
 * Dlaždice s M jako postavička.
 *
 * Žije tam, kde se čeká a nic důležitého se nečte: na telefonu hráče
 * v čekárně, po odhalení, na konci a když hra neběží, na plátně
 * v čekárně kvízu a při vyhlášení. Do správy otázek, přípravy ani
 * Výslechu nepatří, ve správě se pracuje a u hodnocení lektorů by vtip
 * byl nevhodný. Nepatří ani k desce Pojišťuj!: týmy tam nesou dlaždice
 * s písmenem a M vedle nich se čte jako další tým.
 *
 * Při objevení spadne shora a dopadne. Pak zareaguje podle nálady:
 * po trefě vyskočí a otočí se, po chybě sklouzne přes hranu toho,
 * na čem stojí, a zůstane svěšená, bez odpovědi nechápavě nakloní hlavu,
 * při čekání jen stojí. Nezůstane ale mrtvá: jednou za cyklus si
 * poskočí, povzdechne, nebo se rozhlédne. Stojící obrazovka na telefonu
 * vypadá jako zamrzlá.
 *
 * Změna nálady přehraje jen reakci, ne pád. Na vyhlášení tak dlaždice
 * nejdřív čeká a ve chvíli, kdy padne vítěz, vyskočí. `bump` je
 * šťouchnutí zvenčí: každá změna čísla znamená jedno poskočení,
 * v čekárně třeba s každým novým hráčem.
 *
 * Kresba je tatáž `BrandTile` jako v hlavičce a favicona. Obličej
 * nemá: povahu nese pohyb, stejně jako u nápisu na rozcestníku.
 * Rozměry uvnitř jsou v `em` velikosti dlaždice, velikost se řídí
 * `font-size` na kořeni.
 */

/** Jak hráč dopadl, nebo že se zatím čeká. */
export type MascotMood = 'ok' | 'bad' | 'none' | 'wait'

const props = defineProps<{ mood: MascotMood; bump?: number }>()

/**
 * Čeká reakce na dopad? Jen ta první. Přepíná se ve stejném vykreslení
 * jako nálada, takže nová reakce rovnou začne bez zpoždění.
 *
 * Dřív se zpoždění vynulovalo na konci pádu, uprostřed běžící reakce.
 * Ta tím rázem „běžela" celou dobu pádu, skočila do koncové pózy a
 * dlaždice po dopadu cukla na jiné místo.
 */
const fresh = ref(true)
const hop = ref<HTMLElement | null>(null)

watch(
  () => props.mood,
  () => {
    fresh.value = false
  },
)

watch(
  () => props.bump,
  (next, prev) => {
    if (!hop.value || prefersReducedMotion() || next === undefined || prev === undefined) return
    if (next <= prev) return
    hop.value.animate(
      [
        { transform: 'none' },
        { transform: 'translateY(0.05em) scale(1.1, 0.88)', offset: 0.15 },
        { transform: 'translateY(-0.55em) scale(0.95, 1.06)', offset: 0.45 },
        { transform: 'translateY(0) scale(1.08, 0.92)', offset: 0.75 },
        { transform: 'none' },
      ],
      { duration: duration('--dur-hop', 760), easing: 'ease-in-out' },
    )
  },
)
</script>

<template>
  <span
    class="mascot"
    :class="[`mascot--${mood}`, { 'mascot--landed': !fresh }]"
    aria-hidden="true"
  >
    <span ref="hop" class="mascot__hop">
      <BrandTile class="mascot__tile" />
    </span>
  </span>
</template>

<style scoped>
/* Tři patra, každé s jedním pohybem: kořen padá, prostřední poskakuje na
   `bump`, kresba reaguje na náladu. Reakce jede přes `transform` jednou,
   nečinnost přes samostatné `translate`, `rotate` a `scale` dokola. Skládají
   se, takže se nepřou, stejně jako v `HeroMark.vue`. */
.mascot {
  --mascot-delay: var(--dur-drop);

  display: block;
  width: 1em;
  height: 1em;
  pointer-events: none;
  transform-origin: 50% 85%;
  animation: mascot-drop var(--dur-drop) both;
}
.mascot--landed { --mascot-delay: 0ms; }

.mascot__hop,
.mascot__tile {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 50% 85%;
}

/* Výchozí `transform` je cílová póza: bez pohybu stojí dlaždice rovnou
   v ní a nálada se přečte i tak. */
.mascot--ok .mascot__tile {
  animation:
    mascot-ok var(--dur-mascot) var(--mascot-delay) both,
    mascot-ok-idle var(--dur-mascot-idle) var(--ease-both) calc(var(--mascot-delay) + var(--dur-mascot)) infinite;
}
.mascot--bad .mascot__tile {
  transform: translate(0.5em, 0.42em) rotate(58deg);
  animation:
    mascot-bad var(--dur-mascot) var(--mascot-delay) both,
    mascot-bad-idle var(--dur-mascot-idle) var(--ease-both) calc(var(--mascot-delay) + var(--dur-mascot)) infinite;
}
.mascot--none .mascot__tile {
  transform: rotate(-12deg);
  animation:
    mascot-none var(--dur-mascot) var(--mascot-delay) both,
    mascot-none-idle var(--dur-mascot-idle) var(--ease-both) calc(var(--mascot-delay) + var(--dur-mascot)) infinite;
}
.mascot--wait .mascot__tile {
  animation: mascot-wait-idle var(--dur-mascot-idle) var(--ease-both) var(--mascot-delay) infinite;
}

/* Pád zrychluje, náraz dlaždici smáčkne a ta jednou odpruží. */
@keyframes mascot-drop {
  0% { transform: translateY(-3em) rotate(-35deg); animation-timing-function: var(--ease-in); }
  62% { transform: translateY(0) rotate(0deg) scale(1.18, 0.8); animation-timing-function: var(--ease-out); }
  80% { transform: translateY(-0.12em) scale(0.96, 1.04); animation-timing-function: var(--ease-in); }
  100% { transform: none; }
}

/* Radost: výskok s otočkou a dvojí doskok. */
@keyframes mascot-ok {
  0% { transform: none; animation-timing-function: var(--ease-out); }
  10% { transform: translateY(0.05em) scale(1.12, 0.86); animation-timing-function: var(--ease-out); }
  37% { transform: translateY(-1.1em) rotate(200deg) scale(0.94, 1.08); animation-timing-function: var(--ease-in); }
  57% { transform: translateY(0) rotate(360deg) scale(1.14, 0.84); animation-timing-function: var(--ease-out); }
  73% { transform: translateY(-0.3em) rotate(360deg) scale(0.97, 1.04); animation-timing-function: var(--ease-in); }
  87% { transform: translateY(0) rotate(360deg) scale(1.05, 0.95); animation-timing-function: var(--ease-out); }
  100% { transform: rotate(360deg); }
}

/* Zklamání: zakolísá, ujede k hraně a přepadne přes ni. */
@keyframes mascot-bad {
  0% { transform: none; animation-timing-function: var(--ease-both); }
  17% { transform: translate(-0.04em, 0) rotate(-7deg); animation-timing-function: var(--ease-both); }
  37% { transform: translate(0.1em, 0) rotate(8deg); animation-timing-function: var(--ease-in); }
  67% { transform: translate(0.54em, 0.48em) rotate(66deg); animation-timing-function: var(--ease-out); }
  83% { transform: translate(0.48em, 0.4em) rotate(54deg); animation-timing-function: var(--ease-both); }
  100% { transform: translate(0.5em, 0.42em) rotate(58deg); }
}

/* Nechápavost: chvíli stojí, pak nakloní hlavu a v náklonu zůstane. */
@keyframes mascot-none {
  0%, 33% { transform: none; animation-timing-function: var(--ease-back); }
  67% { transform: rotate(-15deg); animation-timing-function: var(--ease-both); }
  100% { transform: rotate(-12deg); }
}

/* Nečinnost. Většinu cyklu stojí, pohne se jen na konci. */
@keyframes mascot-ok-idle {
  0%, 78% { translate: 0 0; scale: 1; }
  82% { translate: 0 0; scale: 1.08 0.9; }
  86% { translate: 0 -0.4em; scale: 0.96 1.05; }
  90% { translate: 0 0; scale: 1.08 0.92; }
  93% { translate: 0 -0.14em; scale: 1; }
  96%, 100% { translate: 0 0; scale: 1; }
}

@keyframes mascot-bad-idle {
  0%, 74% { scale: 1; }
  82% { scale: 1.03 1.07; }
  90% { scale: 1.05 0.9; }
  96%, 100% { scale: 1; }
}

@keyframes mascot-none-idle {
  0%, 68% { rotate: 0deg; }
  73%, 80% { rotate: 22deg; }
  85%, 91% { rotate: -6deg; }
  96%, 100% { rotate: 0deg; }
}

/* Čekání: rozhlédne se na obě strany a netrpělivě přešlápne. */
@keyframes mascot-wait-idle {
  0%, 60% { rotate: 0deg; translate: 0 0; }
  64%, 70% { rotate: -10deg; }
  76%, 82% { rotate: 10deg; }
  87% { rotate: 0deg; translate: 0 0; }
  90% { translate: 0 -0.22em; }
  93% { translate: 0 0; }
  95% { translate: 0 -0.1em; }
  97%, 100% { translate: 0 0; rotate: 0deg; }
}

/* Nekonečné cykly by tokeny trvání nevypnuly. */
@media (prefers-reduced-motion: reduce) {
  .mascot,
  .mascot--ok .mascot__tile,
  .mascot--bad .mascot__tile,
  .mascot--none .mascot__tile,
  .mascot--wait .mascot__tile { animation: none; }
}
</style>
