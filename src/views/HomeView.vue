<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { hasGame, game } from '@/stores/game'
import { packs } from '@/stores/packs'
import { count } from '@/lib/format'
import { teamBadge, teamColor } from '@/lib/teams'
import { prefersReducedMotion } from '@/lib/motion'

/* --- Studiová stěna -------------------------------------------------------
   Deska není obrázek vedle textu, je to kus stěny natočený do prostoru,
   který pokračuje za okraj obrazovky. Sama se pomalu hraje a světlo chodí
   za políčkem, na kterém se zrovna něco děje. */

const COLS = 6
const ROWS = [200, 400, 600, 800]
const TEAMS = 3
const BONUS_ID = 15

interface Tile {
  id: number
  row: number
  col: number
  value: number
  team: number | null
  bonus: boolean
  flipping: boolean
}

const tiles = reactive<Tile[]>(
  ROWS.flatMap((value, row) =>
    Array.from({ length: COLS }, (_, col) => ({
      id: row * COLS + col,
      row,
      col,
      value,
      team: null,
      bonus: row * COLS + col === BONUS_ID,
      flipping: false,
    })),
  ),
)

const playable = computed(() => tiles.filter((t) => !t.bonus))

/* --- Světlo, které chodí za děním ---------------------------------------- */
const spot = reactive({ x: 50, y: 40 })

function lightUp(tile: Tile): void {
  spot.x = ((tile.col + 0.5) / COLS) * 100
  spot.y = ((tile.row + 0.5) / ROWS.length) * 100
}

/* --- Deska se hraje sama -------------------------------------------------- */
let timer = 0
let nextTeam = 0

function flip(tile: Tile, change: () => void): void {
  lightUp(tile)
  tile.flipping = true
  window.setTimeout(() => {
    change()
    tile.flipping = false
  }, 200)
}

function tick(): void {
  const claimed = playable.value.filter((t) => t.team !== null)
  const free = playable.value.filter((t) => t.team === null)

  // Stěna nesmí zčernat celá, jinak přestane být čitelná jako deska.
  const shouldClaim = claimed.length < 6 && free.length > 0
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

/* --- Naklonění za kurzorem ------------------------------------------------ */
const tilt = reactive({ x: 0, y: 0 })
let raf = 0

function onPointer(e: PointerEvent): void {
  if (prefersReducedMotion()) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    tilt.x = (e.clientY / window.innerHeight - 0.5) * -4
    tilt.y = (e.clientX / window.innerWidth - 0.5) * 6
  })
}

const wallStyle = computed(() => ({
  transform: `rotateX(calc(4deg + ${tilt.x}deg)) rotateY(calc(-19deg + ${tilt.y}deg))`,
}))

const spotStyle = computed(() => ({ left: `${spot.x}%`, top: `${spot.y}%` }))

/* --- Životní cyklus ------------------------------------------------------- */
const started = ref(false)

function start(): void {
  if (prefersReducedMotion() || timer) return
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') tick()
  }, 2000)
}

function stop(): void {
  window.clearInterval(timer)
  timer = 0
}

function onVisibility(): void {
  if (document.visibilityState === 'hidden') stop()
  else if (started.value) start()
}

onMounted(() => {
  // Nejdřív se stěna rozsvítí, teprve pak se začne hrát.
  window.setTimeout(() => {
    started.value = true
    start()
  }, 1600)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pointermove', onPointer, { passive: true })
})

onBeforeUnmount(() => {
  stop()
  cancelAnimationFrame(raf)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointer)
})

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
        <!-- Stěna ------------------------------------------------------- -->
        <div class="wall" aria-hidden="true">
          <div class="wall__space">
            <div class="wall__grid" :style="wallStyle">
              <span class="wall__spot" :style="spotStyle"></span>
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
          </div>
          <div class="wall__veil"></div>
        </div>

        <!-- Text -------------------------------------------------------- -->
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
main {
  flex: 1;
  display: grid;
  gap: var(--sp-6);
  align-content: center;
  padding-block: var(--sp-7) var(--sp-8);
}

.hero { position: relative; min-height: min(34rem, 62dvh); display: grid; align-items: center; }

/* Stěna --------------------------------------------------------------------
   Sahá za pravý okraj obrazovky, aby působila jako výřez z něčeho většího,
   ne jako obrázek s rámečkem. Ořízne ji overflow-x na body. */
.wall {
  position: absolute;
  top: -6rem;
  bottom: -6rem;
  left: 34%;
  /* Doprava přeteče přes okraj stránky i okna. */
  right: calc((100% - 100vw) / 2 - 6rem);
  pointer-events: none;
}

.wall__space { position: absolute; inset: 0; perspective: 1500px; perspective-origin: 8% 45%; }

.wall__grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(8px, 0.9vw, 18px);
  transform-style: preserve-3d;
  transition: transform 900ms var(--ease-out);
  animation: wallIn 1.4s var(--ease-out) both;
}

