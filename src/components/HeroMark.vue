<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Nápis Mučírna.
 *
 * Vtip nese samotné rozložení: „M" stojí zvlášť, v nakloněné dlaždici,
 * a vedle ní se čte slovo **učírna**. Mučírna, ze které se po odebrání
 * jednoho písmene stane místo, kde se člověk něco naučí. Nemusí se to
 * nikomu vysvětlovat, stačí se podívat.
 *
 * Dlaždice je vlastní značka aplikace a obě hry na dlaždicích stojí,
 * takže „M" nesedí v rámečku odnikud, ale v herním poli.
 *
 * Není to obrázek, ale živý text: na projektoru i na retině je ostrý
 * v každé velikosti, váží jednotky kilobajtů místo půl megabajtu a dá
 * se rozpohybovat po částech.
 *
 * Šířka slova se **měří**, neodhaduje. Kde končí, ví jen prohlížeč, a ví
 * to až tehdy, když dorazí Lato; do té doby by se výřez počítal
 * z náhradního písma a nápis by po výměně uskočil.
 */

/** Velikost písma v souřadnicích SVG. Všechno ostatní je z ní odvozené. */
const FS = 100
/** Výška verzálek Lata v násobku velikosti písma. */
const CAP = 0.72
/** Dlaždice je vyšší než verzálka, aby v ní „M" nesedělo na těsno. */
const TILE = FS * CAP * 1.5
/** Naklonění dlaždice. Tolik, aby to bylo znát, a ne tolik, aby to
 *  vypadalo jako chyba sazby. */
const TILT = 7
/** Mezera mezi dlaždicí a slovem. Počítá se od nejzazšího rohu nakloněné
 *  dlaždice, takže opticky je o kus větší, než kolik tu stojí. */
const GAP = FS * 0.02
/** Místo nad dlaždicí pro jiskry. */
const SPARKS = FS * 0.3

const textEl = ref<SVGTextElement | null>(null)

/** Střed dlaždice. Účaří slova je na y = FS a dlaždice stojí na výšce
 *  verzálky, takže její střed leží v polovině té výšky. */
const tileCx = TILE / 2
const tileCy = FS - (FS * CAP) / 2
const tileY = tileCy - TILE / 2

/** Nakloněná dlaždice zabírá víc než svou stranu, protože se otáčí kolem
 *  středu. O tolik musí povolit výřez i odsazení slova. */
const rad = (TILT * Math.PI) / 180
const reach = (TILE / 2) * (Math.cos(rad) + Math.sin(rad))

const wordX = tileCx + reach + GAP
const viewBox = ref(`0 0 ${FS * 5} ${FS * 1.4}`)
const measured = ref(false)

function measure(): void {
  const text = textEl.value
  if (!text) return

  let width: number
  try {
    width = text.getComputedTextLength()
  } catch {
    return
  }
  if (width === 0) return

  const pad = FS * 0.08
  const left = tileCx - reach - pad
  const right = wordX + width + pad
  const top = Math.min(tileCy - reach - SPARKS, FS - FS * 0.82)
  const bottom = Math.max(FS + FS * 0.12, tileCy + reach + pad)
  viewBox.value = `${left} ${top} ${right - left} ${bottom - top}`
  measured.value = true
}

onMounted(() => {
  measure()
  // Písmo dorazí až po prvním vykreslení a změní šířku slova.
  document.fonts?.ready.then(measure).catch(() => {})
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
</script>

<template>
  <svg
    class="mark"
    :class="{ 'mark--ready': measured }"
    :viewBox="viewBox"
    role="img"
    aria-label="Mučírna"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <!-- Slovo má spád shora dolů, nahoře skoro bílé, dole modré. -->
      <linearGradient id="mark-word" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--c-value)" />
        <stop offset="100%" stop-color="var(--c-brand)" />
      </linearGradient>
      <linearGradient id="mark-tile" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="var(--c-light)" />
        <stop offset="100%" stop-color="var(--c-brand-deep)" />
      </linearGradient>
    </defs>

    <!-- Jiskry nad dlaždicí. Tři tahy, stejně jako na původním nápisu. -->
    <g class="mark__sparks" :stroke-width="FS * 0.05">
      <line
        :x1="tileCx - TILE * 0.36"
        :y1="tileY - TILE * 0.08"
        :x2="tileCx - TILE * 0.46"
        :y2="tileY - TILE * 0.28"
      />
      <line
        :x1="tileCx - TILE * 0.02"
        :y1="tileY - TILE * 0.13"
        :x2="tileCx - TILE * 0.02"
        :y2="tileY - TILE * 0.36"
      />
      <line
        :x1="tileCx + TILE * 0.32"
        :y1="tileY - TILE * 0.1"
        :x2="tileCx + TILE * 0.44"
        :y2="tileY - TILE * 0.29"
      />
    </g>

    <!-- Dlaždice s „M". Hrana a lesk jsou tytéž jako na dlaždicích desky,
         jinak by z toho byl jen barevný rámeček. -->
    <g class="mark__tile" :transform="`rotate(${-TILT} ${tileCx} ${tileCy})`">
      <rect
        class="mark__tile-edge"
        :x="0"
        :y="tileY + TILE * 0.05"
        :width="TILE"
        :height="TILE"
        :rx="TILE * 0.2"
      />
      <rect
        class="mark__tile-face"
        :x="0"
        :y="tileY"
        :width="TILE"
        :height="TILE"
        :rx="TILE * 0.2"
      />
      <rect
        class="mark__tile-sheen"
        :x="TILE * 0.09"
        :y="tileY + TILE * 0.05"
        :width="TILE * 0.82"
        :height="TILE * 0.035"
        :rx="TILE * 0.02"
      />
      <text
        class="mark__letter"
        :x="tileCx"
        :y="tileCy"
        :font-size="TILE * 0.66"
        text-anchor="middle"
        dominant-baseline="central"
      >
        M
      </text>
    </g>

    <text ref="textEl" class="mark__word" :x="wordX" :y="FS" :font-size="FS">učírna</text>
  </svg>
</template>

<style scoped>
.mark {
  display: block;
  width: 100%;
  height: auto;
  /* Dokud se nezměří, je nápis neviditelný: jinak by problikl v náhradním
     písmu a se špatně posazeným slovem. */
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-out);
}
.mark--ready { opacity: 1; }

.mark__word,
.mark__letter {
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: -0.03em;
}
.mark__word { fill: url(#mark-word); }
.mark__letter { fill: var(--c-value); letter-spacing: 0; }

.mark__tile-face { fill: url(#mark-tile); }
.mark__tile-edge { fill: var(--c-tile-edge); }
.mark__tile-sheen { fill: var(--c-tile-sheen); }
.mark__sparks { stroke: var(--c-light); stroke-linecap: round; }

/* Dlaždice dosedne na místo. Otáčí se kolem svého středu, takže se
   nikam neposune, jen se srovná, a jiskry vyletí až po ní. */
.mark__tile {
  transform-box: fill-box;
  transform-origin: center;
  animation: tile-settle var(--dur-slow) var(--ease-out) backwards;
}
.mark__sparks {
  animation: sparks-in var(--dur-base) var(--ease-out) var(--dur-slow) backwards;
}

@keyframes tile-settle {
  from { transform: rotate(7deg) scale(0.9); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@keyframes sparks-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .mark { transition: none; }
  .mark__tile,
  .mark__sparks { animation: none; }
}
</style>
