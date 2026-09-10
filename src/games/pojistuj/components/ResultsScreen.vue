<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GameState, Team } from '@/types'
import { cellKey } from '@/types'
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
const others = computed(() =>
  ranked.value.filter((t) => !winners.value.some((w) => w.id === t.id)),
)

function teamIndex(t: Team): number {
  return props.game.teams.findIndex((x) => x.id === t.id)
}

function cellsLost(): number {
  return Object.values(props.game.cells).filter((c) => c.status === 'lost').length
}

interface PieSlice {
  color: string
  from: number
  to: number
  team?: Team
  points: number
}

/**
 * Koláč na kategorii: kolik bodů si z ní který tým odnesl.
 *
 * Váží se body, ne počet políček. Žebříček jde od 200 do 1000, takže dvě
 * levná políčka nejsou totéž co jedno drahé; podle počtu by odznak přiznal
 * kategorii týmu, který z ní vytěžil míň.
 *
 * Díly se musí sečíst do celého kruhu. `conic-gradient` poslední barvu
 * roztáhne až do 360 stupňů, takže když díly skončí dřív, zbytek kruhu si
 * vezme ten tým, který byl v pořadí poslední: kategorie se třemi pětinami
 * pro jeden tým se kreslila jako jeho plný kruh.
 */
const pies = computed(() =>
  props.game.categories.map((cat) => {
    const won = new Map<string, number>()
    /** Body, které si z kategorie neodnesl nikdo. */
    let rest = 0

    for (const value of props.game.ladder) {
      const cell = props.game.cells[cellKey(cat.id, value)]
      if (!cell) continue
      if (cell.status === 'won' && cell.teamId) {
        // U pole Nepojištěno! platí vsazená částka, ne hodnota políčka.
        // Tolik bodů z kategorie doopravdy odešlo.
        const gained = Math.max(0, cell.points ?? value)
        won.set(cell.teamId, (won.get(cell.teamId) ?? 0) + gained)
      } else {
        // Neuhodnuté i nezahrané políčko drží svou hodnotu ze žebříčku.
        // Na kruhu je to jeden neutrální díl: dva odstíny tmy by se na
        // sedmdesáti pixelech stejně nerozeznaly a kolik otázek zůstalo
        // bez odpovědi, stojí v řádku nad koláči.
        rest += value
      }
    }

    const slices: Array<{ team?: Team; points: number; color: string }> = props.game.teams.map(
      (t) => ({
        team: t,
        points: won.get(t.id) ?? 0,
        color: `var(${teamColor(t.color).cssVar})`,
      }),
    )
    if (rest > 0) {
      slices.push({ points: rest, color: 'var(--c-sunken)' })
    }

    // Jmenovatel jde ze součtu dílů, takže kruh vždycky doběhne do 360.
    const total = slices.reduce((sum, s) => sum + s.points, 0)
    let cursor = 0
    const painted: PieSlice[] = []
    for (const s of slices) {
      if (s.points <= 0 || total === 0) continue
      const from = (cursor / total) * 360
      cursor += s.points
      const to = (cursor / total) * 360
      painted.push({ ...s, from, to })
    }

    const best = Math.max(0, ...slices.filter((s) => s.team).map((s) => s.points))
    const champs = slices.filter((s) => s.team && s.points === best && best > 0)

    const gradient =
      painted.length === 0
        ? 'var(--c-sunken)'
        : `conic-gradient(${painted
            .map((s) => `${s.color} ${s.from}deg ${s.to}deg`)
            .join(', ')})`

    return { cat, gradient, champs, painted, total }
  }),
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
      <!-- Hero: kdo vyhrál ---------------------------------------------------- -->
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

        <ul v-if="others.length" class="hero__rest" aria-label="Další pořadí">
          <li
            v-for="(t, i) in others"
            :key="t.id"
            class="hero__rest-item"
            :style="{ '--team': `var(${teamColor(t.color).cssVar})` }"
          >
            <span class="hero__rest-place">{{ winners.length + i + 1 }}.</span>
            <span class="hero__rest-badge">{{ teamBadge(teamIndex(t)) }}</span>
            <span class="hero__rest-name">{{ t.name }}</span>
            <span class="hero__rest-score">{{ formatScore(t.score) }}</span>
          </li>
        </ul>

        <p class="hero__meta">
          {{ game.packName }}
          · {{ count(Object.keys(game.cells).length, 'otázka', 'otázky', 'otázek') }}
          <template v-if="cellsLost()">
            · {{ count(cellsLost(), 'políčko bez odpovědi', 'políčka bez odpovědi', 'políček bez odpovědi') }}
          </template>
        </p>
      </header>

      <!-- Kategorie: malé koláče ---------------------------------------------- -->
      <section class="cats" aria-label="Kategorie">
        <h2 class="cats__title">Podle kategorií</h2>
        <ul class="cats__list">
          <li
            v-for="(pie, i) in pies"
            :key="pie.cat.id"
            class="cats__item"
            :style="{ '--i': i }"
          >
            <div
              class="pie"
              :style="{ background: pie.gradient }"
              role="img"
              :aria-label="
                pie.champs.length === 1 && pie.champs[0]?.team
                  ? `${pie.cat.name}: ovládl ${pie.champs[0].team.name}`
                  : pie.champs.length > 1
                    ? `${pie.cat.name}: vyrovnané`
                    : `${pie.cat.name}: nikdo`
              "
            >
              <span
                v-if="pie.champs.length === 1 && pie.champs[0]?.team"
                class="pie__champ"
                :style="{ '--team': `var(${teamColor(pie.champs[0].team.color).cssVar})` }"
              >
                {{ teamBadge(teamIndex(pie.champs[0].team)) }}
              </span>
              <span v-else-if="pie.champs.length > 1" class="pie__champ pie__champ--tie">=</span>
              <span v-else class="pie__champ pie__champ--empty" aria-hidden="true">−</span>
            </div>
            <p class="cats__name">{{ pie.cat.name }}</p>
          </li>
        </ul>
      </section>

      <div class="results__actions">
        <UiButton variant="ghost" @click="emit('board')">Zpět na desku</UiButton>
        <UiButton variant="ghost" @click="emit('again')">Jiná sestava</UiButton>
        <UiButton variant="brand" size="lg" @click="emit('rematch')">Stejné týmy znovu</UiButton>
      </div>
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
  gap: var(--sp-7);
  padding: var(--sp-6) var(--sp-5) var(--sp-6);
  min-height: 100dvh;
  width: min(100%, 56rem);
  margin-inline: auto;
  align-content: center;
  justify-items: center;
}

