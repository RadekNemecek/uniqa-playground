<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { hasGame, game } from '@/stores/game'
import { packs } from '@/stores/packs'
import { count } from '@/lib/format'
import { teamBadge, teamColor } from '@/lib/teams'
import { prefersReducedMotion } from '@/lib/motion'

/* --- Studiová stěna v pozadí ---------------------------------------------
   Deska vyplňuje celou plochu za titulkem, natočená a ztlumená. Sama se
   pomalu hraje a světlo chodí za políčkem, se kterým se zrovna něco děje.
   Uprostřed ji tlumí vinětace, aby text držel kontrast. */

const COLS = 8
const ROWS = [200, 400, 600, 800, 1000]
const TEAMS = 3
const BONUS_ID = 19

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

/* --- Světlo chodí za děním ------------------------------------------------ */
const spot = reactive({ x: 50, y: 45 })

/* --- Deska se hraje sama --------------------------------------------------- */
let timer = 0
let nextTeam = 0

function flip(tile: Tile, change: () => void): void {
  spot.x = ((tile.col + 0.5) / COLS) * 100
  spot.y = ((tile.row + 0.5) / ROWS.length) * 100
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
  const shouldClaim = claimed.length < 8 && free.length > 0
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

/* --- Naklonění za kurzorem ------------------------------------------------- */
const tilt = reactive({ x: 0, y: 0 })
let raf = 0

function onPointer(e: PointerEvent): void {
  if (prefersReducedMotion()) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    tilt.x = (e.clientY / window.innerHeight - 0.5) * -3
    tilt.y = (e.clientX / window.innerWidth - 0.5) * 5
  })
}

const wallStyle = computed(() => ({
  transform: `rotateX(calc(9deg + ${tilt.x}deg)) rotateY(calc(-7deg + ${tilt.y}deg)) scale(1.04)`,
}))
const spotStyle = computed(() => ({ left: `${spot.x}%`, top: `${spot.y}%` }))

/* --- Životní cyklus -------------------------------------------------------- */
const started = ref(false)

function start(): void {
  if (prefersReducedMotion() || timer) return
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') tick()
  }, 1900)
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
  window.setTimeout(() => {
    started.value = true
    start()
  }, 1800)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pointermove', onPointer, { passive: true })
})

onBeforeUnmount(() => {
  stop()
  cancelAnimationFrame(raf)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointer)
})

/** Titulek se skládá po písmenech, každé se otočí jako dlaždice na desce. */
const letters = [...'Riskuj']

const packLabel = computed(() =>
  packs.packs.length
    ? `${count(packs.packs.length, 'balíček', 'balíčky', 'balíčků')} otázek připraveno`
    : 'Zatím bez otázek',
)
</script>

<template>
  <div class="home">
    <AppHeader />

    <main class="hero">
      <!-- Deska v pozadí ------------------------------------------------- -->
      <div class="wall" aria-hidden="true">
        <div class="wall__x">
          <div class="wall__space">
            <span class="wall__spot" :style="spotStyle"></span>
            <div class="wall__grid" :style="wallStyle">
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
        </div>
      </div>

      <div class="vignette" aria-hidden="true"></div>

      <!-- Titulek --------------------------------------------------------- -->
      <div class="title">
        <p class="title__kicker">Vědomostní hra pro školení</p>
        <h1 class="wordmark" aria-label="Riskuj">
          <span
            v-for="(ch, i) in letters"
            :key="i"
            class="wordmark__l"
            :style="{ '--n': i }"
            aria-hidden="true"
          >{{ ch }}</span>
        </h1>
        <p class="title__lead">
          Týmy si volí kategorii a bodovou hodnotu, ty odkrýváš otázky
          a rozdáváš body. Až šest týmů, časomíra a bonusová pole.
        </p>
      </div>

      <!-- Spodní lišta ---------------------------------------------------- -->
      <div class="bottom">
        <RouterLink v-if="hasGame && game" to="/riskuj" class="resume">
          <span class="resume__dot" aria-hidden="true"></span>
          Pokračovat v rozehrané hře: {{ game.packName }},
          {{ count(game.teams.length, 'tým', 'týmy', 'týmů') }}
        </RouterLink>

        <RouterLink to="/riskuj" class="cta">
          Spustit hru
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </RouterLink>

        <p class="bottom__meta">
          <RouterLink to="/admin">Připravit otázky</RouterLink>
          <span aria-hidden="true">&middot;</span>
          <span>{{ packLabel }}</span>
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home { min-height: 100dvh; display: flex; flex-direction: column; }

