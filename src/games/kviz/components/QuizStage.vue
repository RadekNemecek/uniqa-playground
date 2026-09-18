<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimerBar from '@/games/pojistuj/components/TimerBar.vue'
import OptionChip from './OptionChip.vue'
import ChoiceChart from './ChoiceChart.vue'
import { fitToScreen, refitOnResize } from '@/lib/fit'
import type { QuizPhase, QuizQuestion } from '../types'

const props = defineProps<{
  question: QuizQuestion
  phase: QuizPhase
  index: number
  total: number
  limitSeconds: number
  /** Předehra „připrav se". Nula znamená hrát bez telefonů. */
  preRollMs: number
  /** Kdy moderátorka otázku otevřela, podle hodin jejího počítače. */
  askedAt: number | null
  /** Kolik lidí už odpovědělo. Rozložení se do zamčení neukazuje. */
  answered: number
  players: number
  /** Kolik voleb padlo na kterou možnost. Vzniká až s odhalením. */
  counts: number[] | null
}>()

const emit = defineEmits<{ expired: [] }>()

const body = ref<HTMLElement | null>(null)
const fit = (): Promise<void> => fitToScreen(body)
let stopRefit: (() => void) | null = null

const revealed = computed(() => props.phase === 'reveal')

/**
 * Předehra. Otázka se na plátně objeví až po ní, aby se telefony stihly
 * dozvědět, že běží, a odemkly tlačítka ve stejný okamžik. Kdyby plátno
 * nečekalo, hráči s pomalejší wifi by měli na čtení míň času.
 */
const ready = ref(props.preRollMs === 0)
const countdown = ref(0)
let readyTimer = 0
let countdownTimer = 0

function updateCountdown(): void {
  if (props.askedAt === null) {
    countdown.value = 0
    return
  }
  countdown.value = Math.max(1, Math.ceil((props.askedAt + props.preRollMs - Date.now()) / 1000))
}

function scheduleReady(): void {
  window.clearTimeout(readyTimer)
  window.clearInterval(countdownTimer)
  if (props.preRollMs === 0 || props.askedAt === null || props.phase !== 'question') {
    ready.value = true
    countdown.value = 0
    return
  }
  const wait = props.askedAt + props.preRollMs - Date.now()
  if (wait <= 0) {
    ready.value = true
    countdown.value = 0
    return
  }
  ready.value = false
  updateCountdown()
  countdownTimer = window.setInterval(updateCountdown, 100)
  readyTimer = window.setTimeout(() => {
    window.clearInterval(countdownTimer)
    countdown.value = 0
    ready.value = true
    void fit()
  }, wait)
}

const running = computed(() => props.phase === 'question' && ready.value)

/** Vyhodnocení mění jen jas chybných možností. Správná i zamčené volby
 *  zůstávají přesně ve stejné podobě a na stejném místě. */
function stateOf(i: number): 'idle' | 'wrong' {
  if (!revealed.value) return 'idle'
  return i === props.question.correctIndex ? 'idle' : 'wrong'
}

/** Co udělá mezerník. Na plátně to musí být vidět, aby se nedalo omylem
 *  přeskočit odhalení. */
const hint = computed(() => {
  switch (props.phase) {
    case 'question':
      return ready.value ? 'Mezerník zamkne odpovídání' : 'Za chvíli…'
    case 'locked':
      return 'Mezerník odhalí správnou odpověď'
    default:
      return 'Mezerník pokračuje dál'
  }
})

const lockedLabel = computed(() => {
  if (revealed.value) return 'Správná odpověď'
  if (props.players > 0 && props.answered >= props.players) return 'Všichni odpověděli'
  return 'Odpovídání zastaveno'
})

// Otázka i možnosti se musí vejít na jednu obrazovku. Měří se, neodhaduje.
// Fáze rozložení nemění, proto se při vyhodnocení znovu nepřepočítává:
// velikost i poloha dlaždic tak zůstanou beze změny.
watch(() => props.question.qid, () => {
  scheduleReady()
  void fit()
})

onMounted(() => {
  scheduleReady()
  void fit()
  stopRefit = refitOnResize(() => void fit())
})
onBeforeUnmount(() => {
  stopRefit?.()
  window.clearTimeout(readyTimer)
  window.clearInterval(countdownTimer)
})
</script>

<template>
  <section class="stage" :class="`stage--${phase}`">
    <header class="stage__head">
      <p class="stage__pos">Otázka {{ index + 1 }} z {{ total }}</p>
      <p v-if="players > 0 && phase === 'question'" class="stage__tally">
        odpovědělo {{ answered }} z {{ players }}
      </p>
      <p class="stage__cat">{{ question.packName }}</p>
    </header>

    <!-- Předehra: místnost ztichne a telefony stihnou odemknout tlačítka. -->
    <div v-if="!ready" class="prep" aria-live="polite">
      <p class="prep__word">Začínáme za</p>
      <p class="prep__num">{{ countdown }}</p>
    </div>

    <!-- Klíč je otázka: s každou novou se tělo vymění, takže nástup
         otázky i možností proběhne znovu a plátno dá poznat, že se něco
         změnilo. -->
    <div v-else :key="question.qid" ref="body" class="stage__body">
      <p class="stage__prompt">{{ question.prompt }}</p>

      <!-- Místo pro vysvětlení se rezervuje od začátku. Při vyhodnocení
           se jen odkryje, takže odpovědi neposkočí ani se nepřeměří. -->
      <p
        v-if="question.note"
        class="stage__note"
        :class="{ 'stage__note--hidden': !revealed }"
        :aria-hidden="!revealed"
      >
        {{ question.note }}
      </p>

      <ul class="stage__options">
        <li v-for="(text, i) in question.options" :key="i" :style="{ '--d': i }">
          <OptionChip :index="i" :text="text" :state="stateOf(i)" />
        </li>
      </ul>

      <!-- Jak kdo odpovídal. Bez telefonů není co kreslit, takže si graf
           v takové hře ani nedrží místo. -->
      <ChoiceChart
        v-if="players > 0"
        :counts="counts"
        :slots="question.options.length"
        :correct-index="question.correctIndex"
        :kind="question.kind"
        :revealed="revealed && counts !== null"
      />
    </div>

    <footer class="stage__foot">
      <TimerBar
        v-if="limitSeconds > 0 && phase === 'question'"
        :key="question.qid + String(ready)"
        :seconds="limitSeconds"
        :running="running"
        @expired="emit('expired')"
      />
      <p v-else class="stage__locked">
        {{ lockedLabel }}
      </p>
      <p class="stage__hint">{{ hint }}</p>
    </footer>
  </section>
