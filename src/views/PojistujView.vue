<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { GameSetup as Setup, Pack } from '@/types'
import AppHeader from '@/components/AppHeader.vue'
import GameSetup from '@/games/pojistuj/components/GameSetup.vue'
import GameBoard from '@/games/pojistuj/components/GameBoard.vue'
import QuestionStage from '@/games/pojistuj/components/QuestionStage.vue'
import WagerDialog from '@/games/pojistuj/components/WagerDialog.vue'
import ResultsScreen from '@/games/pojistuj/components/ResultsScreen.vue'
import PlayBar from '@/games/pojistuj/components/PlayBar.vue'
import {
  activeTeam,
  backToBoard,
  canUndo,
  cancelQuestion,
  endGame,
  game,
  isWagerCell,
  maxWager,
  openQuestion,
  remainingCells,
  rematch,
  resolveQuestion,
  revealAnswer,
  selectCell,
  setWager,
  showResults,
  startGame,
  undo,
} from '@/stores/game'
import { confirmAction, toast } from '@/stores/ui'
import { flyTo } from '@/lib/motion'
import { teamColor, formatScore } from '@/lib/teams'
import { settings } from '@/stores/settings'
import { plural } from '@/lib/format'

/** Obdélník dlaždice, ze které se otázka roztahuje. */
const origin = ref<DOMRect | null>(null)
/** Políčko Nepojištěno! čeká na potvrzení sázky. */
const pendingWager = ref<string | null>(null)

const openCategoryName = computed(() => {
  const g = game.value
  if (!g?.openCell) return ''
  const catId = g.openCell.split(':')[0]
  return g.categories.find((c) => c.id === catId)?.name ?? ''
})

const openPoints = computed(() => {
  const g = game.value
  if (!g?.openCell) return 0
  return g.wager !== null ? g.wager : Number(g.openCell.split(':')[1])
})

const openIsWager = computed(() => game.value?.wager !== null)

function onStart(pack: Pack, setup: Setup) {
  startGame(pack, setup)
}

function onOpenCell(key: string, el: HTMLElement) {
  origin.value = el.getBoundingClientRect()
  if (isWagerCell(key)) {
    pendingWager.value = key
    return
  }
  selectCell(key)
}

function confirmWager(amount: number) {
  const key = pendingWager.value
  pendingWager.value = null
  if (!key) return
  selectCell(key)
  setWager(amount)
}

function cancelWager() {
  pendingWager.value = null
  origin.value = null
}

function onResolve(teamId: string | null) {
  const g = game.value
  if (!g) return

  // Hodnotu i výchozí bod letu je nutné změřit ještě před vyhodnocením,
  // protože obrazovka s otázkou hned zmizí.
  const points = openPoints.value
  const from = document.querySelector<HTMLElement>('[data-stage-value]')?.getBoundingClientRect() ?? null
  const team = teamId ? g.teams.find((t) => t.id === teamId) : undefined
  const hex = team ? teamColor(team.color).hex : ''

  resolveQuestion(teamId)
  origin.value = null

  if (team && from) {
    void nextTick(() => {
      const card = document.querySelector<HTMLElement>(`[data-team-id="${team.id}"]`)
      if (card) void flyTo(from, card.getBoundingClientRect(), `+${formatScore(points)}`, hex)
    })
  }
}

function onCancelQuestion() {
  cancelQuestion()
  origin.value = null
}

function onUndo() {
  undo()
  toast('Poslední bodování vráceno.', 'info')
}

async function onEnd() {
  const ok = await confirmAction({
    title: 'Ukončit hru',
    text: 'Rozehraná hra se smaže včetně skóre. Tuhle akci nejde vrátit.',
    confirmLabel: 'Ukončit hru',
    danger: true,
  })
  if (ok) endGame()
}

async function onAgain() {
  const ok = await confirmAction({
    title: 'Nová hra',
    text: 'Výsledky současné hry se zahodí a vrátíš se k nastavení.',
    confirmLabel: 'Založit novou',
  })
  if (ok) endGame()
}

async function onRematch() {
  const ok = await confirmAction({
    title: 'Stejné týmy znovu',
    text: 'Skóre se vynuluje a deska se rozdá znovu. Týmy, kategorie i pravidla zůstanou.',
    confirmLabel: 'Hrát znovu',
  })
  if (ok) rematch()
}
</script>

<template>
  <div class="pojistuj" :class="{ 'pojistuj--playing': !!game }">
    <!-- Bez rozehrané hry nabídneme nastavení ---------------------------- -->
    <template v-if="!game">
      <AppHeader />
      <GameSetup @start="onStart" />
    </template>

    <template v-else>
      <PlayBar
        :can-undo="canUndo"
        :steal="game.rules.steal"
        @undo="onUndo"
        @results="showResults"
        @end="onEnd"
      />

      <!-- Herní plocha. Jen tady platí nastavení velikosti písma, protože
           tohle je to, co se promítá na plátno. -->
      <div class="surface game-surface" :style="{ '--scale': String(settings.scale) }">
        <p class="status">
          <span>{{ game.packName }}</span>
          <span aria-hidden="true">&middot;</span>
          <span>zbývá {{ remainingCells }} z {{ Object.keys(game.cells).length }} {{ plural(Object.keys(game.cells).length, 'políčka', 'políček', 'políček') }}</span>
        </p>

        <GameBoard :game="game" @open="onOpenCell" />

        <!-- Pole Nepojištěno, nejdřív sázka -------------------------------- -->
        <WagerDialog
        v-if="pendingWager && activeTeam"
        :team="activeTeam"
        :team-index="game.activeTeamIndex"
        :max="maxWager()"
        :base="Number(pendingWager.split(':')[1])"
        @confirm="confirmWager"
        @cancel="cancelWager"
      />

        <!-- Otázka a vyhodnocení ---------------------------------------- -->
        <QuestionStage
        v-if="openQuestion && (game.phase === 'question' || game.phase === 'reveal')"
        :key="game.openCell ?? ''"
        :game="game"
        :question="openQuestion"
        :category-name="openCategoryName"
        :points="openPoints"
        :is-wager="openIsWager"
        :origin="origin"
        @reveal="revealAnswer"
        @resolve="onResolve"
        @cancel="onCancelQuestion"
      />

        <!-- Výsledky ----------------------------------------------------- -->
        <Teleport to="body">
          <Transition name="fade">
            <div v-if="game.phase === 'results'" class="results-layer">
              <ResultsScreen :game="game" @again="onAgain" @rematch="onRematch" @board="backToBoard" />
            </div>
          </Transition>
        </Teleport>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pojistuj { min-height: 100dvh; display: flex; flex-direction: column; }

/* Rozehraná hra drží celou desku na jedné obrazovce. */
.pojistuj--playing { height: 100dvh; overflow: hidden; }

.surface { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.pojistuj--playing .surface :deep(.board) { flex: 1; min-height: 0; }

@media (max-height: 560px), (max-width: 560px) {
  .pojistuj--playing { height: auto; overflow: visible; }
}

.status {
  display: flex;
  gap: var(--sp-2);
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 var(--sp-5) var(--sp-4);
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  letter-spacing: 0.02em;
}

.results-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-results);
  overflow-y: auto;
  background: linear-gradient(180deg, var(--c-surface) 0%, var(--c-abyss) 100%);
}

.fade-enter-active, .fade-leave-active { transition: opacity var(--dur-slow) var(--ease-out); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
