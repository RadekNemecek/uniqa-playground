<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Nápis Mučírna.
 *
 * Vtip nese samotné rozložení: „M" stojí zvlášť, v nakloněné dlaždici,
 * a vedle ní se čte slovo **učírna**. Mučírna, ze které se po odebrání
 * jednoho písmene stane místo, kde se člověk něco naučí.
 *
 * Aby se to přečetlo, musí se to odehrát v čase: nejdřív vyskočí písmena
 * „učírna" a chvíli stojí sama, pak shora spadne dlaždice s „M", dopadne,
 * smáčkne se a slovo se nárazem otřese. Kdyby naskočilo všechno naráz,
 * je to jen logo. Časování drží tokeny `--delay-mark-*`.
 *
 * Nápis pak nezůstane mrtvý. Jednou za čas do něj „M" strčí a písmena
 * se zhoupnou jako domino, jindy M vyskočí a za ním poskočí písmena,
 * a do třetice se M jednou otočí. Cyklus je dlouhý, aby se to dělo
 * občas: kdo se dívá, něco zahlédne, kdo čte jinde, nic ho neruší.
 *
 * Všechny rozměry uvnitř jsou v `em`, takže nápis roste jako celek
 * s `--fs-home-mark` a nic se v něm nemusí přepočítávat.
 *
 * Sekvence se rozjede až s hotovým písmem. Záměna Lata za náhradní
 * písmo uprostřed dopadu by z toho udělala poskakující nepořádek.
 */

const WORD = ['u', 'č', 'í', 'r', 'n', 'a']
const ready = ref(false)

onMounted(() => {
  const start = (): void => {
    ready.value = true
  }
  if (document.fonts) document.fonts.ready.then(start).catch(start)
  else start()
})
</script>

<template>
  <span class="mark" :class="{ 'mark--ready': ready }" role="img" aria-label="Mučírna">
    <span class="mark__drop" aria-hidden="true">
      <span class="mark__ray mark__ray--up"></span>
      <span class="mark__ray mark__ray--mid"></span>
      <span class="mark__ray mark__ray--down"></span>
      <span class="mark__tile">M</span>
    </span>
    <span class="mark__word" aria-hidden="true">
      <span v-for="(letter, i) in WORD" :key="i" class="mark__letter" :style="{ '--i': i }">{{ letter }}</span>
    </span>
  </span>
</template>

<style scoped>
.mark {
  display: inline-flex;
  align-items: center;
  font-size: var(--fs-home-mark);
  font-weight: 900;
  line-height: 1;
  color: var(--mark-word-top);
}

/* Dokud nedorazí písmo, stojí sekvence na prvním snímku. */
.mark:not(.mark--ready),
.mark:not(.mark--ready) * { animation-play-state: paused; }

.mark__word {
  display: inline-flex;
  letter-spacing: -0.05em;
  transform-origin: 50% 100%;
  animation: mark-thump var(--dur-shake) linear var(--delay-mark-hit) both;
}

.mark__letter {
  position: relative;
  display: inline-block;
  animation:
    mark-letter var(--dur-pop) var(--ease-out) calc(100ms + var(--i) * var(--stagger)) both,
    mark-nudge var(--dur-idle) var(--ease-both) calc(var(--delay-mark-idle) + (var(--i) + 1) * var(--stagger) * 1.3) infinite;
}

.mark__drop {
  position: relative;
  flex: none;
  width: 0.93em;
  height: 0.93em;
  margin-right: 0.06em;
  rotate: -8deg;
  animation: mark-drop var(--dur-drop) both var(--delay-mark-land);
}

/* Dlaždice s M. Rozměry jsou zlomky velikosti písma, aby hrana i stín
   rostly s nápisem a na telefonu nebyly tlustší než písmeno. */
.mark__tile {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: 0.19em;
  background: var(--mark-tile-top);
  color: var(--mark-letter);
  font-size: 0.75em;
  box-shadow: 0.085em 0.085em 0 var(--c-ink);
  animation: mark-tile-idle var(--dur-idle) var(--ease-both) var(--delay-mark-idle) infinite;
}

/* Jiskry. Tři inkoustové čárky, které vystřelí při dopadu a pak u M
   zůstanou. Cuknou pokaždé, když M do něčeho strčí. */
