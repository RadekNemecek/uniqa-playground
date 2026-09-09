<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { hasGame, game } from '@/stores/game'
import { packs } from '@/stores/packs'
import { count } from '@/lib/format'
import { teamBadge, teamColor } from '@/lib/teams'
import { prefersReducedMotion } from '@/lib/motion'

/* --- Deska na úvodní stránce ---------------------------------------------
   Není to hra, je to obraz hry. Sama se pomalu hraje: co chvíli některé
   políčko získá tým, jindy se zase uvolní. Z rozcestníku je tím vidět,
   o čem Riskuj je, aniž by to někdo musel číst. */

const COLS = 5
const ROWS = [200, 400, 600]
const BONUS_INDEX = 12
/** Tři týmy jako v běžné hře. Šest barev naráz by z desky udělalo vzorník. */
const TEAMS = 3

interface Tile {
  id: number
  value: number
  team: number | null
  bonus: boolean
  flipping: boolean
}

const tiles = reactive<Tile[]>(
  ROWS.flatMap((value, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      id: r * COLS + c,
      value,
      team: null,
      bonus: r * COLS + c === BONUS_INDEX,
      flipping: false,
    })),
  ),
)

const playable = computed(() => tiles.filter((t) => !t.bonus))

let timer = 0
let nextTeam = 0

function flip(tile: Tile, change: () => void): void {
  tile.flipping = true
  window.setTimeout(() => {
    change()
    tile.flipping = false
  }, 190)
}

/** Jedno kolo: buď někdo políčko získá, nebo se políčko vrátí do hry. */
function tick(): void {
  const claimed = playable.value.filter((t) => t.team !== null)
  const free = playable.value.filter((t) => t.team === null)

  // Deska nesmí zčernat celá, jinak přestane být čitelná jako deska.
  const shouldClaim = claimed.length < 4 && free.length > 0
  const pool = shouldClaim ? free : claimed
  const tile = pool[Math.floor(Math.random() * pool.length)]
  if (!tile) return

  flip(tile, () => {
    if (shouldClaim) {
      tile.team = nextTeam % TEAMS
      nextTeam++
    } else {
      tile.team = null
    }
  })
}

function start(): void {
  if (prefersReducedMotion()) return
  stop()
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') tick()
  }, 2200)
}

function stop(): void {
  window.clearInterval(timer)
  timer = 0
}

const dealt = ref(false)

onMounted(() => {
  // Nejdřív se deska rozdá, teprve pak se začne hrát sama.
  window.setTimeout(() => {
    dealt.value = true
    start()
  }, 1400)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stop()
  document.removeEventListener('visibilitychange', onVisibility)
})

function onVisibility(): void {
  if (document.visibilityState === 'hidden') stop()
  else if (dealt.value) start()
}

const packLabel = computed(() =>
  packs.packs.length
    ? `${count(packs.packs.length, 'balíček', 'balíčky', 'balíčků')} otázek připraveno`
    : 'Zatím bez otázek',
)
</script>

<template>
  <div class="home">
    <AppHeader />

    <main class="page">
      <section class="hero">
        <div class="hero__text">
          <p class="eyebrow">Vědomostní hra pro školení</p>
          <h1 class="hero__title">Riskuj</h1>
          <p class="hero__lead">
            Týmy si volí kategorii a bodovou hodnotu, ty odkrýváš otázky
            a rozdáváš body. Až šest týmů, časomíra, bonusová pole
            a otázky, které si napíšeš přesně na míru svému školení.
          </p>

          <div class="hero__actions">
            <RouterLink to="/riskuj" class="cta">
              Spustit hru
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M5 12h13M12 5l7 7-7 7" />
              </svg>
            </RouterLink>
            <RouterLink to="/admin" class="cta cta--quiet">Připravit otázky</RouterLink>
          </div>

          <p class="hero__meta">{{ packLabel }}</p>
        </div>

        <div class="board" :style="{ '--cols': COLS }" aria-hidden="true">
          <span
            v-for="t in tiles"
            :key="t.id"
            class="tile"
            :class="{
              'tile--team': t.team !== null,
              'tile--bonus': t.bonus,
              'tile--flip': t.flipping,
            }"
            :style="{
              '--i': t.id,
              '--team': t.team !== null ? `var(${teamColor(t.team).cssVar})` : undefined,
            }"
          >
            <template v-if="t.bonus">Riskuj!</template>
            <template v-else-if="t.team !== null">{{ teamBadge(t.team) }}</template>
            <template v-else>{{ t.value }}</template>
          </span>
        </div>
      </section>

      <RouterLink v-if="hasGame && game" to="/riskuj" class="resume">
        <span class="resume__dot" aria-hidden="true"></span>
        <span class="resume__text">
          <strong>Pokračovat v rozehrané hře</strong>
          {{ game.packName }}, {{ count(game.teams.length, 'tým', 'týmy', 'týmů') }}
        </span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <path d="M5 12h13M12 5l7 7-7 7" />
        </svg>
      </RouterLink>
    </main>

    <footer class="foot page">
      <p>Funguje i bez připojení k internetu.</p>
    </footer>
  </div>
</template>

<style scoped>
.home { min-height: 100dvh; display: flex; flex-direction: column; }
main { flex: 1; padding-block: var(--sp-7) var(--sp-8); display: grid; gap: var(--sp-6); align-content: center; }

