<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { GameState, Team } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { confetti } from '@/lib/confetti'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'
import { count } from '@/lib/format'
import { duration, prefersReducedMotion } from '@/lib/motion'
import { buildRun, saveRun } from '@/games/pojistuj/runLog'

const props = defineProps<{ game: GameState; canUndo?: boolean }>()
const emit = defineEmits<{ again: []; rematch: []; board: []; undo: [] }>()

/**
 * Oslava se pouští jednou za hru.
 *
 * Stav hry přežívá obnovení stránky, takže F5 na výsledcích znovu
 * vystřelilo konfety a pustilo fanfáru. Před sálem to vypadá, že to někdo
 * omylem spustil podruhé. Klíč nese id hry, aby další hra slavila znovu.
 */
const CELEBRATED_KEY = 'playground.celebrated.v1'

function alreadyCelebrated(): boolean {
  try {
    return localStorage.getItem(CELEBRATED_KEY) === props.game.id
  } catch {
    return false
  }
}

function markCelebrated(): void {
  try {
    localStorage.setItem(CELEBRATED_KEY, props.game.id)
  } catch {
    /* Soukromé okno nebo zakázané úložiště. Oslava se prostě zopakuje. */
  }
}

const fx = ref<HTMLElement | null>(null)

const ranked = computed(() => [...props.game.teams].sort((a, b) => b.score - a.score))
const top = computed(() => ranked.value[0]?.score ?? 0)
const winners = computed(() => ranked.value.filter((t) => t.score === top.value))
const isTie = computed(() => winners.value.length > 1)

function teamIndex(t: Team): number {
  return props.game.teams.findIndex((x) => x.id === t.id)
}

function placeOf(t: Team): number {
  return ranked.value.findIndex((x) => x.score === t.score) + 1
}

/**
 * Sloupce pojištěno / nepojištěno: počítají se otázky, ne body.
 * Pojištěno = tým uhodl. Nepojištěno = tým byl na tahu a neuhodl
 * (včetně přebrání jiným týmem).
 */
interface CoverRow {
  team: Team
  insured: number
  uninsured: number
  insuredPct: number
  uninsuredPct: number
  place: number
}

const coverage = computed((): CoverRow[] => {
  const byRank = ranked.value.map((team) => {
    let insured = 0
    let uninsured = 0
    for (const cell of Object.values(props.game.cells)) {
      if (cell.status === 'won' && cell.teamId === team.id) insured += 1
      if (cell.failedByTeamId === team.id) uninsured += 1
    }
    return { team, insured, uninsured, place: placeOf(team) }
  })

  const peak = Math.max(1, ...byRank.map((r) => Math.max(r.insured, r.uninsured)))
  return byRank.map((r) => ({
    ...r,
    insuredPct: (r.insured / peak) * 100,
    uninsuredPct: (r.uninsured / peak) * 100,
  }))
})

const coverageById = computed(() => {
  const map = new Map<string, CoverRow>()
  for (const row of coverage.value) map.set(row.team.id, row)
  return map
})

/**
 * Stupně: při jasném vítězi řada 2. | 1. | 3.
 * Při remíze stejně velké bloky vítězů; zbytek pod nimi.
 */
const podium = computed(() => {
  if (isTie.value) {
    return winners.value.map((team) => coverageById.value.get(team.id)!).filter(Boolean)
  }
  const first = coverage.value[0]
  const second = coverage.value[1]
  const third = coverage.value[2]
  const slots: CoverRow[] = []
  if (second) slots.push(second)
  if (first) slots.push(first)
  if (third) slots.push(third)
  return slots
})

const rest = computed(() => {
  if (isTie.value) {
    return coverage.value.filter((r) => r.team.score !== top.value)
  }
  return coverage.value.slice(3)
})

const coverageTotal = computed(() =>
  coverage.value.reduce((sum, r) => sum + r.uninsured, 0),
)

function isChampion(row: CoverRow): boolean {
  return row.team.score === top.value
}

