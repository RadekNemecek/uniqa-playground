<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GameState, Team } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { confetti } from '@/lib/confetti'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'
import { count } from '@/lib/format'

const props = defineProps<{ game: GameState }>()
const emit = defineEmits<{ again: []; rematch: []; board: [] }>()

const fx = ref<HTMLElement | null>(null)

const ranked = computed(() => [...props.game.teams].sort((a, b) => b.score - a.score))
const top = computed(() => ranked.value[0]?.score ?? 0)
const winners = computed(() => ranked.value.filter((t) => t.score === top.value))
const isTie = computed(() => winners.value.length > 1)
const winner = computed(() => (!isTie.value ? winners.value[0] : undefined))

function teamIndex(t: Team): number {
  return props.game.teams.findIndex((x) => x.id === t.id)
}

function placeOf(t: Team): number {
  const score = t.score
  return ranked.value.findIndex((x) => x.score === score) + 1
}

/**
 * Sloupce pojištěno / nepojištěno: počítají se otázky, ne body.
 * Pojištěno = tým uhodl. Nepojištěno = tým byl na tahu a neuhodl
 * (včetně přebrání jiným týmem).
 */
const coverage = computed(() => {
  const byRank = ranked.value.map((team) => {
    let insured = 0
    let uninsured = 0
    for (const cell of Object.values(props.game.cells)) {
      if (cell.status === 'won' && cell.teamId === team.id) insured += 1
      if (cell.failedByTeamId === team.id) uninsured += 1
    }
    return { team, insured, uninsured }
  })

  const peak = Math.max(1, ...byRank.map((r) => Math.max(r.insured, r.uninsured)))
  return byRank.map((r) => ({
    ...r,
    insuredPct: (r.insured / peak) * 100,
    uninsuredPct: (r.uninsured / peak) * 100,
  }))
})

const coverageTotal = computed(() =>
  coverage.value.reduce((sum, r) => sum + r.uninsured, 0),
)

onMounted(() => {
  if (settings.sound) sfx.fanfare()
  confetti(
    winners.value.map((t) => teamColor(t.color).hex),
    fx.value ?? undefined,
  )
})
</script>

<template>
  <div class="results">
    <div ref="fx" class="results__fx" aria-hidden="true"></div>

    <div class="results__content">
      <!-- Levá polovina: kdo vyhrál ------------------------------------------- -->
      <header class="hero">
        <p class="hero__cheer">
          <template v-if="!isTie">gratulujeme!</template>
          <template v-else>těsná hra</template>
        </p>

        <template v-if="winner">
          <div
            class="hero__badge"
            :style="{ '--team': `var(${teamColor(winner.color).cssVar})` }"
            aria-hidden="true"
          >
            {{ teamBadge(teamIndex(winner)) }}
          </div>
          <h1 class="hero__name">{{ winner.name }}</h1>
          <p class="hero__kicker">vyhrává</p>
          <p class="hero__score">{{ formatScore(top) }}</p>
        </template>

        <template v-else>
          <h1 class="hero__name">Remíza</h1>
          <p class="hero__score">{{ formatScore(top) }}</p>
          <ul class="hero__ties">
            <li
              v-for="w in winners"
              :key="w.id"
              class="hero__tie"
              :style="{ '--team': `var(${teamColor(w.color).cssVar})` }"
            >
              <span class="hero__tie-badge">{{ teamBadge(teamIndex(w)) }}</span>
              {{ w.name }}
            </li>
          </ul>
        </template>
      </header>

      <!-- Pravá polovina: podrobnosti ---------------------------------------- -->
      <aside class="detail">
        <section class="standings" aria-label="Pořadí">
          <h2 class="detail__title">Pořadí</h2>
          <ol class="standings__list">
            <li
              v-for="(t, i) in ranked"
              :key="t.id"
              class="standings__row"
              :class="{ 'standings__row--top': t.score === top }"
              :style="{ '--i': i, '--team': `var(${teamColor(t.color).cssVar})` }"
            >
              <span class="standings__place">{{ placeOf(t) }}.</span>
              <span class="standings__badge">{{ teamBadge(teamIndex(t)) }}</span>
              <span class="standings__name">{{ t.name }}</span>
              <span class="standings__score">{{ formatScore(t.score) }}</span>
            </li>
          </ol>
        </section>

        <section class="cover" aria-label="Pojištěno a nepojištěno">
          <div class="cover__head">
            <h2 class="detail__title">Krytí</h2>
            <ul class="cover__legend" aria-hidden="true">
              <li class="cover__legend-item cover__legend-item--ok">Pojištěno</li>
              <li class="cover__legend-item cover__legend-item--bad">Nepojištěno</li>
            </ul>
          </div>

          <ul class="cover__chart">
            <li
              v-for="(row, i) in coverage"
              :key="row.team.id"
              class="cover__group"
              :style="{
                '--i': i,
                '--team': `var(${teamColor(row.team.color).cssVar})`,
              }"
            >
              <div
                class="cover__bars"
                role="img"
                :aria-label="
                  `${row.team.name}: ${count(row.insured, 'pojištěná otázka', 'pojištěné otázky', 'pojištěných otázek')}, ${count(row.uninsured, 'nepojištěná', 'nepojištěné', 'nepojištěných')}`
                "
              >
                <div class="cover__col">
                  <span class="cover__n">{{ row.insured }}</span>
                  <span
                    class="cover__bar cover__bar--ok"
                    :style="{ '--h': `${row.insuredPct}%` }"
                  />
                </div>
                <div class="cover__col">
                  <span class="cover__n">{{ row.uninsured }}</span>
                  <span
                    class="cover__bar cover__bar--bad"
                    :style="{ '--h': `${row.uninsuredPct}%` }"
                  />
                </div>
              </div>

              <span class="cover__badge" aria-hidden="true">{{ teamBadge(teamIndex(row.team)) }}</span>
              <p class="cover__name">{{ row.team.name }}</p>
            </li>
          </ul>
        </section>

        <p class="detail__meta">
          {{ game.packName }}
          · {{ count(Object.keys(game.cells).length, 'otázka', 'otázky', 'otázek') }}
          <template v-if="coverageTotal">
            · {{ count(coverageTotal, 'Nepojištěno', 'Nepojištěno', 'Nepojištěno') }}
          </template>
        </p>

        <div class="results__actions">
          <UiButton variant="ghost" @click="emit('board')">Zpět na desku</UiButton>
          <UiButton variant="ghost" @click="emit('again')">Jiná sestava</UiButton>
          <UiButton variant="brand" size="lg" @click="emit('rematch')">Stejné týmy znovu</UiButton>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.results {
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  width: 100%;
}
.results__fx {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.results__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 100dvh;
  width: 100%;
  align-items: stretch;
}

