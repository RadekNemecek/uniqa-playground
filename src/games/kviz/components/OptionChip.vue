<script setup lang="ts">
import { computed } from 'vue'
import { quizOption, optionLabel } from '../options'
import type { QuizKind } from '../types'
import UiIcon from '@/components/ui/UiIcon.vue'

const props = withDefaults(
  defineProps<{
    index: number
    text?: string
    /** Vyhodnocení ztlumí chybnou možnost a označí správnou. */
    state?: 'idle' | 'wrong' | 'right'
    kind?: QuizKind
    /**
     * Hraje se s telefony, takže dlaždice ponese i rozložení hlasů. Musí
     * se vědět od začátku otázky: pruh i číslo si drží místo, aby text
     * po odhalení nepřetekl jinam, než na kolik se změřil.
     */
    withVotes?: boolean
    /** Kolik lidí možnost zvolilo. Null, dokud se neodhalilo. */
    votes?: number | null
    /** Podíl na nejsilnější možnosti, 0 až 1. */
    share?: number | null
  }>(),
  { text: '', state: 'idle', kind: 'choice', withVotes: false, votes: null, share: null },
)

const option = computed(() => quizOption(props.index))
const label = computed(() => optionLabel(props.index, props.kind))
const revealed = computed(() => props.votes !== null)
</script>

<template>
  <div
    class="chip"
    :class="[`chip--${state}`, { 'chip--votes': withVotes }]"
    :style="{ '--tint': `var(${option.color.cssVar})`, '--share': String(share ?? 0) }"
  >
    <span class="chip__letter" aria-hidden="true">{{ option.letter }}</span>
    <span v-if="text" v-fit-text class="chip__text">{{ text }}</span>

    <!-- Značka verdiktu. Fajfka u správné, křížek u chybné, u obou na
         stejném místě: dlaždice se po odhalení nesmí přesázet. Křížek
         tu není navíc k barvě, je to druhý nositel téhož: kdo barvy
         nerozezná nebo sedí daleko, čte tvar. -->
    <span v-if="state !== 'idle'" class="chip__tick" aria-hidden="true">
      <UiIcon :name="state === 'right' ? 'check' : 'close'" size="md" />
    </span>

    <span v-if="withVotes" class="chip__count" :class="{ 'chip__count--hidden': !revealed }" aria-hidden="true">
      {{ votes ?? 0 }}
    </span>

    <!-- Kolik hlasů možnost dostala. Pruh je z inkoustu, ne z odstínu:
         na barevné ploše dlaždice by se odstín ztratil. -->
    <span v-if="withVotes" class="chip__bar" :class="{ 'chip__bar--hidden': !revealed }" aria-hidden="true">
      <span class="chip__fill"></span>
    </span>

    <!-- Verdikt nese na plátně tvar a plocha, obojí je pro čtečku němé,
         proto je tady i slovem. -->
    <span class="vh">
      {{ label }}<template v-if="state === 'right'">, správně</template><template
        v-else-if="state === 'wrong'"
      >, špatně</template><template v-if="revealed">, {{ votes }}</template>
    </span>
  </div>
</template>

<style scoped>
/* Celá plocha nese barvu možnosti. Tmavý text na všech čtyřech odstínech
   drží nejméně 7:1, takže jsou volby výrazné a stále dobře čitelné. */
.chip {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: calc(var(--sp-4) * var(--fit, 1));
  min-width: 0;
  min-height: calc(var(--sp-9) * var(--fit, 1));
  padding: calc(var(--sp-4) * var(--fit, 1)) calc(var(--sp-5) * var(--fit, 1));
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--tint);
  box-shadow: var(--shadow-md);
  color: var(--c-text-ink);
  overflow: hidden;
  transition:
    background-color var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

/* Pruh s hlasy má vlastní pás dole. Rezervuje se od začátku otázky,
   jinak by se text po odhalení přelomil jinak, než na kolik se měřil. */
.chip--votes { padding-bottom: calc(var(--sp-6) * var(--fit, 1)); }

.chip__letter {
  display: grid;
  place-items: center;
  width: calc(var(--sp-8) * var(--fit, 1));
  aspect-ratio: 1;
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-surface);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: calc(var(--fs-2xl) * var(--fit, 1));
  line-height: 1;
  color: var(--c-text-ink);
}

.chip__text {
  min-width: 0;
  /* Slovo se nedělí. Když se do dlaždice nevejde, ubere `v-fit-text`
     na velikosti; rozseknuté slovo se z místnosti čte jako dvě. */
  font-size: calc(var(--fs-answer) * var(--fit, 1) * var(--fit-text, 1));
  font-weight: 900;
  line-height: var(--lh-snug);
  text-wrap: balance;
}

.chip__tick {
  display: grid;
  place-items: center;
  width: calc(var(--sp-6) * var(--fit, 1));
  aspect-ratio: 1;
  border-radius: var(--r-full);
  background: var(--c-text-ink);
  color: var(--tint);
}
.chip__tick svg { width: 62%; height: 62%; }

.chip__count {
  min-width: 2ch;
  text-align: right;
  font-family: var(--font-display);
  font-size: calc(var(--fs-2xl) * var(--fit, 1));
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.chip__count--hidden { visibility: hidden; }

.chip__bar {
  position: absolute;
  left: calc(var(--sp-5) * var(--fit, 1));
  right: calc(var(--sp-5) * var(--fit, 1));
  bottom: calc(var(--sp-3) * var(--fit, 1));
  height: calc(var(--sp-2) * var(--fit, 1));
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-full);
  background: var(--c-surface);
  overflow: hidden;
}
.chip__bar--hidden { visibility: hidden; }
.chip__fill {
  display: block;
  width: calc(var(--share) * 100%);
  height: 100%;
  background: var(--c-ink);
  transition: width var(--dur-slow) var(--ease-out);
}

/* --- Verdikt --------------------------------------------------------------
   Chybná možnost nezhasíná průhledností, ale ztrácí barvu a stín:
   zbude z ní čárkovaný obrys na šedomodrém papíře. Z poslední řady se
   barevná deska se stínem proti ploché šedé pozná okamžitě. Text
   zůstává tmavý a drží 6,4:1, průhlednost by ho stáhla pod 4,5:1.

   Posunout se chybná nesmí, ani do stínu: obsah plátna je změřený
   a po odhalení se nesmí pohnout. Počet hlasů zůstává čitelný, pruh
   je dál inkoust na bílé. */
.chip--wrong {
  border-style: dashed;
  background: var(--c-dead);
  box-shadow: var(--shadow-none);
  color: var(--c-text-muted);
}
.chip--wrong .chip__letter { color: var(--c-text-muted); }
.chip--wrong .chip__tick {
  background: transparent;
  color: var(--c-text-muted);
  box-shadow: inset 0 0 0 var(--border-w) var(--c-text-muted);
}

/* Správná drží plnou barvu a navíc velký stín. */
.chip--right {
  box-shadow: var(--shadow-lg);
}

@media (prefers-reduced-motion: reduce) {
  .chip__fill { transition: none; }
}
</style>
