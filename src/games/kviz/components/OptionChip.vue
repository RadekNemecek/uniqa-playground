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
    <span v-if="text" class="chip__text">{{ text }}</span>

    <!-- Fajfka se objeví jen u správné, ale místo si drží obě: dlaždice se
         po odhalení nesmí přesázet. -->
    <span v-if="state !== 'idle'" class="chip__tick" :class="{ 'chip__tick--off': state !== 'right' }" aria-hidden="true">
      <UiIcon name="check" size="md" />
    </span>

    <span v-if="withVotes" class="chip__count" :class="{ 'chip__count--hidden': !revealed }" aria-hidden="true">
      {{ votes ?? 0 }}
    </span>

    <!-- Kolik hlasů možnost dostala. Pruh je z inkoustu, ne z odstínu:
         na barevné ploše dlaždice by se odstín ztratil. -->
    <span v-if="withVotes" class="chip__bar" :class="{ 'chip__bar--hidden': !revealed }" aria-hidden="true">
      <span class="chip__fill"></span>
    </span>

    <span class="vh">{{ label }}<template v-if="revealed">, {{ votes }}</template></span>
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
  border: var(--separator-w) solid color-mix(in oklab, var(--c-text-ink) 30%, var(--tint));
  border-radius: var(--r-lg);
  background: var(--tint);
  box-shadow: var(--shadow-md), inset 0 var(--separator-w) 0 color-mix(in oklab, var(--c-value) 42%, transparent);
  color: var(--c-text-ink);
  overflow: hidden;
  transition:
    opacity var(--dur-base) var(--ease-out),
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
  border-radius: var(--r-lg);
  background: color-mix(in oklab, var(--c-text-ink) 10%, transparent);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: calc(var(--fs-2xl) * var(--fit, 1));
  line-height: 1;
  color: var(--c-text-ink);
  box-shadow: inset 0 0 0 var(--separator-w) color-mix(in oklab, var(--c-text-ink) 28%, transparent);
}

.chip__text {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
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
/* U chybné možnosti je fajfka jen rezervované místo. */
.chip__tick--off { visibility: hidden; }

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
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-text-ink) 18%, transparent);
  overflow: hidden;
}
.chip__bar--hidden { visibility: hidden; }
.chip__fill {
  display: block;
  width: calc(var(--share) * 100%);
  height: 100%;
  border-radius: var(--r-full);
  background: var(--c-text-ink);
  transition: width var(--dur-slow) var(--ease-out);
}

/* Chybná možnost se ztlumí, ale ne tak, aby se z druhého konce místnosti
   nedal přečíst její počet hlasů: to je to, co učí. */
.chip--wrong { opacity: 0.55; }
/* Správná drží plný jas a navíc silnější rámeček, ne jen barvu. */
.chip--right {
  border-color: var(--c-text-ink);
  box-shadow: var(--shadow-lg), inset 0 0 0 calc(var(--sp-1) * var(--fit, 1)) color-mix(in oklab, var(--c-text-ink) 22%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .chip__fill { transition: none; }
}
</style>
