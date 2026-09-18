<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimerBar from '@/games/pojistuj/components/TimerBar.vue'
import OptionChip from './OptionChip.vue'
import { fitToScreen, refitOnFonts, refitOnResize } from '@/lib/fit'
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

/** Vyhodnocení ztlumí chybné možnosti a označí správnou. Rozvržení
 *  zůstává stejné, dlaždice se nikam neposunou. */
function stateOf(i: number): 'idle' | 'wrong' | 'right' {
  if (!revealed.value) return 'idle'
  return i === props.question.correctIndex ? 'right' : 'wrong'
}

/** Nejsilnější možnost. Od ní se odvíjí délka pruhů, aby byl rozdíl vidět
 *  i tehdy, když odpovídalo pět lidí. */
const peak = computed(() => Math.max(1, ...(props.counts ?? [0])))

function votesFor(i: number): number | null {
  return revealed.value && props.counts ? (props.counts[i] ?? 0) : null
}

function shareFor(i: number): number {
  return revealed.value && props.counts ? (props.counts[i] ?? 0) / peak.value : 0
}

/**
 * Po odhalení se střed obrazovky uvolní pro poučku, kvůli které se kvíz
 * hraje, a otázka se smrskne na jeden řádek nad ní. Visela na plátně celý
 * limit, takže ji nikdo nepotřebuje číst znovu. Když poučka není, zůstane
 * uprostřed otázka: prázdný střed by byl horší než opakování.
 */
const noteUp = computed(() => revealed.value && props.question.note.trim().length > 0)

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

/**
 * Co stojí v patičce. Dokud se odpovídá, je to počet došlých odpovědí:
 * časomíra se přesunula nad otázku a tenhle řádek by jinak zůstal prázdný.
 * Co kdo zvolil, se do zamčení neukazuje, moderátorka by se prozradila
 * obličejem.
 */
const footNote = computed(() => {
  if (props.phase === 'question') {
    return props.players > 0 ? `Odpovědělo ${props.answered} z ${props.players}` : ''
  }
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
  refitOnFonts(() => void fit())
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
      <p class="stage__cat">{{ question.packName }}</p>
    </header>

    <!-- Časomíra patří nad otázku: místnost se dívá nahoru a ubývající
         čas má být v témže pohledu jako to, na co odpovídá. Pás si drží
         místo po celou otázku, aby se obsah pod ním nehýbal. -->
    <div v-if="limitSeconds > 0" class="stage__time">
      <TimerBar
        v-if="phase === 'question'"
        :key="question.qid + String(ready)"
        :seconds="limitSeconds"
        :running="running"
        @expired="emit('expired')"
      />
    </div>

    <!-- Předehra: místnost ztichne a telefony stihnou odemknout tlačítka. -->
    <div v-if="!ready" class="prep" aria-live="polite">
      <p class="prep__word">Začínáme za</p>
      <p class="prep__num">{{ countdown }}</p>
    </div>

    <!-- Klíč je otázka: s každou novou se tělo vymění, takže nástup
         otázky i možností proběhne znovu a plátno dá poznat, že se něco
         změnilo. -->
    <div v-else :key="question.qid" ref="body" class="stage__body">
      <!-- Ohlédnutí za otázkou. Místo si drží od začátku, aby se obsah
           při odhalení nepohnul a nemusel přeměřovat. -->
      <p v-if="question.note" class="stage__recap" :class="{ 'stage__recap--hidden': !noteUp }" :aria-hidden="!noteUp">
        {{ question.prompt }}
      </p>

      <!-- Otázka a poučka sdílejí jednu buňku, takže se řádek změří na tu
           vyšší z nich a přepnutí nikam neposune dlaždice pod ním. -->
      <div class="stage__focus">
        <p class="stage__prompt" :class="{ 'stage__prompt--away': noteUp }" :aria-hidden="noteUp">
          {{ question.prompt }}
        </p>
        <p
          v-if="question.note"
          class="stage__note"
          :class="{ 'stage__note--hidden': !noteUp }"
          :aria-hidden="!noteUp"
        >
          {{ question.note }}
        </p>
      </div>

      <ul class="stage__options">
        <li v-for="(text, i) in question.options" :key="i" :style="{ '--d': i }">
          <OptionChip
            :index="i"
            :text="text"
            :state="stateOf(i)"
            :kind="question.kind"
            :with-votes="players > 0"
            :votes="votesFor(i)"
            :share="shareFor(i)"
          />
        </li>
      </ul>
    </div>

    <footer class="stage__foot">
      <p class="stage__locked">{{ footNote }}</p>
      <p class="stage__hint">{{ hint }}</p>
    </footer>
  </section>
</template>

<style scoped>
.stage {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
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
/* Pás s časomírou. Výšku drží i mimo běžící otázku, aby otázka pod ním
   nepoposkočila, až čas doběhne. */
.stage__time {
  display: flex;
  align-items: center;
  min-height: var(--stage-timer-h);
}

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
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: calc(var(--sp-5) * var(--fit));
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Otázka po odhalení. Jeden řádek, ať je jasné, k čemu se poučka pod ní
   vztahuje, a nic víc: přečetla se, dokud se odpovídalo. */
.stage__recap {
  justify-self: center;
  max-width: min(100%, calc(80ch / var(--fit)));
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: calc(var(--fs-lg) * var(--fit));
  font-weight: 700;
  color: var(--c-text-muted);
  transition: opacity var(--dur-base) var(--ease-out);
}
.stage__recap--hidden { visibility: hidden; opacity: 0; }

/* Otázka a poučka stojí v jedné buňce přes sebe. Řádek se tím změří na
   tu vyšší z nich a přepnutí po odhalení s ničím nehne. */
.stage__focus {
  display: grid;
  align-items: center;
  justify-items: center;
  min-height: 0;
}
.stage__focus > * { grid-area: 1 / 1; }

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
  transition: opacity var(--dur-base) var(--ease-out);
}
.stage__prompt--away { visibility: hidden; opacity: 0; }

/* Nástupy se zvětšují do místa, nikdy neposouvají mimo svůj obdélník.
   Posun dolů by při měření vyčníval pod okraj, fitToScreen by ho četl
   jako přetečení a zmenšil celou obrazovku na minimum. */
@keyframes prompt-in {
  from { opacity: 0; transform: scale(0.98); }
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
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: none; }
}

/* Poučka je to, kvůli čemu se kvíz na školení hraje. Po odhalení sedí
   uprostřed plátna a jde na ni celé uvolněné místo, takže se dá přečíst
   i ze zadní řady. Šířka je omezená na měřítko řádku, ne na šířku desky:
   dlouhý řádek se z dálky čte hůř než malé písmo. */
.stage__note {
  align-self: center;
  justify-self: center;
  max-width: min(100%, calc(34ch / var(--fit)));
  padding: calc(var(--sp-5) * var(--fit)) calc(var(--sp-6) * var(--fit));
  border-left: var(--sp-1) solid var(--c-brand);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-brand) 10%, transparent);
  font-size: calc(var(--fs-note) * var(--fit));
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