/**
 * Pořadí růstu stupňů: nejdřív nižší místa, vítěz naposledy.
 * Remíza: zleva doprava.
 */
function riseOrder(row: CoverRow, index: number): number {
  if (isTie.value) return index
  return Math.max(0, 3 - row.place)
}

/** Čekání na dorostení stupňů, pak teprve konfety. */
let celebrateTimer = 0

function fireCelebration(): void {
  if (alreadyCelebrated()) return
  markCelebrated()
  const colors = winners.value.map((t) => teamColor(t.color).hex)
  confetti(colors, fx.value ?? undefined)
  if (settings.sound) sfx.fanfare()
}

onMounted(async () => {
  // Zápis do archivu. Dřív hra skončila a nezůstalo po ní nic, přestože
  // právě výsledek je to, co se ukazuje dál.
  saveRun(buildRun(props.game, props.game.groupName))

  await nextTick()

  if (prefersReducedMotion()) {
    fireCelebration()
    return
  }

  // Stejný vzorec jako u .slot__riser: base + max(rise) × slow + count + pauza.
  const lastRise = Math.max(0, ...podium.value.map((row, i) => riseOrder(row, i)))
  const wait =
    duration('--dur-base') +
    lastRise * duration('--dur-slow') +
    duration('--dur-count') +
    duration('--dur-base')
  celebrateTimer = window.setTimeout(fireCelebration, wait)
})

onUnmounted(() => {
  window.clearTimeout(celebrateTimer)
})
</script>