/* --- Levá: gratulace ----------------------------------------------------- */
.hero {
  display: grid;
  gap: var(--sp-3);
  justify-items: center;
  align-content: center;
  text-align: center;
  padding: var(--sp-7) var(--sp-6);
  background:
    radial-gradient(80% 60% at 50% 40%, color-mix(in oklab, var(--c-brand) 14%, transparent), transparent 70%),
    var(--c-abyss);
  border-right: 1px solid var(--c-line-soft);
}
.hero__cheer {
  font-family: var(--font-hand);
  font-weight: 500;
  font-size: clamp(var(--fs-2xl), 1rem + 2.4vw, 3rem);
  line-height: 1;
  color: var(--c-brand);
  animation: fadeUp var(--dur-slow) var(--ease-out) both;
}
.hero__badge {
  display: grid;
  place-items: center;
  width: clamp(5.5rem, 4rem + 7vw, 9rem);
  height: clamp(5.5rem, 4rem + 7vw, 9rem);
  border-radius: var(--r-xl);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(var(--fs-3xl), 1.8rem + 4vw, 5rem);
  box-shadow:
    inset 0 2px 0 var(--c-tile-sheen),
    0 8px 0 color-mix(in oklab, var(--team) 40%, black),
    0 28px 56px -12px color-mix(in oklab, var(--team) 55%, transparent);
  animation: pop var(--dur-count) var(--ease-back) var(--dur-fast) both;
}
.hero__name {
  font-family: var(--font-display);
  font-size: clamp(var(--fs-3xl), 1.4rem + 4vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: var(--lh-tight);
  max-width: 12ch;
  text-wrap: balance;
  animation: fadeUp var(--dur-slow) var(--ease-out) calc(var(--dur-fast) + 40ms) both;
}
.hero__kicker {
  font-size: var(--fs-lg);
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-text-muted);
  margin-top: calc(var(--sp-2) * -1);
  animation: fadeUp var(--dur-slow) var(--ease-out) calc(var(--dur-fast) + 80ms) both;
}
.hero__score {
  font-family: var(--font-display);
  font-size: clamp(var(--fs-3xl), 1.4rem + 5vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: var(--c-brand);
  text-shadow: 0 0 48px var(--c-brand-glow);
  animation: pop var(--dur-count) var(--ease-back) calc(var(--dur-base) + 40ms) both;
}
.hero__ties {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3) var(--sp-5);
  justify-content: center;
}
.hero__tie {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xl);
  font-weight: 800;
}
.hero__tie-badge {
  display: inline-grid;
  place-items: center;
  width: var(--sp-6);
  height: var(--sp-6);
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-sm);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--team) 40%, black);
}

