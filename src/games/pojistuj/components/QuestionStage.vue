<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GameState, Question } from '@/types'
import TimerBar from './TimerBar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { flipFrom } from '@/lib/motion'
import { fitToScreen as fit, refitOnFonts, refitOnResize } from '@/lib/fit'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'
import UiIconButton from '@/components/ui/UiIconButton.vue'

const props = defineProps<{
  game: GameState
  question: Question
  categoryName: string
  points: number
  isWager: boolean
  /** Obdélník dlaždice, ze které se otázka roztáhla. */
  origin: DOMRect | null
}>()

const emit = defineEmits<{
  reveal: []
  resolve: [teamId: string | null]
  cancel: []
}>()

const stage = ref<HTMLElement | null>(null)
const stealOpen = ref(false)
const timedOut = ref(false)

const revealed = computed(() => props.game.phase === 'reveal')
const active = computed(() => props.game.teams[props.game.activeTeamIndex] ?? null)
const others = computed(() => props.game.teams.filter((t) => t.id !== active.value?.id))
const canSteal = computed(() => props.game.rules.steal && others.value.length > 0)

/** Měření je společné s kvízem, viz `src/lib/fit.ts`. */
const body = ref<HTMLElement | null>(null)
const fitToScreen = (): Promise<void> => fit(body)
let stopRefit: (() => void) | null = null

watch(() => [props.question.id, props.game.phase], fitToScreen)

/**
 * Mezi odhalením a připsáním bodů musí být pauza.
 *
 * Mezerník dělá dvě různé věci hned po sobě: první stisk odhalí odpověď,
 * druhý připíše body. Nervózní dvojité ťuknutí tak přiznalo body týmu,
 * který ještě nestihl odpovědět. Vrátit to sice jde, ale na plátně už
 * skóre přeteklo a před sálem to vypadá jako chyba aplikace.
 */
/**
 * Kolik času uběhlo od otevření otázky.
 *
 * Čte se jednou, při nasazení komponenty. Po obnovení stránky uprostřed
 * otázky se tím časomíra napojí tam, kde skutečně byla.
 */
const elapsedMs = props.game.openedAt ? Math.max(0, Date.now() - props.game.openedAt) : 0

const GUARD_MS = 400
let revealedAt = 0

function reveal() {
  if (revealed.value) return
  revealedAt = performance.now()
  if (settings.sound) sfx.reveal()
  emit('reveal')
}

function resolve(teamId: string | null) {
  if (!revealed.value) return
  if (settings.sound) teamId ? sfx.correct() : sfx.wrong()
  emit('resolve', teamId)
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
    return
  }
  if (!revealed.value) {
    // Mezerník hlásí různé prohlížeče různě, proto i e.code.
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      reveal()
    }
    return
  }
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    // Ozvěna prvního stisku, kterým se právě odhalilo. Body nepřiznává.
    if (performance.now() - revealedAt < GUARD_MS) return
    resolve(active.value?.id ?? null)
    return
  }
  if (e.key === '0' || e.key.toLowerCase() === 'n') {
    e.preventDefault()
    resolve(null)
    return
  }
  const n = Number(e.key)
  if (Number.isInteger(n) && n >= 1 && n <= props.game.teams.length) {
    const team = props.game.teams[n - 1]!
    // Bez přebírání smí klávesa 1–6 přiznat body jen týmu na tahu.
    if (team.id !== active.value?.id && !canSteal.value) return
    e.preventDefault()
    resolve(team.id)
  }
}

onMounted(async () => {
  if (settings.sound) sfx.open()
  await nextTick()
  if (stage.value && props.origin) flipFrom(stage.value, props.origin)
  void fitToScreen()
  // Písmo dorazí až po prvním vykreslení a náhradní se láme jinak. Bez
  // přeměření by první otázka po studeném startu zůstala zmenšená.
  refitOnFonts(() => void fitToScreen())
  window.addEventListener('keydown', onKey)
  stopRefit = refitOnResize(() => void fitToScreen())
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopRefit?.()
})
</script>