/* Hero --------------------------------------------------------------------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: var(--sp-8);
  align-items: center;
}
.hero__text { max-width: 32rem; }

.hero__title {
  font-size: var(--fs-hero);
  font-weight: 800;
  letter-spacing: -0.04em;
  margin: var(--sp-2) 0 var(--sp-4);
  background: linear-gradient(160deg, var(--c-text) 20%, var(--c-gold) 120%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.hero__lead {
  font-size: var(--fs-lg);
  color: var(--c-text-muted);
  animation: rise var(--dur-slow) var(--ease-out) 80ms both;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
  animation: rise var(--dur-slow) var(--ease-out) 160ms both;
}
.cta {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, var(--c-gold) 0%, var(--c-gold-deep) 100%);
  color: var(--c-text-ink);
  font-size: var(--fs-lg);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.45), 0 14px 28px -12px var(--c-gold-glow);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.cta:hover { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(0, 0, 0, 0.45), 0 20px 34px -14px var(--c-gold-glow); }
.cta:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0, 0, 0, 0.45); }

.cta--quiet {
  background: transparent;
  color: var(--c-text-muted);
  border: 1px solid var(--c-line);
  box-shadow: none;
  font-weight: 600;
}
.cta--quiet:hover { color: var(--c-text); border-color: var(--c-surface-3); transform: none; box-shadow: none; }
.cta--quiet:active { transform: none; box-shadow: none; }

.hero__meta { margin-top: var(--sp-4); font-size: var(--fs-sm); color: var(--c-text-faint); }

/* Deska, která se hraje sama ------------------------------------------------ */
.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: clamp(6px, 0.7vw, 12px);
}

/* Studiové světlo pomalu přejede desku. */
.board::after {
  content: '';
  position: absolute;
  inset: -8%;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.07) 50%, transparent 58%);
  translate: -60% 0;
  animation: pass 9s var(--ease-both) 2s infinite;
}

.tile {
  --i: 0;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  border-radius: var(--r-lg);
  background: linear-gradient(178deg, var(--c-tile-top) 0%, var(--c-tile-bottom) 100%);
  box-shadow:
    inset 0 1.5px 0 var(--c-tile-sheen),
    inset 0 -2px 0 rgba(0, 0, 0, 0.4),
    0 4px 0 var(--c-tile-edge),
    0 10px 18px -8px rgba(0, 0, 0, 0.7);
  color: var(--c-gold);
  font-size: clamp(0.9rem, 0.35rem + 1.25vw, 1.75rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-shadow: 0 -1px 0 rgba(255, 255, 255, 0.18), 0 2px 0 rgba(0, 0, 0, 0.45);
  animation: deal var(--dur-slow) var(--ease-out) calc(120ms + var(--i) * 45ms) both;
  transition:
    transform 190ms var(--ease-both),
    background var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

/* Otočení kolem vodorovné osy. Obsah se vymění v polovině, kdy je
   políčko na hraně a není co číst. */
.tile--flip { transform: rotateX(90deg); }

.tile--team {
  background: linear-gradient(178deg, var(--team) 0%, color-mix(in oklab, var(--team) 76%, black) 100%);
  color: var(--c-text-ink);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.35),
    0 4px 0 color-mix(in oklab, var(--team) 35%, black),
    0 10px 20px -8px color-mix(in oklab, var(--team) 50%, transparent);
  text-shadow: none;
}
.tile--bonus {
  background: linear-gradient(178deg, var(--c-spark) 0%, var(--c-spark-deep) 100%);
  color: var(--c-text-ink);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.35),
    0 4px 0 rgba(0, 0, 0, 0.45),
    0 12px 26px -8px var(--c-spark-glow);
  font-size: clamp(0.6rem, 0.25rem + 0.7vw, 0.95rem);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-shadow: none;
  animation:
    deal var(--dur-slow) var(--ease-out) calc(120ms + var(--i) * 45ms) both,
    glow 3.2s var(--ease-both) 1.6s infinite;
}

/* Rozehraná hra ------------------------------------------------------------ */
.resume {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border: 1px solid color-mix(in oklab, var(--c-gold) 42%, transparent);
  border-radius: var(--r-lg);
  background: color-mix(in oklab, var(--c-gold) 8%, var(--c-surface));
  color: var(--c-text);
  text-decoration: none;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.resume:hover { border-color: var(--c-gold); background: color-mix(in oklab, var(--c-gold) 14%, var(--c-surface)); }
.resume__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: var(--r-full);
  background: var(--c-gold);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--c-gold) 22%, transparent);
}
.resume__text { flex: 1; display: grid; font-size: var(--fs-sm); color: var(--c-text-faint); }
.resume__text strong { font-size: var(--fs-md); color: var(--c-text); }
.resume svg { color: var(--c-gold); }

.foot { padding-block: var(--sp-6); color: var(--c-text-faint); font-size: var(--fs-sm); }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes deal {
  from { opacity: 0; transform: translateY(26px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
@keyframes pass {
  0% { translate: -60% 0; }
  55%, 100% { translate: 160% 0; }
}
@keyframes glow {
  0%, 100% { box-shadow: inset 0 1.5px 0 rgba(255,255,255,.35), 0 4px 0 rgba(0,0,0,.45), 0 12px 22px -10px var(--c-spark-glow); }
  50% { box-shadow: inset 0 1.5px 0 rgba(255,255,255,.35), 0 4px 0 rgba(0,0,0,.45), 0 16px 34px -8px var(--c-spark-glow); }
}

@media (prefers-reduced-motion: reduce) {
  .hero__title, .hero__lead, .hero__actions, .tile, .board::after { animation: none; }
  .tile { transition: none; }
}

@media (max-width: 960px) {
  .hero { grid-template-columns: minmax(0, 1fr); gap: var(--sp-6); }
  .hero__text { max-width: none; }
  .board { max-width: 34rem; }
}
</style>