</template>

<style scoped>
.stage {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--sp-3);
  height: 100%;
  min-height: 0;
  padding: var(--sp-4) var(--sp-7) var(--sp-5);
}

/* Hlavička ---------------------------------------------------------------- */
.stage__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
  padding-bottom: var(--sp-3);
  border-bottom: var(--separator-w) solid var(--c-line-soft);
}
.stage__pos,
.stage__cat {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}
.stage__pos { color: var(--c-text-faint); }
.stage__cat { color: var(--c-brand); }
/* Kolik lidí odpovědělo, ne co zvolili. Rozložení do zamčení nesmí být
   vidět, moderátorka by se prozradila obličejem. */
.stage__tally { font-size: var(--fs-sm); color: var(--c-text-muted); font-variant-numeric: tabular-nums; }

/* Předehra ----------------------------------------------------------------- */
.prep {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--sp-5);
  min-height: 0;
}
.prep__num {
  font-family: var(--font-display);
  font-size: var(--fs-countdown);
  font-weight: 900;
  line-height: var(--lh-tight);
  color: var(--c-brand);
  font-variant-numeric: tabular-nums;
}
.prep__word {
  font-size: var(--fs-lg);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}

/* Tělo. --fit nastavuje fitToScreen(), zmenšuje otázku i možnosti naráz. */
.stage__body {
  --fit: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto auto;
  gap: calc(var(--sp-5) * var(--fit));
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.stage__prompt {
  align-self: center;
  justify-self: center;
  max-width: min(100%, calc(38ch / var(--fit)));
  padding: calc(var(--sp-5) * var(--fit)) calc(var(--sp-6) * var(--fit));
  font-family: var(--font-display);
  font-size: calc(var(--fs-prompt) * var(--fit));
  font-weight: 800;
  line-height: var(--lh-tight);
  text-align: center;
  text-wrap: balance;
  /* Otázka nastoupí první, možnosti za ní. Je to jediný pohyb, který
     na plátně smí být: čte ho celá místnost naráz. */
  animation: prompt-in var(--dur-slow) var(--ease-out) backwards;
}

@keyframes prompt-in {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to { opacity: 1; transform: none; }
}

.stage__options {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: calc(var(--sp-5) * var(--fit));
  width: 100%;
  max-width: var(--quiz-stage-max);
  margin-inline: auto;
  /* Možnosti se čtou z druhého konce místnosti, takže jdou na doraz.
     Když se nevejdou, ubere fitToScreen(). */
  font-size: calc(var(--fs-answer) * var(--fit));
}
.stage__options > li {
  display: grid;
  min-width: 0;
  /* Možnosti nastupují po sobě, zleva doprava. Je to krátký pohyb, jen
     aby bylo znát, že přišla nová otázka. */
  animation: option-in var(--dur-base) var(--ease-out) calc(var(--d) * 70ms) backwards;
}

@keyframes option-in {
  from { opacity: 0; transform: translateY(0.75rem); }
  to { opacity: 1; transform: none; }
}

/* Poučka je to, kvůli čemu se kvíz na školení hraje, takže se musí dát
   přečíst i zezadu. Šířka je omezená na měřítko řádku, ne na šířku desky:
   dlouhý řádek se z dálky čte hůř než malé písmo. */
.stage__note {
  justify-self: center;
  max-width: min(100%, calc(52ch / var(--fit)));
  padding: calc(var(--sp-3) * var(--fit)) calc(var(--sp-5) * var(--fit));
  border-left: var(--sp-1) solid var(--c-brand);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-brand) 10%, transparent);
  font-size: calc(var(--fs-lg) * var(--fit));
  line-height: var(--lh-body);
  text-align: left;
  text-wrap: pretty;
  transition: opacity var(--dur-base) var(--ease-out);
}
.stage__note--hidden { visibility: hidden; opacity: 0; }

/* Patička ----------------------------------------------------------------- */
.stage__foot {
  display: grid;
  align-content: end;
  gap: var(--sp-2);
  height: var(--quiz-stage-footer);
}
.stage__locked {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 800;
  text-align: center;
  color: var(--c-text-muted);
}
.stage__hint {
  font-size: var(--fs-xs);
  text-align: center;
  color: var(--c-text-faint);
  letter-spacing: 0.02em;
}

@media (prefers-reduced-motion: reduce) {
  .stage__prompt,
  .stage__options > li { animation: none; }
}

@media (max-width: 720px) {
  .stage { padding: var(--sp-3) var(--sp-4) var(--sp-4); }
  .stage__options { grid-template-columns: minmax(0, 1fr); }
}
</style>