.hero {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  padding: var(--sp-4) var(--sp-5) var(--sp-6);
  isolation: isolate;
  /* Stěna schválně přetéká za okraje. Clip ji zadrží, aniž by vznikl
     scroll kontejner, a maska ji stejně dřív rozpustí. */
  overflow: clip;
}

/* Stěna --------------------------------------------------------------------
   Vyplňuje celou plochu a přetéká za okraje okna, aby neměla viditelný
   konec. Okraje neztmavuje překryv, ale maska: nic nedobarvuje, jen nechá
   stěnu zmizet, takže nevzniká hrana ani tam, kde ji natočení posune.
   Vodorovná a svislá maska jsou ve dvou vrstvách, protože složit je do
   jedné by vyžadovalo mask-composite, který starší prohlížeče neumí. */
.wall {
  position: absolute;
  inset: 0 -3rem;
  z-index: -2;
  pointer-events: none;
  opacity: 0.62;
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 17%, #000 83%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 17%, #000 83%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
.wall__x {
  position: absolute;
  inset: 0;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

/* Odsazení dovnitř, aby se natočená mřížka vešla do maskované plochy. */
.wall__space {
  position: absolute;
  inset: 11% 9%;
  perspective: 1600px;
  perspective-origin: 50% 40%;
}

.wall__grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: clamp(8px, 0.8vw, 16px);
  transform-style: preserve-3d;
  transition: transform 900ms var(--ease-out);
  animation: wallIn 1.6s var(--ease-out) both;
}

.wall__spot {
  position: absolute;
  width: 34%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(150, 175, 255, 0.55) 0%, rgba(120, 140, 255, 0.18) 45%, transparent 70%);
  filter: blur(30px);
  transition: left 1.5s var(--ease-out), top 1.5s var(--ease-out);
}

.tile {
  --i: 0;
  display: grid;
  place-items: center;
  min-width: 0;
  border-radius: clamp(6px, 0.7vw, 14px);
  background: linear-gradient(178deg, var(--c-tile-top) 0%, var(--c-tile-bottom) 100%);
  box-shadow:
    inset 0 1.5px 0 var(--c-tile-sheen),
    inset 0 -2px 0 rgba(0, 0, 0, 0.4),
    0 5px 0 var(--c-tile-edge),
    0 14px 22px -10px rgba(0, 0, 0, 0.8);
  color: var(--c-gold);
  font-size: clamp(0.6rem, 0.2rem + 0.7vw, 1.1rem);
  font-weight: 800;
  text-shadow: 0 -1px 0 rgba(255, 255, 255, 0.16), 0 2px 0 rgba(0, 0, 0, 0.45);
  animation: dealTile var(--dur-slow) var(--ease-out) calc(200ms + var(--i) * 18ms) both;
  transition:
    transform 200ms var(--ease-both),
    background var(--dur-base) var(--ease-out),
    color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
.tile--flip { transform: rotateX(88deg); }
.tile--team {
  background: linear-gradient(178deg, var(--team) 0%, color-mix(in oklab, var(--team) 76%, black) 100%);
  color: var(--c-text-ink);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.35),
    0 5px 0 color-mix(in oklab, var(--team) 30%, black),
    0 16px 30px -12px color-mix(in oklab, var(--team) 55%, transparent);
  text-shadow: none;
}
.tile--bonus {
  background: linear-gradient(178deg, var(--c-spark) 0%, var(--c-spark-deep) 100%);
  color: var(--c-text-ink);
  font-size: clamp(0.42rem, 0.15rem + 0.42vw, 0.7rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: none;
  animation:
    dealTile var(--dur-slow) var(--ease-out) calc(200ms + var(--i) * 18ms) both,
    beacon 3s var(--ease-both) 2s infinite;
}

/* Vinětace: tma pod titulkem, aby text držel kontrast. Gradient končí
   průhledně uvnitř své plochy, takže nemá viditelný okraj. */
.vignette {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(62% 58% at 50% 42%, var(--c-abyss) 0%, color-mix(in oklab, var(--c-abyss) 82%, transparent) 42%, transparent 74%),
    radial-gradient(80% 46% at 50% 100%, var(--c-abyss) 0%, transparent 70%);
}

/* Titulek ------------------------------------------------------------------- */
.title { align-self: center; display: grid; justify-items: center; text-align: center; }

.title__kicker {
  font-size: var(--fs-sm);
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--c-text-faint);
  animation: rise var(--dur-slow) var(--ease-out) both;
}

