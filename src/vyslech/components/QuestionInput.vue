<script setup lang="ts">
import { computed, useId } from 'vue'
import { highLabel, lowLabel, MAX_TEXT, rangeOf } from '../questions'
import type { VyslechAnswer, VyslechQuestion } from '../types'

/**
 * Jedna otázka na telefonu.
 *
 * Volby jsou skutečné přepínače a zaškrtávátka, jen schované pod
 * dlaždicemi. Šipky, tabulátor i čtečka tak fungují samy a dlaždice je
 * jen to, na co se ťuká palcem.
 */
const props = defineProps<{
  question: VyslechQuestion
  index: number
  /** Povinná otázka bez odpovědi po pokusu o odeslání. */
  missing?: boolean
}>()

const model = defineModel<VyslechAnswer | undefined>()

const uid = useId()
const name = computed(() => `${uid}-${props.question.id}`)
const values = computed(() => rangeOf(props.question.kind))

function pickNumber(v: number): void {
  model.value = v
}

function toggle(i: number): void {
  const now = Array.isArray(model.value) ? model.value : []
  model.value = now.includes(i) ? now.filter((x) => x !== i) : [...now, i].sort((a, b) => a - b)
}

const picked = computed(() => (Array.isArray(model.value) ? model.value : []))
const text = computed({
  get: () => (typeof model.value === 'string' ? model.value : ''),
  set: (v: string) => {
    model.value = v
  },
})
</script>

<template>
  <fieldset class="q" :class="{ 'q--missing': missing }" :aria-describedby="missing ? `${name}-err` : undefined">
    <legend class="q__prompt">
      <span class="q__num" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
      <span>{{ question.prompt }}<span v-if="!question.required" class="q__optional"> (nepovinné)</span></span>
    </legend>

    <!-- Škála a doporučení ------------------------------------------------ -->
    <template v-if="question.kind === 'scale' || question.kind === 'nps'">
      <div class="scale" :class="`scale--${question.kind}`">
        <label
          v-for="v in values"
          :key="v"
          class="tile"
          :class="{ 'tile--on': model === v }"
        >
          <input
            class="vh"
            type="radio"
            :name="name"
            :value="v"
            :checked="model === v"
            @change="pickNumber(v)"
          />
          <span>{{ v }}</span>
        </label>
      </div>
      <p class="ends" aria-hidden="true">
        <span>{{ values[0] }} · {{ lowLabel(question) }}</span>
        <span>{{ highLabel(question) }} · {{ values[values.length - 1] }}</span>
      </p>
    </template>

    <!-- Jedna volba -------------------------------------------------------- -->
    <div v-else-if="question.kind === 'single'" class="list">
      <label
        v-for="(o, i) in question.options"
        :key="i"
        class="pick"
        :class="{ 'pick--on': model === i }"
      >
        <input class="vh" type="radio" :name="name" :value="i" :checked="model === i" @change="pickNumber(i)" />
        <span class="pick__mark pick__mark--round" aria-hidden="true"></span>
        <span class="pick__text">{{ o }}</span>
      </label>
    </div>

    <!-- Víc voleb ------------------------------------------------------------ -->
    <div v-else-if="question.kind === 'multi'" class="list">
      <p class="q__hint">Vyber, kolik chceš.</p>
      <label
        v-for="(o, i) in question.options"
        :key="i"
        class="pick"
        :class="{ 'pick--on': picked.includes(i) }"
      >
        <input class="vh" type="checkbox" :checked="picked.includes(i)" @change="toggle(i)" />
        <span class="pick__mark" aria-hidden="true"></span>
        <span class="pick__text">{{ o }}</span>
      </label>
    </div>

    <!-- Text --------------------------------------------------------------- -->
    <div v-else class="text">
      <textarea
        v-model="text"
        :maxlength="MAX_TEXT"
        rows="3"
        :aria-label="question.prompt"
        placeholder="Napiš to vlastními slovy"
      ></textarea>
      <p class="text__count" aria-hidden="true">{{ text.length }} / {{ MAX_TEXT }}</p>
    </div>

    <p v-if="missing" :id="`${name}-err`" class="q__error">Tahle otázka je povinná.</p>
  </fieldset>