/* --- Hero ---------------------------------------------------------------- */
.hero {
  display: grid;
  gap: var(--sp-3);
  justify-items: center;
  text-align: center;
  width: 100%;
}
.hero__cheer {
  font-family: var(--font-hand);
  font-weight: 500;
  font-size: clamp(var(--fs-2xl), 1rem + 2vw, 2.5rem);
  line-height: 1;
  color: var(--c-brand);
  animation: fadeUp var(--dur-slow) var(--ease-out) both;
}
.hero__badge {
  display: grid;
  place-items: center;
  width: clamp(4.5rem, 3rem + 6vw, 7rem);
  height: clamp(4.5rem, 3rem + 6vw, 7rem);
  border-radius: var(--r-xl);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-size: clamp(var(--fs-3xl), 1.5rem + 4vw, 4rem);
  font-weight: 900;
  box-shadow:
    inset 0 2px 0 var(--c-tile-sheen),
    0 6px 0 color-mix(in oklab, var(--team) 40%, black),
    0 24px 48px -12px color-mix(in oklab, var(--team) 55%, transparent);
  animation: pop var(--dur-count) var(--ease-back) var(--dur-fast) both;
}
.hero__name {
  font-family: var(--font-display);
  font-size: var(--fs-hero);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: var(--lh-tight);
  max-width: 18ch;
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
  font-size: clamp(var(--fs-3xl), 1.2rem + 5vw, 5rem);
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

.hero__rest {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-4);
  justify-content: center;
  margin-top: var(--sp-2);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--c-line-soft);
  width: min(100%, 36rem);
}
.hero__rest-item {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.hero__rest-place {
  font-variant-numeric: tabular-nums;
  color: var(--c-text-faint);
  min-width: 1.5ch;
}
.hero__rest-badge {
  display: inline-grid;
  place-items: center;
  width: var(--sp-4);
  height: var(--sp-4);
  border-radius: var(--r-sm);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
}
.hero__rest-name { font-weight: 700; color: var(--c-text); }
.hero__rest-score {
  font-family: var(--font-display);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-faint);
}

.hero__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
}

/* --- Koláče kategorií ---------------------------------------------------- */
.cats {
  display: grid;
  gap: var(--sp-4);
  width: 100%;
  justify-items: center;
}
.cats__title {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.cats__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-5) var(--sp-6);
  width: 100%;
}
.cats__item {
  --i: 0;
  display: grid;
  gap: var(--sp-2);
  justify-items: center;
  width: 6.5rem;
  animation: fadeUp var(--dur-slow) var(--ease-out) calc(var(--dur-base) + var(--i) * 60ms) both;
}
.cats__name {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-muted);
  text-align: center;
  line-height: var(--lh-snug);
  text-wrap: balance;
}

.pie {
  position: relative;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: var(--r-full);
  box-shadow:
    inset 0 0 0 1px var(--c-line-soft),
    0 8px 20px -10px color-mix(in oklab, var(--c-abyss) 70%, transparent);
}
.pie__champ {
  position: absolute;
  inset: 22%;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-sm);
  box-shadow: inset 0 1px 0 var(--c-tile-sheen);
}
.pie__champ--tie,
.pie__champ--empty {
  background: var(--c-surface-2);
  color: var(--c-text-faint);
  box-shadow: none;
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
@keyframes pop {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .hero__cheer,
  .hero__badge,
  .hero__name,
  .hero__kicker,
  .hero__score,
  .cats__item {
    animation: none;
  }
}

@media (max-width: 600px) {
  .results__content {
    gap: var(--sp-5);
    padding-block: var(--sp-5);
    align-content: start;
  }
  .cats__item { width: 5.5rem; }
  .pie {
    width: 3.75rem;
    height: 3.75rem;
  }
}

@media (pointer: coarse) {
  .results__actions :deep(.btn) { min-height: 2.75rem; }
}
</style>