/* Světlo za deskou. Přesouvá se k políčku, se kterým se zrovna něco děje. */
.wall__spot {
  position: absolute;
  width: 46%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(140, 165, 255, 0.5) 0%, rgba(120, 140, 255, 0.16) 45%, transparent 70%);
  filter: blur(28px);
  transition: left 1.4s var(--ease-out), top 1.4s var(--ease-out);
  z-index: -1;
}

.tile {
  --i: 0;
  display: grid;
  place-items: center;
  min-width: 0;
  border-radius: clamp(8px, 0.9vw, 18px);
  background: linear-gradient(178deg, var(--c-tile-top) 0%, var(--c-tile-bottom) 100%);
  box-shadow:
    inset 0 1.5px 0 var(--c-tile-sheen),
    inset 0 -2px 0 rgba(0, 0, 0, 0.4),
    0 6px 0 var(--c-tile-edge),
    0 16px 26px -10px rgba(0, 0, 0, 0.8);
  color: var(--c-gold);
  font-size: clamp(0.8rem, 0.3rem + 0.95vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-shadow: 0 -1px 0 rgba(255, 255, 255, 0.18), 0 2px 0 rgba(0, 0, 0, 0.45);
  animation: dealTile var(--dur-slow) var(--ease-out) calc(300ms + var(--i) * 26ms) both;
  transition:
    transform 200ms var(--ease-both),
    background var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}

/* Otočení kolem vodorovné osy. Obsah se vymění v polovině, kdy je políčko
   na hraně a není co číst. */
.tile--flip { transform: rotateX(88deg); }

.tile--team {
  background: linear-gradient(178deg, var(--team) 0%, color-mix(in oklab, var(--team) 76%, black) 100%);
  color: var(--c-text-ink);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.35),
    0 6px 0 color-mix(in oklab, var(--team) 30%, black),
    0 18px 34px -12px color-mix(in oklab, var(--team) 55%, transparent);
  text-shadow: none;
}
.tile--bonus {
  background: linear-gradient(178deg, var(--c-spark) 0%, var(--c-spark-deep) 100%);
  color: var(--c-text-ink);
  font-size: clamp(0.55rem, 0.2rem + 0.55vw, 0.9rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: none;
  animation:
    dealTile var(--dur-slow) var(--ease-out) calc(300ms + var(--i) * 26ms) both,
    beacon 3s var(--ease-both) 1.8s infinite;
}

/* Závoj: vlevo chrání text, vpravo a dole stěna mizí do tmy, takže nemá
   viditelný konec. */
.wall__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, var(--c-base) 0%, var(--c-base) 12%, color-mix(in oklab, var(--c-base) 72%, transparent) 26%, transparent 52%),
    linear-gradient(270deg, var(--c-abyss) 0%, transparent 34%),
    linear-gradient(0deg, var(--c-abyss) 0%, transparent 26%),
    linear-gradient(180deg, var(--c-abyss) 0%, transparent 22%);
}

/* Text ---------------------------------------------------------------------- */
.hero__text { position: relative; z-index: 1; max-width: 30rem; }

.hero__title {
  font-size: clamp(3.5rem, 2rem + 6vw, 8rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 0.92;
  margin: var(--sp-3) 0 var(--sp-4);
  background: linear-gradient(150deg, var(--c-text) 18%, var(--c-gold) 115%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.hero__lead {
  font-size: var(--fs-lg);
  color: var(--c-text-muted);
  text-shadow: 0 2px 12px var(--c-base);
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
  background: color-mix(in oklab, var(--c-base) 70%, transparent);
  color: var(--c-text-muted);
  border: 1px solid var(--c-line);
  box-shadow: none;
  font-weight: 600;
  backdrop-filter: blur(6px);
}
.cta--quiet:hover { color: var(--c-text); border-color: var(--c-surface-3); transform: none; box-shadow: none; }
.cta--quiet:active { transform: none; box-shadow: none; }

.hero__meta { margin-top: var(--sp-4); font-size: var(--fs-sm); color: var(--c-text-faint); }

/* Rozehraná hra ------------------------------------------------------------- */
.resume {
  position: relative;
  z-index: 1;
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

.foot { position: relative; z-index: 1; padding-block: var(--sp-6); color: var(--c-text-faint); font-size: var(--fs-sm); }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes wallIn {
  from { opacity: 0; transform: rotateX(4deg) rotateY(-34deg) translateZ(-260px); }
  to { opacity: 1; }
}
@keyframes dealTile {
  from { opacity: 0; transform: translateY(22px) scale(0.9); }
  to { opacity: 1; transform: none; }
}
@keyframes beacon {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.25); }
}

@media (prefers-reduced-motion: reduce) {
  .hero__title, .hero__lead, .hero__actions, .tile, .wall__grid { animation: none; }
  .tile, .wall__grid, .wall__spot { transition: none; }
}

@media (max-width: 1100px) {
  .wall { left: 22%; top: -3rem; bottom: -3rem; opacity: 0.5; }
  .hero__text { max-width: 26rem; }
}

@media (max-width: 760px) {
  .wall { left: 0; opacity: 0.28; }
  .hero { min-height: 26rem; }
  .hero__text { max-width: none; }
}
</style>
