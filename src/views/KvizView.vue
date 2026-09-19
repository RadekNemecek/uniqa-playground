<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import PresentationBar from '@/components/PresentationBar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import HostSetup from '@/games/kviz/components/HostSetup.vue'
import HostLobby from '@/games/kviz/components/HostLobby.vue'
import HostFinal from '@/games/kviz/components/HostFinal.vue'
import HostReport from '@/games/kviz/components/HostReport.vue'
import HostRoster from '@/games/kviz/components/HostRoster.vue'
import QuizStage from '@/games/kviz/components/QuizStage.vue'
import type { QuizPack, QuizSetup } from '@/games/kviz/types'
import {
  advance,
  answeredNow,
  attachSession,
  choiceCounts,
  currentQuestion,
  dropPhones,
  endQuiz,
  hasQuiz,
  kickPlayer,
  offline,
  players,
  preRollMs,
  quiz,
  revealAnswer,
  rematchQuiz,
  renamePlayer,
  report,
  reportSaved,
  retrySaveReport,
  standings,
  startQuiz,
} from '@/stores/quizHost'
import { initQuizPacks, quizPacks } from '@/stores/quizPacks'
import { settings } from '@/stores/settings'
import { confirmAction, toast } from '@/stores/ui'
import { downloadReport } from '@/games/kviz/report'

const playing = computed(() => hasQuiz.value && quiz.value?.phase !== 'final')

/** Vyhodnocení se otevře přes vyhlášení, ne místo něj. */
const reportOpen = ref(false)
const withPhones = computed(() => quiz.value?.code !== null && quiz.value?.code !== undefined)

/** Rozložení voleb se ukazuje až po zamčení. */
const counts = computed(() => {
  const phase = quiz.value?.phase
  if (!withPhones.value || (phase !== 'locked' && phase !== 'reveal')) return null
  return choiceCounts.value
})

// Když odpověděli všichni připojení hráči, není na co čekat a odhalí se
// rovnou správná možnost. Je to stejné vyústění jako po vypršení limitu,
// jen dřív: hlasování je uzavřené tak jako tak a čekat na mezerník by
// jen drželo místnost u obrazovky, která už nic nového neřekne.
// Na další otázku automatika nepostoupí, tu pouští vždy moderátorka.
watch(
  [() => quiz.value?.phase, answeredNow, () => players.value.length, () => quiz.value?.index],
  ([phase, answered, total]) => {
    if (phase === 'question' && total > 0 && answered >= total) void revealAnswer()
  },
)

async function onStart(list: QuizPack[], setup: QuizSetup): Promise<void> {
  try {
    const state = await startQuiz(list, setup)
    if (setup.withPhones && !state.code) {
      toast('Sdílená databáze není dostupná, kvíz poběží bez telefonů.', 'bad', 6000)
    }
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Kvíz se nepodařilo spustit.', 'bad')
  }
}

function onDownload(): void {
  if (report.value) downloadReport(report.value)
}

async function onRetrySave(): Promise<void> {
  const ok = await retrySaveReport()
  toast(
    ok ? 'Vyhodnocení je uložené.' : 'Pořád se to nepovedlo. Stáhni si tabulku.',
    ok ? 'ok' : 'bad',
  )
}

async function onEnd(): Promise<void> {
  const live = withPhones.value
  const ok = await confirmAction({
    title: 'Ukončit kvíz',
    text: live
      ? 'Hra se zavře, telefony se odpojí a odpovědi se z databáze uklidí.'
      : 'Rozehraný kvíz se zavře a vrátíš se na přípravu.',
    confirmLabel: 'Ukončit',
    danger: true,
  })
  if (ok) await endQuiz(live)
}

async function onDropPhones(): Promise<void> {
  const ok = await confirmAction({
    title: 'Dohrát bez telefonů',
    text: 'Kvíz dojede jako promítaná hra. Body za zbytek hry se už nepočítají, řekni to hráčům.',
    confirmLabel: 'Dohrát bez telefonů',
  })
  if (ok) dropPhones()
}

/**
 * Mezerník vede hru, stejná ruka jako u Pojišťuj!. Moderátorka nesáhne
 * na myš a nemusí se učit nic nového.
 */
function onKey(e: KeyboardEvent): void {
  if (!hasQuiz.value) return
  const target = e.target as HTMLElement | null
  // Uvnitř tlačítka nebo pole má klávesa svůj vlastní význam.
  if (target && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

  // Escape tu schválně hru neukončuje. Z celé obrazovky se odchází taky
  // Escapem, takže moderátorce, která chtěla jen ven z fullscreenu,
  // vyskakoval dialog „Ukončit kvíz" uprostřed běžícího školení.
  // Ukončit jde tlačítkem v pásu, a to je na nevratný krok akorát.
  // Mezerník hlásí různé prohlížeče různě, proto i e.code.
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    advance()
  }
}

/** Nápověda z běžící otázky. Ostatní fáze si ji řeknou samy níž. */
const stageHint = ref('')

const barHint = computed(() => {
  const q = quiz.value
  if (!q) return ''
  switch (q.phase) {
    case 'lobby':
      return players.value.length > 0
        ? 'Mezerník spustí první otázku'
        : 'Čeká se na první telefony'
    case 'final':
      return ''
    default:
      return stageHint.value
  }
})

const rosterOpen = ref(false)