/* --- Pravá: podrobnosti -------------------------------------------------- */
.detail {
  display: grid;
  gap: var(--sp-5);
  align-content: center;
  padding: var(--sp-6) var(--sp-6) var(--sp-5);
  background: var(--c-base);
  min-width: 0;
}
.detail__title {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
  margin: 0;
}
.detail__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
  text-align: center;
}

.standings {
  display: grid;
  gap: var(--sp-3);
}
.standings__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--sp-2);
}
.standings__row {
  --i: 0;
  display: grid;
  grid-template-columns: 2.5ch auto 1fr auto;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-surface);
  border: 1px solid var(--c-line-soft);
  animation: fadeUp var(--dur-slow) var(--ease-out) calc(var(--dur-base) + var(--i) * 50ms) both;
}
.standings__row--top {
  background: color-mix(in oklab, var(--team) 18%, var(--c-surface));
  border-color: color-mix(in oklab, var(--team) 45%, var(--c-line-soft));
}
.standings__place {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--c-text-faint);
  text-align: right;
}
.standings__badge {
  display: inline-grid;
  place-items: center;
  width: var(--sp-6);
  height: var(--sp-6);
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-sm);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--team) 40%, black);
}
.standings__name {
  font-weight: 700;
  color: var(--c-text);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.standings__score {
  font-family: var(--font-display);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-lg);
  color: var(--c-text);
}

.cover {
  display: grid;
  gap: var(--sp-3);
}
.cover__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2) var(--sp-4);
}
.cover__legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: var(--sp-4);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
}
.cover__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}
.cover__legend-item::before {
  content: '';
  width: var(--sp-3);
  height: var(--sp-3);
  border-radius: var(--r-sm);
  box-shadow: inset 0 1px 0 var(--c-tile-sheen);
}
.cover__legend-item--ok::before {
  background: linear-gradient(135deg, var(--c-team-1), var(--c-team-3));
}
.cover__legend-item--bad::before {
  background: var(--c-bad);
}

.cover__chart {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--sp-4) var(--sp-5);
  align-items: end;
}
.cover__group {
  --i: 0;
  display: grid;
  gap: var(--sp-2);
  justify-items: center;
  width: 4.75rem;
  animation: fadeUp var(--dur-slow) var(--ease-out) calc(var(--dur-base) + var(--i) * 60ms) both;
}
.cover__bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
  align-items: end;
  height: clamp(5.5rem, 3rem + 10vh, 9rem);
  width: 100%;
}
.cover__col {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--sp-1);
  height: 100%;
  justify-items: center;
  align-items: end;
}
.cover__n {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--c-text);
}
.cover__bar {
  --h: 0%;
  width: 100%;
  min-height: 2px;
  height: var(--h);
  border-radius: var(--r-sm);
  justify-self: stretch;
  align-self: end;
  transform-origin: bottom;
  animation: rise var(--dur-count) var(--ease-out) calc(var(--dur-base) + var(--i) * 60ms) both;
}
.cover__bar--ok {
  background: linear-gradient(180deg, color-mix(in oklab, var(--team) 92%, white), var(--team));
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 3px 0 color-mix(in oklab, var(--team) 40%, black);
}
.cover__bar--bad {
  background: linear-gradient(180deg, var(--c-bad), color-mix(in oklab, var(--c-bad) 70%, var(--c-dead)));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 3px 0 color-mix(in oklab, var(--c-bad-deep) 80%, black);
}
.cover__badge {
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
.cover__name {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
  text-align: center;
  line-height: var(--lh-snug);
  text-wrap: balance;
  max-width: 9ch;
  margin: 0;
}

.results__actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: flex-start;
  flex-wrap: wrap;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--c-line-soft);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(var(--sp-3)); }
  to { opacity: 1; transform: none; }
}
@keyframes pop {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: none; }
}
@keyframes rise {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .hero__cheer,
  .hero__badge,
  .hero__name,
  .hero__kicker,
  .hero__score,
  .standings__row,
  .cover__group,
  .cover__bar {
    animation: none;
  }
}

/* Pod ~960 px se sloupce složí: gratulace nahoře, podrobnosti pod ní. */
@media (max-width: 960px) {
  .results__content {
    grid-template-columns: 1fr;
    align-content: start;
  }
  .hero {
    border-right: 0;
    border-bottom: 1px solid var(--c-line-soft);
    padding: var(--sp-6) var(--sp-5);
    min-height: auto;
  }
  .detail {
    padding: var(--sp-5);
    align-content: start;
  }
  .results__actions { justify-content: center; }
  .detail__meta { text-align: center; }
  .cover__chart { justify-content: center; }
}

@media (pointer: coarse) {
  .results__actions :deep(.btn) { min-height: 2.75rem; }
}
</style>