<template>
  <div class="results">
    <div ref="fx" class="results__fx" aria-hidden="true"></div>

    <div class="results__content">
      <p class="results__cheer">
        <template v-if="!isTie">Gratulujeme!</template>
        <template v-else>Těsná hra</template>
      </p>

      <section
        class="podium"
        :class="{ 'podium--tie': isTie, 'podium--duo': !isTie && podium.length === 2 }"
        aria-label="Pořadí"
      >
        <article
          v-for="(row, i) in podium"
          :key="row.team.id"
          class="slot"
          :class="{
            'slot--champ': isChampion(row) && !isTie,
            'slot--second': !isTie && row.place === 2,
            'slot--third': !isTie && row.place === 3,
            'slot--tied': isTie,
          }"
          :style="{
            '--rise': riseOrder(row, i),
            '--team': `var(${teamColor(row.team.color).cssVar})`,
          }"
        >
          <div class="slot__head">
            <p class="slot__place">{{ row.place }}.</p>
            <div class="slot__badge" aria-hidden="true">{{ teamBadge(teamIndex(row.team)) }}</div>
            <h2 class="slot__name">{{ row.team.name }}</h2>
            <p class="slot__score">{{ formatScore(row.team.score) }}</p>
          </div>

          <div class="slot__riser">
            <div
              class="slot__cover"
              role="img"
              :aria-label="
                `${row.team.name}: ${count(row.insured, 'pojištěná otázka', 'pojištěné otázky', 'pojištěných otázek')}, ${count(row.uninsured, 'nepojištěná', 'nepojištěné', 'nepojištěných')}`
              "
            >
              <div class="slot__col">
                <span class="slot__n">{{ row.insured }}</span>
                <span class="slot__bar slot__bar--ok" :style="{ '--h': `${row.insuredPct}%` }" />
              </div>
              <div class="slot__col">
                <span class="slot__n">{{ row.uninsured }}</span>
                <span class="slot__bar slot__bar--bad" :style="{ '--h': `${row.uninsuredPct}%` }" />
              </div>
            </div>
          </div>
        </article>
      </section>

      <div class="results__legend" aria-hidden="true">
        <span class="results__legend-item results__legend-item--ok">Pojištěno</span>
        <span class="results__legend-item results__legend-item--bad">Nepojištěno</span>
      </div>

      <ul v-if="rest.length" class="rest" aria-label="Další pořadí">
        <li
          v-for="(row, i) in rest"
          :key="row.team.id"
          class="rest__item"
          :style="{
            '--i': i,
            '--team': `var(${teamColor(row.team.color).cssVar})`,
          }"
        >
          <span class="rest__place">{{ row.place }}.</span>
          <span class="rest__badge" aria-hidden="true">{{ teamBadge(teamIndex(row.team)) }}</span>
          <span class="rest__name">{{ row.team.name }}</span>
          <span class="rest__score">{{ formatScore(row.team.score) }}</span>
          <span class="rest__cover" aria-hidden="true">
            <span class="rest__chip rest__chip--ok">{{ row.insured }}</span>
            <span class="rest__chip rest__chip--bad">{{ row.uninsured }}</span>
          </span>
        </li>
      </ul>

      <footer class="results__foot">
        <p class="results__meta">
          {{ game.packName }}
          · {{ count(Object.keys(game.cells).length, 'otázka', 'otázky', 'otázek') }}
          <!-- „Nepojištěno" je název stavu políčka, ne počitatelné slovo.
               `count()` je na skloňování; protlačit ho tudy vypsalo na
               plátno „7 Nepojištěno", což se čte jako překlep. -->
          <template v-if="coverageTotal">
            · {{ count(coverageTotal, 'nepojištěné pole', 'nepojištěná pole', 'nepojištěných polí') }}
          </template>
        </p>
        <div class="results__actions">
          <!-- Po poslední otázce se na výsledky skáče automaticky a pás
               s tlačítkem Zpět zůstane pod touhle vrstvou. Bez tohohle
               tlačítka by se poslední špatně přiznaný bod nedal opravit
               jinak než zavřením slavnostní obrazovky před celým sálem. -->
          <UiButton v-if="canUndo" variant="ghost" icon="undo" @click="emit('undo')">
            Vrátit poslední bodování
          </UiButton>
          <UiButton variant="ghost" @click="emit('board')">Zpět na desku</UiButton>
          <UiButton variant="ghost" @click="emit('again')">Jiná sestava</UiButton>
          <UiButton variant="brand" size="lg" @click="emit('rematch')">Stejné týmy znovu</UiButton>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.results {
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  width: 100%;
  background:
    radial-gradient(
      70% 50% at 50% 28%,
      color-mix(in oklab, var(--c-brand) 12%, transparent),
      transparent 70%
    ),
    var(--c-abyss);
}
.results__fx {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.results__content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--sp-5);
  justify-items: center;
  align-content: center;
  min-height: 100dvh;
  width: min(100%, 64rem);
  margin-inline: auto;
  padding: var(--sp-6) var(--sp-5) var(--sp-5);
}

.results__cheer {
  font-family: var(--font-hand);
  font-weight: 500;
  font-size: clamp(var(--fs-2xl), 1rem + 2.2vw, 2.75rem);
  /* Caveat má hluboké spodní tahy (g, y); 1 je ořízne. */
  line-height: 1.15;
  color: var(--c-brand);
  margin: 0;
  animation: fadeUp var(--dur-slow) var(--ease-out) both;
}

/* --- Stupně: sloupy vyrůstají ze země ------------------------------------ */
.podium {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: var(--sp-4) var(--sp-5);
  width: 100%;
  margin-top: var(--sp-3);
}
.podium--tie {
  align-items: flex-end;
}
.podium--duo .slot--champ {
  order: 1;
}
.podium--duo .slot--second {
  order: 0;
}

.slot {
  --rise: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  align-items: end;
  gap: var(--sp-3);
  text-align: center;
  min-width: 0;
  flex: 1 1 10rem;
  max-width: 13rem;
}
.slot--champ {
  flex: 1 1 13rem;
  max-width: 16rem;
}
.slot--tied {
  flex: 1 1 12rem;
  max-width: 15rem;
}

