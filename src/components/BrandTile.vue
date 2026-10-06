<script setup lang="ts">
/**
 * Značka Mučírny v malém: dlaždice s „M".
 *
 * Je to tatáž dlaždice, jakou nese nápis v `HeroMark.vue` a favicona
 * z `scripts/make-icons.mjs`, jen bez jisker a bez nástupu. Ty patří
 * k nápisu na plátně; v hlavičce by jen ukrajovaly výšku.
 *
 * Kreslí se, nenačítá. Dřív to byl obrázek, takže hlavička ukazovala
 * starou dlaždici s „Č" i potom, co nápis přešel na „M", a na retině
 * změkla. Takhle je ostrá v každé velikosti a barvy si bere z tokenů.
 */

/** Plátno a dlaždice na něm. Táž čísla jako v generátoru ikon, aby byla
 *  hlavička a favicona jedna kresba. */
const CANVAS = 120
const CENTER = CANVAS / 2
const TILE = 90
/** Naklonění ve stupních. */
const TILT = 7
/** Výška verzálky v Latu 900 a díl dlaždice, který má „M" zabrat. Stejný
 *  poměr jako v ikoně: v malém rozhoduje, jak silné je písmeno. */
const CAP = 0.7285
const LETTER = 0.55

const x = CENTER - TILE / 2
const y = CENTER - TILE / 2
const radius = TILE * 0.2
const drop = TILE * 0.09
/** Inkoustová hrana. Stejná tloušťka jako obrys tlačítek v hlavičce. */
const stroke = TILE * 0.07
const fontSize = (TILE * LETTER) / CAP
/** Účaří se posadí tak, aby verzálka stála na středu dlaždice. Počítá se,
 *  protože `dominant-baseline` středí na em, ne na výšku písmene. */
const baseline = CENTER + (TILE * LETTER) / 2
</script>

<template>
  <svg class="tile" :viewBox="`0 0 ${CANVAS} ${CANVAS}`" role="img" aria-label="Mučírna">
    <g :transform="`rotate(${-TILT} ${CENTER} ${CENTER})`">
      <rect class="tile__edge" :x="x + drop" :y="y + drop" :width="TILE" :height="TILE" :rx="radius" />
      <rect class="tile__face" :x="x" :y="y" :width="TILE" :height="TILE" :rx="radius" :stroke-width="stroke" />
      <text
        class="tile__letter"
        :x="CENTER"
        :y="baseline"
        :font-size="fontSize"
        text-anchor="middle"
      >
        M
      </text>
    </g>
  </svg>
</template>

<style scoped>
.tile { display: block; }
.tile__face { fill: var(--mark-tile-top); stroke: var(--c-ink); }
.tile__edge { fill: var(--c-ink); }
.tile__letter {
  fill: var(--mark-letter);
  font-family: var(--font-display);
  font-weight: 900;
}
</style>