<template>
  <div ref="stage" class="stage" role="dialog" aria-modal="true" :aria-label="`Otázka za ${points} bodů`">
    <header class="stage__head">
      <div class="stage__id">
        <span class="stage__cat">{{ categoryName }}</span>
        <span v-if="isWager" class="stage__wagerTag">Riziko!</span>
      </div>
      <UiIconButton
        class="stage__close"
        icon="close"
        variant="plain"
        label="Zavřít bez bodování"
        @click="emit('cancel')"
      />
    </header>

    <div class="stage__meta">
      <p
        class="stage__value"
        :class="{ 'stage__value--wager': isWager }"
        data-stage-value
      >
        {{ formatScore(points) }}
      </p>
      <p v-if="active" class="stage__who" :style="{ '--team': `var(${teamColor(active.color).cssVar})` }">
        <span class="stage__who-badge">{{ teamBadge(game.activeTeamIndex) }}</span>
        <strong>{{ active.name }}</strong>
      </p>
    </div>

    <!-- Časomíra patří nad otázku, stejně jako v kvízu: místnost čte
         otázku a ubývající čas má mít v témže pohledu. Pás si drží výšku
         i po odhalení, aby otázka pod ním nepoposkočila. -->
    <div v-if="game.rules.timerSeconds > 0" class="stage__time">
      <TimerBar
        v-if="!revealed"
        :seconds="game.rules.timerSeconds"
        :elapsed-ms="elapsedMs"
        running
        @expired="timedOut = true"
      />
    </div>

    <div ref="body" class="stage__body">
      <p class="stage__prompt">{{ question.prompt }}</p>

      <Transition name="curtain">
        <div v-if="revealed" class="stage__answerWrap">
          <p class="stage__answerLabel">Správná odpověď</p>
          <p class="stage__answer">{{ question.answer }}</p>
        </div>
      </Transition>
    </div>

    <footer class="stage__foot">
      <!-- Fáze otázky: běží čas, odpověď je schovaná ---------------------- -->
      <template v-if="!revealed">
        <UiButton variant="brand" size="xl" @click="reveal">Zobrazit odpověď</UiButton>
        <!-- Konec času je na jednom řádku s nápovědou, ne navíc pod
             časomírou: řádek navíc by posunul otázku nad patičkou
             a ta je změřená na jednu obrazovku. -->
        <p v-if="timedOut" class="stage__timeout">Čas vypršel. Zobraz odpověď a vyhodnoť.</p>
        <p v-else class="stage__hint">Mezerník zobrazí odpověď, Esc zavře políčko bez bodování.</p>
      </template>

      <!-- Fáze vyhodnocení ------------------------------------------------ -->
      <template v-else>
        <p class="stage__question">
          Odpověděl <strong :style="{ color: active ? `var(${teamColor(active.color).cssVar})` : undefined }">
            {{ active?.name }}
          </strong> správně?
        </p>

        <div class="judge">
          <button type="button" class="judge__btn judge__btn--yes" @click="resolve(active?.id ?? null)">
            <span class="judge__key">Mezerník</span>
            <span class="judge__label">Správně</span>
            <span class="judge__points">+{{ formatScore(points) }}</span>
          </button>
          <button type="button" class="judge__btn judge__btn--no" @click="resolve(null)">
            <span class="judge__key">N</span>
            <span class="judge__label">Špatně</span>
            <span class="judge__points">
              {{ game.rules.penalty || isWager ? `-${formatScore(points)}` : 'bez bodů' }}
            </span>
          </button>
        </div>

        <div v-if="canSteal" class="steal">
          <button
            v-if="!stealOpen"
            type="button"
            class="steal__toggle"
            @click="stealOpen = true"
          >
            Body přiznat jinému týmu
          </button>
          <div v-else class="steal__list">
            <span class="steal__label">Uhodl jiný tým:</span>
            <button
              v-for="t in others"
              :key="t.id"
              type="button"
              class="steal__chip"
              :style="{ '--team': `var(${teamColor(t.color).cssVar})` }"
              @click="resolve(t.id)"
            >
              <span class="steal__badge">{{ teamBadge(game.teams.findIndex((x) => x.id === t.id)) }}</span>
              {{ t.name }}
            </button>
            <button type="button" class="steal__cancel" @click="stealOpen = false">Zpět</button>
          </div>
        </div>
      </template>
    </footer>
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  z-index: var(--z-stage);
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  background:
    radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--c-brand) 7%, transparent), transparent 70%),
    linear-gradient(180deg, var(--c-surface) 0%, var(--c-abyss) 100%);
  will-change: transform, opacity;
}