</template>

<style scoped>
.q {
  display: grid;
  gap: var(--sp-3);
  min-width: 0;
  margin: 0;
  padding: var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}
/* Chybějící odpověď nese slovo i barvu hrany. */
.q--missing { border-color: var(--c-bad); box-shadow: var(--shadow-md); }

.q__prompt {
  display: flex;
  gap: var(--sp-3);
  float: left;
  width: 100%;
  margin-bottom: var(--sp-3);
  padding: 0;
  font-size: var(--fs-lg);
  font-weight: 900;
  line-height: var(--lh-snug);
}
.q__prompt + * { clear: both; }
.q__num {
  flex: none;
  align-self: start;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  background: var(--c-ink);
  color: var(--c-on-ink);
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  rotate: -4deg;
}
.q__optional { font-size: var(--fs-sm); font-weight: 400; color: var(--c-text-muted); }
.q__hint { font-size: var(--fs-sm); color: var(--c-text-muted); }
.q__error { color: var(--c-bad); font-size: var(--fs-sm); font-weight: 900; }

/* Škála ------------------------------------------------------------------ */
.scale { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--sp-2); }
/* Jedenáct dlaždic se do řady na telefonu nevejde v dotykové velikosti,
   proto dvě řady: 0 až 5 a 6 až 10. */
.scale--nps { grid-template-columns: repeat(6, minmax(0, 1fr)); }

.tile {
  display: grid;
  place-items: center;
  min-height: var(--control-touch);
  aspect-ratio: 1;
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-base);
  box-shadow: var(--shadow-sm);
  font-size: var(--fs-xl);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    translate var(--dur-press) var(--ease-out),
    box-shadow var(--dur-press) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.scale--nps .tile { aspect-ratio: auto; font-size: var(--fs-lg); }
/* Vybraná dlaždice se zamáčkne do svého stínu a zmodrá. Pozná se i bez
   barvy: je posunutá a nemá stín. */
.tile--on {
  translate: var(--shadow-x-sm) var(--shadow-x-sm);
  box-shadow: var(--shadow-none);
  background: var(--c-brand);
  color: var(--c-on-accent);
}
.tile:has(input:focus-visible),
.pick:has(input:focus-visible) {
  outline: var(--focus-ring-w) solid var(--focus-ring-c);
  outline-offset: var(--focus-ring-offset);
}

.ends {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
}
.ends span:last-child { text-align: right; }

/* Volby ------------------------------------------------------------------ */
.list { display: grid; gap: var(--sp-2); }
.pick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: var(--control-touch);
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-base);
  box-shadow: var(--shadow-sm);
  font-weight: 700;
  cursor: pointer;
  transition:
    translate var(--dur-press) var(--ease-out),
    box-shadow var(--dur-press) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.pick--on {
  translate: var(--shadow-x-sm) var(--shadow-x-sm);
  box-shadow: var(--shadow-none);
  background: var(--c-brand-wash);
}
.pick__text { min-width: 0; line-height: var(--lh-snug); }
.pick__mark {
  flex: none;
  display: grid;
  place-items: center;
  width: var(--control-check);
  height: var(--control-check);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-xs);
  background: var(--c-surface);
}
.pick__mark--round { border-radius: var(--r-full); }
.pick--on .pick__mark { background: var(--c-brand); box-shadow: inset 0 0 0 var(--border-w-strong) var(--c-surface); }

/* Text ------------------------------------------------------------------- */
.text { display: grid; gap: var(--sp-1); }
.text textarea {
  width: 100%;
  min-height: var(--field-textarea-min);
  padding: var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
  /* Pod 16 px by iOS při zaměření přiblížil stránku. */
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  resize: vertical;
}
.text textarea:focus-visible { background: var(--c-bg-field-focus); box-shadow: var(--shadow-sm); }
.text__count { justify-self: end; font-size: var(--fs-xs); color: var(--c-text-muted); font-variant-numeric: tabular-nums; }
</style>