.slot__head {
  display: grid;
  justify-items: center;
  gap: var(--sp-2);
  animation: fadeUp var(--dur-slow) var(--ease-out)
    calc(var(--dur-base) + var(--rise) * var(--dur-slow) + var(--dur-count) * 0.35) both;
}
.slot__place {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.slot--champ .slot__place {
  color: var(--c-text-muted);
}
.slot__badge {
  display: grid;
  place-items: center;
  width: clamp(3.25rem, 2.2rem + 3vw, 4.5rem);
  height: clamp(3.25rem, 2.2rem + 3vw, 4.5rem);
  border-radius: var(--r-lg);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(var(--fs-xl), 1rem + 1.4vw, var(--fs-3xl));
  box-shadow:
    inset 0 2px 0 var(--c-tile-sheen),
    0 4px 0 color-mix(in oklab, var(--team) 40%, black),
    0 16px 32px -12px color-mix(in oklab, var(--team) 45%, transparent);
}
.slot--champ .slot__badge {
  width: clamp(4.5rem, 3rem + 5vw, 7rem);
  height: clamp(4.5rem, 3rem + 5vw, 7rem);
  border-radius: var(--r-xl);
  font-size: clamp(var(--fs-3xl), 1.4rem + 2.8vw, 4rem);
  box-shadow:
    inset 0 2px 0 var(--c-tile-sheen),
    0 8px 0 color-mix(in oklab, var(--team) 40%, black),
    0 28px 56px -14px color-mix(in oklab, var(--team) 50%, transparent);
}
.slot__name {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
  line-height: var(--lh-tight);
  max-width: 10ch;
  text-wrap: balance;
}
.slot--champ .slot__name {
  font-size: clamp(var(--fs-2xl), 1rem + 2vw, 2.75rem);
  max-width: 12ch;
}
.slot__score {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-xl);
  color: var(--c-text);
  line-height: 1;
}
.slot--champ .slot__score {
  font-size: clamp(var(--fs-2xl), 1rem + 2.2vw, 3rem);
  color: var(--c-brand);
  text-shadow: 0 0 36px var(--c-brand-glow);
}

/* Samotný sloup stupně: roste zdola nahoru. */
.slot__riser {
  --riser-h: clamp(4.5rem, 10vh, 6.5rem);
  width: 100%;
  height: var(--riser-h);
  display: grid;
  align-content: end;
  justify-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg) var(--r-lg) var(--r-md) var(--r-md);
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--team) 28%, var(--c-surface-2)),
      color-mix(in oklab, var(--team) 12%, var(--c-surface))
    );
  border: 1px solid color-mix(in oklab, var(--team) 35%, var(--c-line-soft));
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 6px 0 color-mix(in oklab, var(--team) 28%, black),
    0 18px 36px -16px color-mix(in oklab, var(--team) 40%, transparent);
  transform-origin: bottom center;
  animation: riseColumn var(--dur-count) var(--ease-out)
    calc(var(--dur-base) + var(--rise) * var(--dur-slow)) both;
}
.slot--second .slot__riser {
  --riser-h: clamp(6rem, 14vh, 8.5rem);
}
.slot--champ .slot__riser {
  --riser-h: clamp(8.5rem, 20vh, 12rem);
  border-radius: var(--r-xl) var(--r-xl) var(--r-md) var(--r-md);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 8px 0 color-mix(in oklab, var(--team) 32%, black),
    0 28px 48px -16px color-mix(in oklab, var(--team) 45%, transparent);
}
.slot--third .slot__riser {
  --riser-h: clamp(3.75rem, 8vh, 5.25rem);
}
.slot--tied .slot__riser {
  --riser-h: clamp(7rem, 16vh, 10rem);
}