/* Časomíra ---------------------------------------------------------------- */
.stage__time {
  display: flex;
  align-items: center;
  min-height: var(--stage-timer-h);
  padding-inline: var(--sp-6);
}

/* Hlavička ---------------------------------------------------------------- */
.stage__head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-6);
  border-bottom: 1px solid var(--c-line-soft);
}
.stage__id { display: flex; align-items: center; gap: var(--sp-3); flex: 1; min-width: 0; }
.stage__cat {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-text-muted);
}
.stage__wagerTag {
  padding: 2px var(--sp-3);
  border-radius: var(--r-full);
  background: linear-gradient(180deg, var(--c-spark) 0%, var(--c-spark-mid) 100%);
  color: var(--c-text-ink);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  box-shadow: 0 0 18px -2px var(--c-spark-glow);
  animation: sparkle 2.4s var(--ease-both) infinite;
}
@keyframes sparkle {
  0%, 100% { box-shadow: 0 0 14px -4px var(--c-spark-glow); }
  50% { box-shadow: 0 0 26px 0 var(--c-spark-glow); }
}
@media (prefers-reduced-motion: reduce) {
  .stage__wagerTag { animation: none; }
}
:deep(.stage__close) { color: var(--c-text-faint); }

/* Hodnota + tým na tahu --------------------------------------------------- */
.stage__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4) var(--sp-7);
  padding: var(--sp-4) var(--sp-6);
  border-bottom: 1px solid var(--c-line-soft);
  background: color-mix(in oklab, var(--c-brand-wash) 70%, transparent);
}
.stage__value {
  font-family: var(--font-display);
  font-size: clamp(var(--fs-3xl), 1.2rem + 5vw, 5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--c-brand);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 40px var(--c-brand-glow);
}
.stage__value--wager {
  color: var(--c-spark);
  text-shadow: 0 0 40px var(--c-spark-glow);
}
.stage__who {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-5) var(--sp-3) var(--sp-3);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--team) 16%, transparent);
  border: 1px solid color-mix(in oklab, var(--team) 40%, transparent);
}
.stage__who-badge {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-lg);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--team) 40%, black);
}
.stage__who strong {
  font-size: var(--fs-xl);
  font-weight: 800;
  color: var(--c-text);
}

/* Tělo -------------------------------------------------------------------- */
.stage__body {
  /* --fit zmenšuje otázku i odpověď najednou. Nastavuje ho fitToScreen().
     Šířka se dělí toutéž mírou, takže menší písmo dostane delší řádek,
     místo aby se text lámal do úzkého sloupce. */
  --fit: 1;

  display: grid;
  align-content: center;
  justify-items: center;
  gap: clamp(var(--sp-4), 4vh, var(--sp-6));
  padding: var(--sp-5) var(--sp-6);
  text-align: center;
  min-height: 0;
  overflow-y: auto;
}
.stage__prompt {
  max-width: min(100%, calc(24ch / var(--fit)));
  font-family: var(--font-display);
  font-size: calc(var(--fs-prompt) * var(--fit));
  font-weight: 700;
  line-height: var(--lh-tight);
  letter-spacing: -0.02em;
  text-wrap: balance;
  animation: rise var(--dur-slow) var(--ease-out) 120ms both;
}

.stage__answerWrap {
  display: grid;
  gap: var(--sp-2);
  justify-items: center;
  width: fit-content;
  max-width: min(100%, calc(46ch / var(--fit)));
  padding: clamp(var(--sp-3), 2.5vh, var(--sp-5)) var(--sp-6);
  border: 1px solid color-mix(in oklab, var(--c-ok) 40%, transparent);
  border-radius: var(--r-xl);
  background: color-mix(in oklab, var(--c-ok) 9%, var(--c-abyss));
}
.stage__answerLabel {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-ok);
}
.stage__answer {
  /* Odpověď smí být širší než otázka. Když se láme do úzkého sloupce,
     roste do výšky a přestane se vejít. */
  max-width: min(100%, calc(38ch / var(--fit)));
  font-family: var(--font-display);
  font-size: calc(var(--fs-answer) * var(--fit));
  font-weight: 700;
  line-height: var(--lh-snug);
  text-wrap: pretty;
}