.mark__ray {
  position: absolute;
  right: calc(100% + 0.1em);
  height: 0.05em;
  border-radius: var(--r-full);
  background: var(--mark-spark);
  transform-origin: right center;
  animation:
    mark-ray var(--dur-shake) var(--ease-back) var(--delay-mark-hit) both,
    mark-ray-flick var(--dur-idle) var(--ease-out) var(--delay-mark-idle) infinite;
}
.mark__ray--up { width: 0.3em; top: -0.06em; rotate: 35deg; }
.mark__ray--mid { width: 0.34em; top: 0.44em; }
.mark__ray--down { width: 0.3em; top: 0.88em; rotate: -35deg; }

@keyframes mark-letter {
  0% { transform: translateY(0.48em) scale(0.4); opacity: 0; }
  60% { transform: translateY(-0.07em) scale(1.08); opacity: 1; }
  80% { transform: translateY(0.02em) scale(0.97); }
  100% { transform: none; opacity: 1; }
}

/* Pád zrychluje, dopad smáčkne dlaždici a ta jednou odskočí. */
@keyframes mark-drop {
  0% { transform: translateY(-4.4em) rotate(-42deg) scale(1, 1); animation-timing-function: var(--ease-in); }
  62% { transform: translateY(0) rotate(0deg) scale(1.16, 0.8); animation-timing-function: var(--ease-out); }
  78% { transform: translateY(-0.19em) rotate(-3deg) scale(0.95, 1.06); animation-timing-function: var(--ease-in); }
  90% { transform: translateY(0) rotate(1deg) scale(1.04, 0.96); animation-timing-function: var(--ease-out); }
  100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
}

/* Náraz do slova: jedno plynulé propružení, ne otřes. Rychlé cukání sem
   a tam oko nečte jako náraz, ale jako vynechané snímky, a úvod pak
   působí, jako by se prohlížeč zasekl. */
@keyframes mark-thump {
  0% { transform: translateY(0) scale(1, 1); animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1); }
  28% { transform: translateY(0.035em) scale(1.012, 0.965); animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1); }
  100% { transform: translateY(0) scale(1, 1); }
}

@keyframes mark-ray {
  0% { transform: scaleX(0); }
  60% { transform: scaleX(1.25); }
  100% { transform: scaleX(1); }
}

/* Nečinnost. Tři události v jednom dlouhém cyklu: šťouchanec (kolem 3 %),
   výskok s vlnou písmen (kolem 35 %) a otočka (kolem 67 %). Písmena
   a dlaždice běží ve stejném cyklu, jen s posunem, takže na sebe
   navazují. Používají samostatné vlastnosti `translate`, `rotate`
   a `scale`, aby se nepraly s úvodní animací na `transform`. */
@keyframes mark-tile-idle {
  0% { rotate: 0deg; translate: 0 0; scale: 1; }
  2% { rotate: -12deg; translate: -0.05em 0; }
  3.5% { rotate: 7deg; translate: 0.1em 0; }
  5.5% { rotate: 0deg; translate: 0 0; }
  33% { translate: 0 0; scale: 1; }
  34.5% { translate: 0 -0.18em; rotate: -6deg; scale: 1; }
  36% { translate: 0 0; rotate: 0deg; scale: 1.1 0.88; }
  37.5% { scale: 1; }
  66% { rotate: 0deg; }
  69%, 100% { rotate: 360deg; translate: 0 0; scale: 1; }
}

@keyframes mark-nudge {
  0%, 3% { translate: 0 0; rotate: 0deg; }
  4.5% { translate: 0.085em 0; rotate: 7deg; }
  6% { translate: -0.016em 0; rotate: -2deg; }
  7.5% { translate: 0 0; rotate: 0deg; }
  35% { translate: 0 0; }
  36.5% { translate: 0 -0.15em; }
  38% { translate: 0 0.016em; }
  39%, 100% { translate: 0 0; rotate: 0deg; }
}

@keyframes mark-ray-flick {
  0%, 3% { scale: 1; }
  4% { scale: 1.5 1; }
  6%, 100% { scale: 1; }
}

/* Bez pohybu stojí nápis rovnou v cíli. Klíčové snímky se tokeny
   trvání nevypnou, nekonečné cykly by běžely dál. */
@media (prefers-reduced-motion: reduce) {
  .mark__word,
  .mark__letter,
  .mark__drop,
  .mark__tile,
  .mark__ray { animation: none; }
}
</style>