.wordmark {
  display: flex;
  margin: clamp(var(--sp-2), 1.6vh, var(--sp-4)) 0;
  /* Titulek má nést celou stránku, proto se roztahuje podle šířky i výšky
     okna. Strop v obou osách brání tomu, aby na širokém nebo nízkém
     monitoru přerostl plochu. */
  font-size: clamp(3rem, min(27vw, 42vh), 26rem);
  font-weight: 800;
  line-height: 0.82;
  letter-spacing: -0.015em;
  perspective: 900px;
}
.wordmark__l {
  display: inline-block;
  background: linear-gradient(168deg, var(--c-text) 12%, var(--c-gold) 108%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  /* Písmena se otáčejí jako dlaždice na desce. */
  animation: letterIn 760ms var(--ease-back) calc(240ms + var(--n) * 85ms) both;
}

.title__lead {
  max-width: 46ch;
  font-size: clamp(var(--fs-md), 0.9rem + 0.5vw, var(--fs-xl));
  color: var(--c-text-muted);
  text-wrap: balance;
  animation: rise var(--dur-slow) var(--ease-out) 820ms both;
}

/* Spodní lišta -------------------------------------------------------------- */
.bottom {
  align-self: end;
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  animation: rise var(--dur-slow) var(--ease-out) 980ms both;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-5) var(--sp-8);
  border-radius: var(--r-full);
  background: linear-gradient(180deg, var(--c-gold) 0%, var(--c-gold-deep) 100%);
  color: var(--c-text-ink);
  font-size: clamp(var(--fs-lg), 0.9rem + 0.6vw, 1.6rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-decoration: none;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.5), 0 20px 40px -14px var(--c-gold-glow);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.cta:hover { transform: translateY(-3px); box-shadow: 0 8px 0 rgba(0, 0, 0, 0.5), 0 28px 52px -16px var(--c-gold-glow); }
.cta:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5); }

.bottom__meta {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  justify-content: center;
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
}
.bottom__meta a { color: var(--c-text-muted); font-weight: 600; text-decoration: none; }
.bottom__meta a:hover { color: var(--c-text); text-decoration: underline; text-underline-offset: 0.25em; }

.resume {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid color-mix(in oklab, var(--c-gold) 42%, transparent);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-gold) 10%, var(--c-abyss));
  color: var(--c-text);
  font-size: var(--fs-sm);
  text-decoration: none;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.resume:hover { border-color: var(--c-gold); background: color-mix(in oklab, var(--c-gold) 18%, var(--c-abyss)); }
.resume__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--r-full);
  background: var(--c-gold);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--c-gold) 22%, transparent);
}

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes letterIn {
  from { opacity: 0; transform: rotateX(-92deg) translateY(0.22em); }
  to { opacity: 1; transform: none; }
}
@keyframes wallIn {
  from { opacity: 0; transform: rotateX(9deg) rotateY(-7deg) scale(1.18); }
  to { opacity: 1; }
}
@keyframes dealTile {
  from { opacity: 0; transform: translateY(18px) scale(0.92); }
  to { opacity: 1; transform: none; }
}
@keyframes beacon {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.3); }
}

@media (prefers-reduced-motion: reduce) {
  .title__kicker, .wordmark__l, .title__lead, .bottom, .tile, .wall__grid { animation: none; }
  .tile, .wall__grid, .wall__spot { transition: none; }
}

@media (max-width: 700px) {
  .wall { opacity: 0.4; }
  .wordmark { letter-spacing: -0.04em; }
  .cta { padding: var(--sp-4) var(--sp-6); }
}
</style>