/* Patička ----------------------------------------------------------------- */
.stage__foot {
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-6) var(--sp-6);
  border-top: 1px solid var(--c-line-soft);
  background: color-mix(in oklab, var(--c-abyss) 55%, transparent);
}
/* Konec času nese stejný řádek jako nápověda, tedy i stejnou velikost:
   jiná by patičku o pár pixelů posunula a otázka nad ní je změřená. */
.stage__timeout {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--c-bad);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: var(--fs-sm);
  text-align: center;
}
/* Co udělá další stisk. Dřív to bylo nejmenší a nejsvětlejší písmo na
   plátně, tedy jediná informace, kterou moderátorka opravdu potřebuje,
   sázená tak, aby ji z druhé řady nikdo nepřečetl. */
.stage__hint { font-size: var(--fs-sm); color: var(--c-text-muted); }
.stage__question { font-size: var(--fs-lg); color: var(--c-text-muted); }
.stage__question strong { font-weight: 700; }

.judge {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
  width: min(100%, 44rem);
}
.judge__btn {
  display: grid;
  gap: var(--sp-1);
  justify-items: center;
  padding: var(--sp-5) var(--sp-4);
  border: 2px solid;
  border-radius: var(--r-lg);
  background: var(--c-surface);
  color: var(--c-text);
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.judge__btn:hover { transform: translateY(-2px); }
.judge__btn:active { transform: translateY(0) scale(0.99); }
.judge__btn--yes { border-color: color-mix(in oklab, var(--c-ok) 65%, transparent); }
.judge__btn--yes:hover { background: color-mix(in oklab, var(--c-ok) 16%, var(--c-surface)); }
.judge__btn--no { border-color: color-mix(in oklab, var(--c-bad) 55%, transparent); }
.judge__btn--no:hover { background: color-mix(in oklab, var(--c-bad) 14%, var(--c-surface)); }

.judge__key {
  padding: 1px var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-sm);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-text-faint);
}
.judge__label {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  line-height: 1;
}
.judge__btn--yes .judge__label { color: var(--c-ok); }
.judge__btn--no .judge__label { color: var(--c-bad); }
.judge__points { font-size: var(--fs-sm); color: var(--c-text-faint); font-variant-numeric: tabular-nums; }

.steal { min-height: 2.25rem; display: grid; place-items: center; }
.steal__toggle {
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-sm);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  padding: var(--sp-2);
}
.steal__toggle:hover { color: var(--c-text); }
.steal__list { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--sp-2); }
.steal__label { font-size: var(--fs-sm); color: var(--c-text-faint); }
.steal__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4) var(--sp-2) var(--sp-2);
  border: 1px solid color-mix(in oklab, var(--team) 55%, transparent);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--team) 12%, transparent);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.steal__chip:hover { background: color-mix(in oklab, var(--team) 26%, transparent); }
.steal__badge {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--r-full);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 0.75rem;
}
.steal__cancel {
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-sm);
  text-decoration: underline;
  text-underline-offset: 0.25em;
}

/* Odhalení odpovědi: setření závěsem ------------------------------------- */
.curtain-enter-active { transition: clip-path var(--dur-reveal) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
.curtain-enter-from { clip-path: inset(0 0 100% 0); opacity: 0; }
.curtain-enter-to { clip-path: inset(0 0 0 0); opacity: 1; }

/* Nástup se zvětšuje do místa. Posun dolů by při měření vyčníval pod
   okraj, fitToScreen by ho přečetl jako přetečení a zmenšil otázku na
   minimum, ze kterého se sama nevrátí. */
@keyframes rise {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .stage__prompt { animation: none; }
}

@media (max-width: 720px) {
  .judge { grid-template-columns: 1fr; gap: var(--sp-3); }
  .stage__head { padding-inline: var(--sp-4); }
}

@media (pointer: coarse) {
  .steal__toggle { min-height: 2.75rem; }
  .steal__chip { min-height: 2.75rem; }
  .steal__cancel { min-height: 2.75rem; padding-inline: var(--sp-3); }
}
</style>