const isFullscreen = ref(false)

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* prohlížeč to nemusí povolit */
  }
}

/* Stav se čte z prohlížeče, ne z vlastního přepínače: z celé obrazovky se
   odchází i Escapem a F11. */
function syncFullscreen() {
  isFullscreen.value = document.fullscreenElement !== null
}

onMounted(() => {
  void initQuizPacks()
  syncFullscreen()
  document.addEventListener('fullscreenchange', syncFullscreen)
  // Po obnovení stránky se listenery musí nasadit znovu, jinak by
  // moderátorka koukala na prázdnou soupisku běžící hry.
  void attachSession()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', syncFullscreen)
})
</script>

<template>
  <div class="kviz" :class="{ 'kviz--playing': playing }">
    <!-- Hlavička aplikace patří do přípravy, ne na projektor. Jakmile hra
         běží, zůstane nad plátnem jen moderátorský pás. -->
    <template v-if="!hasQuiz">
      <AppHeader game="kviz" section="play" />
      <HostSetup @start="onStart" />
    </template>

    <template v-else-if="quiz">
      <PresentationBar title="Na kolik to dáš?" :hint="barHint">
        <template #tools>
          <UiButton
            v-if="withPhones && quiz.phase !== 'final'"
            size="sm"
            variant="quiet"
            @click="rosterOpen = true"
          >
            Hráči ({{ players.length }})
          </UiButton>
          <UiIconButton
            :icon="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"
            :label="isFullscreen ? 'Opustit celou obrazovku' : 'Celá obrazovka'"
            :pressed="isFullscreen"
            size="sm"
            @click="toggleFullscreen"
          />
          <UiButton v-if="quiz.phase !== 'final'" size="sm" variant="quiet" @click="onEnd">
            Ukončit kvíz
          </UiButton>
        </template>
      </PresentationBar>

      <!-- Bez spojení telefony zamrznou na poslední doručené fázi. Zneužít
           se to nedá, pozdní odpovědi odmítne server, ale moderátorka to
           musí vědět dřív, než se začne divit.

           Pás stojí mimo tok. Kdyby se vsunul nad herní plochu, posunul
           by obsah, který je změřený na jednu obrazovku, a přeměřit se
           nedá: `fitToScreen()` měří jednou na začátku otázky. -->
      <p v-if="offline && withPhones" class="warn" role="status">
        Bez spojení. Telefony nevidí, co se na plátně děje.
        <button type="button" @click="onDropPhones">Dohrát bez telefonů</button>
      </p>

      <!-- Herní plocha. Jen tady platí nastavení velikosti písma, protože
           tohle je to, co se promítá na plátno. -->
      <main id="obsah" class="surface game-surface" :style="{ '--scale': String(settings.scale) }">
        <HostLobby
          v-if="quiz.phase === 'lobby' && quiz.code"
          :code="quiz.code"
          :players="players"
          :total="quiz.questions.length"
          @start="advance"
          @kick="kickPlayer"
          @rename="renamePlayer"
        />

        <QuizStage
          v-else-if="currentQuestion && quiz.phase !== 'final'"
          :question="currentQuestion"
          :phase="quiz.phase"
          :index="quiz.index"
          :total="quiz.questions.length"
          :limit-seconds="quiz.setup.limitSeconds"
          :pre-roll-ms="preRollMs"
          :asked-at="quiz.askedAt"
          :answered="answeredNow"
          :players="players.length"
          :counts="counts"
          @expired="revealAnswer"
          @hint="stageHint = $event"
        />

        <HostReport
          v-else-if="reportOpen && report"
          :report="report"
          @close="reportOpen = false"
          @download="onDownload"
        />

        <HostFinal
          v-else
          :standings="standings"
          :round="quiz.round"
          :question-count="quiz.questions.length"
          :has-report="report !== null"
          :report-saved="reportSaved"
          @again="rematchQuiz(quizPacks.packs)"
          @report="reportOpen = true"
          @download="onDownload"
          @retry-save="onRetrySave"
          @end="onEnd"
        />
      </main>

      <!-- Přejmenovat a vyhodit musí jít i za běhu, ne jen v čekárně. -->
      <HostRoster
        :open="rosterOpen"
        :players="players"
        @close="rosterOpen = false"
        @kick="kickPlayer"
        @rename="renamePlayer"
      />
    </template>
  </div>
</template>

<style scoped>
.kviz { min-height: 100dvh; display: flex; flex-direction: column; }

/* Běžící kvíz drží otázku i možnosti na jedné obrazovce. */
.kviz--playing { height: 100dvh; overflow: hidden; }

.surface { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.surface > * { flex: 1; min-height: 0; }

@media (max-height: 560px), (max-width: 560px) {
  .kviz--playing { height: auto; overflow: visible; }
}

.warn {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: var(--z-alert);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-2) var(--sp-4);
  background: var(--c-bad-deep);
  color: var(--c-text);
  font-size: var(--fs-sm);
  font-weight: 600;
  text-align: center;
}
.warn button {
  border: var(--border-w) solid var(--c-text);
  border-radius: var(--r-md);
  padding: var(--sp-1) var(--sp-3);
  background: transparent;
  color: var(--c-text);
  font-weight: 700;
}



@media (pointer: coarse) {
  .warn button { min-height: var(--control-touch); }
}
</style>