.slot__cover {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
  align-items: end;
  width: 100%;
  max-width: 5.5rem;
  height: clamp(2.75rem, 1.5rem + 5vh, 4.25rem);
}
.slot--champ .slot__cover {
  max-width: 6.25rem;
  height: clamp(3.25rem, 2rem + 6vh, 5rem);
}
.slot__col {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--sp-1);
  height: 100%;
  justify-items: center;
  align-items: end;
}
.slot__n {
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--c-text);
}
.slot__bar {
  --h: 0%;
  width: 100%;
  min-height: 2px;
  height: var(--h);
  border-radius: var(--r-sm) var(--r-sm) 0 0;
  justify-self: stretch;
  align-self: end;
  /* Roste spolu se stupněm, bez vlastního zpoždění. */
  opacity: 0.95;
}
.slot__bar--ok {
  background: linear-gradient(180deg, color-mix(in oklab, var(--team) 92%, white), var(--team));
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--team) 40%, black);
}
.slot__bar--bad {
  background: linear-gradient(180deg, var(--c-bad), color-mix(in oklab, var(--c-bad) 70%, var(--c-dead)));
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, white 18%, transparent),
    0 2px 0 color-mix(in oklab, var(--c-bad-deep) 80%, black);
}

.results__legend {
  display: flex;
  gap: var(--sp-4);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
}
.results__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}
.results__legend-item::before {
  content: '';
  width: var(--sp-3);
  height: var(--sp-3);
  border-radius: var(--r-sm);
  box-shadow: inset 0 1px 0 var(--c-tile-sheen);
}
.results__legend-item--ok::before {
  background: var(--c-brand-soft);
}
.results__legend-item--bad::before {
  background: var(--c-bad);
}

/* --- Další pořadí -------------------------------------------------------- */
.rest {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-2) var(--sp-4);
  width: 100%;
  max-width: 48rem;
}
.rest__item {
  --i: 0;
  display: grid;
  grid-template-columns: 2.25ch auto auto auto auto;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-surface) 70%, transparent);
  border: 1px solid var(--c-line-soft);
  animation: fadeUp var(--dur-slow) var(--ease-out)
    calc(var(--dur-base) + var(--dur-count) + var(--i) * 40ms) both;
}
.rest__place {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
  text-align: right;
}
.rest__badge {
  display: inline-grid;
  place-items: center;
  width: var(--sp-5);
  height: var(--sp-5);
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-xs);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--team) 40%, black);
}
.rest__name {
  font-weight: 700;
  font-size: var(--fs-sm);
  color: var(--c-text);
}
.rest__score {
  font-family: var(--font-display);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.rest__cover {
  display: inline-flex;
  gap: var(--sp-1);
}
.rest__chip {
  display: inline-grid;
  place-items: center;
  min-width: var(--sp-5);
  padding: 0 var(--sp-1);
  border-radius: var(--r-sm);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: var(--sp-5);
  color: var(--c-text-ink);
}
.rest__chip--ok {
  background: var(--team);
}
.rest__chip--bad {
  background: var(--c-bad);
}

.results__foot {
  display: grid;
  gap: var(--sp-4);
  justify-items: center;
  width: 100%;
  margin-top: var(--sp-2);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--c-line-soft);
}
.results__meta {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
  text-align: center;
  text-wrap: balance;
}
.results__actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: center;
  flex-wrap: wrap;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(var(--sp-3)); }
  to { opacity: 1; transform: none; }
}
@keyframes riseColumn {
  from {
    transform: scaleY(0);
    opacity: 0.55;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .results__cheer,
  .slot__head,
  .slot__riser,
  .rest__item {
    animation: none;
  }
}

@media (max-width: 720px) {
  .results__content {
    align-content: start;
    padding: var(--sp-5) var(--sp-4);
  }
  .podium {
    flex-direction: column;
    align-items: stretch;
  }
  .slot,
  .slot--champ,
  .slot--tied {
    max-width: none;
  }
  .slot--champ .slot__riser,
  .slot--second .slot__riser,
  .slot--third .slot__riser,
  .slot--tied .slot__riser {
    --riser-h: clamp(4.5rem, 12vh, 7rem);
  }
  .podium--duo .slot--champ,
  .podium--duo .slot--second {
    order: 0;
  }
  .podium:not(.podium--tie) .slot--champ { order: -1; }
}

@media (pointer: coarse) {
  .results__actions :deep(.btn) { min-height: 2.75rem; }
}
</style>
