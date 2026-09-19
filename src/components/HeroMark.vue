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
 * Aby se to ale podívat dalo, musí se to odehrát v čase: slovo dorazí
 * první a chvíli stojí samo, takže se přečte „učírna", a teprve pak do
 * něj shora dosedne dlaždice s „M". Kdyby naskočilo všechno naráz, je
 * to jen logo. Časování drží `--mark-land` a odvozené prodlevy.
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

/**
 * Nápis se ukáže a rozjede teprve s hotovým písmem.
 *
 * Měřit se musí i dřív, jinak by první vykreslení mělo nesmyslný výřez,
 * ale rozehrát se sekvence smí až tehdy, když se slovo nikam neposune.
 * Záměna Lata za náhradní písmo uprostřed dosedání dlaždice by z toho
 * udělala poskakující nepořádek.
 */
const ready = ref(false)

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
}

onMounted(() => {
  measure()
  // Písmo dorazí až po prvním vykreslení a změní šířku slova. Teprve po
  // něm má smysl nápis odkrýt.
  const start = (): void => {
    measure()
    ready.value = true
  }
  if (document.fonts) document.fonts.ready.then(start).catch(start)
  else start()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))
</script>

<template>
  <svg
    class="mark"
    :class="{ 'mark--ready': ready }"
    :viewBox="viewBox"
    role="img"
    aria-label="Mučírna"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <!-- Přeliv mezi dvěma sousedními odstíny modré. Není to lesk, je
           to rozhýbaná barva: žádný pruh světla, žádná hrana. -->
      <linearGradient id="mark-word" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--mark-word-top)" />
        <stop offset="100%" stop-color="var(--mark-word-bottom)" />
      </linearGradient>
      <linearGradient id="mark-tile" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="var(--mark-tile-top)" />
        <stop offset="100%" stop-color="var(--mark-tile-bottom)" />
      </linearGradient>
    </defs>

    <!-- Jiskry nad dlaždicí. Tři tahy, stejně jako na původním nápisu.
         Vyletí až na dopad dlaždice, každý o chlup později než předchozí. -->
    <g class="mark__sparks" :stroke-width="FS * 0.05">
      <line
        class="mark__spark"
        style="--i: 0"
        :x1="tileCx - TILE * 0.36"
        :y1="tileY - TILE * 0.08"
        :x2="tileCx - TILE * 0.46"
        :y2="tileY - TILE * 0.28"
      />
      <line
        class="mark__spark"
        style="--i: 1"
        :x1="tileCx - TILE * 0.02"
        :y1="tileY - TILE * 0.13"
        :x2="tileCx - TILE * 0.02"
        :y2="tileY - TILE * 0.36"
      />
      <line
        class="mark__spark"
        style="--i: 2"
        :x1="tileCx + TILE * 0.32"
        :y1="tileY - TILE * 0.1"
        :x2="tileCx + TILE * 0.44"
        :y2="tileY - TILE * 0.29"
      />
    </g>

    <!-- Dosednutí je na obalu, ne na dlaždici samotné: naklonění drží
         atribut `transform` a kdyby ho přebila animace, dlaždice by si
         na konci sekvence o těch sedm stupňů poskočila. Dvě skupiny se
         skládají a nepřetahují. -->
    <g class="mark__drop">
      <!-- Dlaždice s „M". Je to plocha, ne panel: bez hrany, lesku
           a přejíždějícího odlesku. Ve velikosti, jakou má nápis na
           rozcestníku, z těch tří věcí byla ikona aplikace, ne značka. -->
      <g class="mark__tile" :transform="`rotate(${-TILT} ${tileCx} ${tileCy})`">
        <rect
          class="mark__tile-face"
          :x="0"
          :y="tileY"
          :width="TILE"
          :height="TILE"
          :rx="TILE * 0.2"
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
    </g>

    <text id="mark-word-text" ref="textEl" class="mark__word" :x="wordX" :y="FS" :font-size="FS">
      učírna
    </text>

  </svg>
</template>

<style scoped>
.mark {
  /* Kdy dlaždice vyrazí dolů. Slovo do té doby stojí samo a stihne se
     přečíst. Všechny ostatní prodlevy se počítají odtud, aby se sekvence
     dala posunout jedním číslem. */
  --mark-land: calc(var(--dur-stage) * 0.8);

  display: block;
  width: 100%;
  height: auto;
  /* Dokud se nezměří, je nápis neviditelný: jinak by problikl v náhradním
     písmu a se špatně posazeným slovem. */
  opacity: 0;
}
.mark--ready { opacity: 1; }

.mark__word,
.mark__letter {
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: -0.03em;
}
.mark__word { fill: url(#mark-word); }
.mark__letter { fill: var(--mark-letter); letter-spacing: 0; }
.mark__tile-face { fill: url(#mark-tile); }
.mark__sparks { stroke: var(--mark-spark); stroke-linecap: round; }
/* Sekvence se rozjede s odkrytím, ne s připojením do stránky. Kdyby
   běžela pod nulovou průhledností, odehrála by se dřív, než je vidět. */
.mark--ready .mark__word {
  transform-box: fill-box;
  transform-origin: left center;
  animation: word-in var(--dur-stage) var(--ease-out) backwards;
}
.mark--ready .mark__drop {
  transform-box: fill-box;
  transform-origin: center;
  animation: tile-drop var(--dur-slow) var(--ease-back) var(--mark-land) backwards;
}
.mark--ready .mark__spark {
  transform-box: fill-box;
  /* Tah roste od svého dolního konce ven, takže z dlaždice vyletí, ne
     se na místě objeví. */
  transform-origin: bottom center;
  animation: spark-out var(--dur-base) var(--ease-back)
    calc(var(--mark-land) + var(--dur-slow) * 0.7 + var(--dur-instant) * var(--i)) backwards;
}
.mark--ready .mark__spark {
  animation:
    spark-out var(--dur-base) var(--ease-back)
      calc(var(--mark-land) + var(--dur-slow) * 0.7 + var(--dur-instant) * var(--i)) backwards,
    spark-twinkle var(--dur-orbit) var(--ease-out)
      calc(var(--dur-stage) * 2 + var(--dur-count) * var(--i)) infinite;
}

@keyframes word-in {
  from { opacity: 0; transform: translateX(4%) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes tile-drop {
  from { opacity: 0; transform: translateY(-52%) rotate(-13deg) scale(0.9); }
  30% { opacity: 1; }
  to { opacity: 1; transform: none; }
}
@keyframes spark-out {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: none; }
}
/* Přejezd zabere první desetinu cyklu, zbytek je klid. Je to ozdoba
   na rozcestníku, ne blikátko. */
/* Jiskra chvíli dřímá a pak krátce vyšlehne. V klidu je o kousek kratší
   a tlumenější, jinak by nebylo co zesílit. */
@keyframes spark-twinkle {
  0%, 84%, 100% { opacity: 0.78; transform: scaleY(0.92); }
  91% { opacity: 1; transform: scaleY(1.12); }
}

@media (prefers-reduced-motion: reduce) {
  .mark--ready .mark__word,
  .mark--ready .mark__drop,
  .mark--ready .mark__spark { animation: none; }
}
</style>
