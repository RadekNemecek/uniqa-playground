<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import HostSetup from '@/games/kviz/components/HostSetup.vue'
import HostLobby from '@/games/kviz/components/HostLobby.vue'
import HostScores from '@/games/kviz/components/HostScores.vue'
import HostFinal from '@/games/kviz/components/HostFinal.vue'
import HostReport from '@/games/kviz/components/HostReport.vue'
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
  lockAnswers,
  offline,
  players,
  preRollMs,
  quiz,
  revealAnswer,
  rematchQuiz,
  renamePlayer,
  report,
  reportSaved,
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

// Když odpověděli všichni připojení hráči, není na co čekat. Odpovídání
// se samo zamkne, ale správnou možnost pořád odhalí až moderátorka
// mezerníkem, aby stihla pracovat s místností.
watch(
  [() => quiz.value?.phase, answeredNow, () => players.value.length, () => quiz.value?.index],
  ([phase, answered, total]) => {
    if (phase === 'question' && total > 0 && answered >= total) void lockAnswers()
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

  if (e.key === 'Escape') {
    e.preventDefault()
    void onEnd()
    return
  }
  // Mezerník hlásí různé prohlížeče různě, proto i e.code.
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    advance()
  }
}

onMounted(() => {
  void initQuizPacks()
  // Po obnovení stránky se listenery musí nasadit znovu, jinak by
  // moderátorka koukala na prázdnou soupisku běžící hry.
  void attachSession()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="kviz" :class="{ 'kviz--playing': playing }">
    <AppHeader game="kviz" section="play" />

    <template v-if="!hasQuiz">
      <HostSetup @start="onStart" />
    </template>

    <template v-else-if="quiz">
      <!-- Bez spojení telefony zamrznou na poslední doručené fázi. Zneužít
           se to nedá, pozdní odpovědi odmítne server, ale moderátorka to
           musí vědět dřív, než se začne divit. -->
      <p v-if="offline && withPhones" class="warn">
        Bez spojení. Telefony nevidí, co se na plátně děje.
        <button type="button" @click="onDropPhones">Dohrát bez telefonů</button>
      </p>

      <!-- Herní plocha. Jen tady platí nastavení velikosti písma, protože
           tohle je to, co se promítá na plátno. -->
      <div class="surface game-surface" :style="{ '--scale': String(settings.scale) }">
        <HostLobby
          v-if="quiz.phase === 'lobby' && quiz.code"
          :code="quiz.code"
          :players="players"
          :total="quiz.questions.length"
          @start="advance"
          @kick="kickPlayer"
          @rename="renamePlayer"
        />

        <HostScores
          v-else-if="quiz.phase === 'scores'"
          :standings="standings"
          :index="quiz.index"
          :total="quiz.questions.length"
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
          @end="onEnd"
        />
      </div>

      <button v-if="quiz.phase !== 'final'" type="button" class="bail" @click="onEnd">Ukončit kvíz</button>
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
}
.warn button {
  border: 1px solid var(--c-text);
  border-radius: var(--r-md);
  padding: var(--sp-1) var(--sp-3);
  background: transparent;
  color: var(--c-text);
  font-weight: 700;
}


.bail {
  align-self: center;
  margin-bottom: var(--sp-3);
  padding: var(--sp-2) var(--sp-4);
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
}
.bail:hover { color: var(--c-text-muted); }

@media (pointer: coarse) {
  .bail { min-height: 44px; }
  .warn button { min-height: 44px; }
}
</style>
