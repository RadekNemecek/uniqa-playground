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

const LADDER = [200, 400, 600, 800, 1000, 1200]
const TEAMS = 3

interface Tile {
  id: number
  row: number
  col: number
  value: number
  team: number | null
  bonus: boolean
  flipping: boolean
}

/**
 * Dlaždice mají pevný tvar, mění se jejich počet.
 *
 * Původně měla mřížka pevný počet sloupců a řad, takže se na užším okně
 * dlaždice zúžily do stojatých obdélníků. Rozměr se teď odvozuje z úhlopříčky
 * okna, poměr stran zůstává stejný a do plochy se vejde tolik dlaždic,
 * kolik jich je potřeba.
 */
const grid = reactive({ cols: 0, rows: 0, tile: 0, gap: 0 })
const tiles = reactive<Tile[]>([])

const RATIO = 1.6
/** Kolik plochy stěna přesahuje přes okno, viz odsazení .wall__space. */
const OVERSCAN_X = 1.24
const OVERSCAN_Y = 1.32

function layout(): void {
  const diagonal = Math.hypot(window.innerWidth, window.innerHeight)
  const tile = Math.round(Math.min(Math.max(190, diagonal * 0.155), 340))
  const gap = Math.max(8, Math.round(tile * 0.06))
  const cols = Math.max(4, Math.ceil((window.innerWidth * OVERSCAN_X + gap) / (tile + gap)))
  const rows = Math.max(3, Math.ceil((window.innerHeight * OVERSCAN_Y + gap) / (tile / RATIO + gap)))

  if (cols === grid.cols && rows === grid.rows && tile === grid.tile) return
  grid.cols = cols
  grid.rows = rows
  grid.tile = tile
  grid.gap = gap
  rebuild()
}

/** Přestaví mřížku a zachová stav políček, která zůstala na svém místě. */
function rebuild(): void {
  const next: Tile[] = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const kept = tiles.find((t) => t.row === row && t.col === col)
      next.push(
        kept ?? {
          id: 0,
          row,
          col,
          value: LADDER[row % LADDER.length]!,
          team: null,
          bonus: false,
          flipping: false,
        },
      )
    }
  }
  for (const t of next) {
    t.id = t.row * grid.cols + t.col
    t.value = LADDER[t.row % LADDER.length]!
    t.bonus = false
  }
  const bonus = next.find((t) => t.row === 1 && t.col === Math.max(0, grid.cols - 3))
  if (bonus) {
    bonus.bonus = true
    bonus.team = null
  }
  tiles.splice(0, tiles.length, ...next)
}

const playable = computed(() => tiles.filter((t) => !t.bonus))

/* --- Světlo chodí za děním ------------------------------------------------ */
const spot = reactive({ x: 50, y: 45 })

/* --- Deska se hraje sama --------------------------------------------------- */
let timer = 0
let nextTeam = 0

function flip(tile: Tile, change: () => void): void {
  spot.x = ((tile.col + 0.5) / grid.cols) * 100
  spot.y = ((tile.row + 0.5) / grid.rows) * 100
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
  const shouldClaim = claimed.length < Math.max(6, Math.round(playable.value.length * 0.12)) && free.length > 0
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
  // Až po načtení písma, jinak by odskoky písmen seděly na náhradní řez.
  layout()
  void document.fonts.ready.then(paintWordmark)
  window.addEventListener('resize', onResize)
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
  window.clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointer)
})

/** Titulek se skládá po písmenech, každé se otočí jako dlaždice na desce. */
const letters = [...'Riskuj']

/**
 * Přechod přes celé slovo, ne přes každé písmeno.
 *
 * Písmena musí být samostatné prvky kvůli otáčení, takže každé z nich má
 * vlastní pozadí. Aby dohromady daly jeden spojitý přechod, dostane každé
 * pozadí šířku celého nápisu a posune se o svůj vlastní odskok. Přechod
 * na rodiči by kvůli transformaci písmen nesedl.
 */
const wordmark = ref<HTMLElement | null>(null)
const gradientReady = ref(false)

function paintWordmark(): void {
  const el = wordmark.value
  if (!el || el.offsetWidth === 0) return
  // offsetLeft, ne getBoundingClientRect: písmena se při nástupu otáčejí
  // a jejich vykreslený obdélník je kvůli perspektivě posunutý. Odskok
  // musí vycházet z rozvržení, ne z toho, kde zrovna jsou.
  for (const letter of el.querySelectorAll<HTMLElement>('.wordmark__l')) {
    letter.style.setProperty('--gw', `${el.offsetWidth}px`)
    letter.style.setProperty('--gx', `${el.offsetLeft - letter.offsetLeft}px`)
  }
  gradientReady.value = true
}

let resizeTimer = 0
function onResize(): void {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    layout()
    paintWordmark()
  }, 140)
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

    <main class="hero">
      <!-- Deska v pozadí ------------------------------------------------- -->
      <div class="wall" aria-hidden="true">
        <div class="wall__x">
          <div class="wall__space">
            <span class="wall__spot" :style="spotStyle"></span>
            <div
              class="wall__grid"
              :style="{
                ...wallStyle,
                '--cols': grid.cols,
                '--tile': `${grid.tile}px`,
                '--gap': `${grid.gap}px`,
              }"
            >
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
                  '--d': t.row + t.col,
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
        <h1 ref="wordmark" class="wordmark" :class="{ 'wordmark--painted': gradientReady }" aria-label="Riskuj">
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
}

/* Stěna --------------------------------------------------------------------
   Vyplňuje celou obrazovku včetně plochy pod záhlavím. Je fixovaná, takže
   nezasahuje do rozvržení. Mřížka schválně přesahuje přes okraje okna, aby
   po natočení do prostoru nikde nezbyl prázdný pruh. Okraje se nemaskují,
   deska má obrazovku pokrýt celou, tmu na text dělá vinětace. */
.wall {
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  /* Deska je symbol, ne obsah. Ztlumená a lehce odbarvená ustoupí do
     pozadí a nepere se s titulkem. */
  opacity: 0.42;
  filter: saturate(0.85);
}

.wall__space {
  position: absolute;
  inset: -16% -12%;
  perspective: 1700px;
  perspective-origin: 50% 42%;
}

.wall__grid {
  position: absolute;
  inset: 0;
  display: grid;
  /* Pevná šířka sloupce a výška řady odvozená z poměru stran. Díky tomu
     má dlaždice pořád stejný tvar, ať je okno jakkoli široké. */
  grid-template-columns: repeat(var(--cols), var(--tile));
  grid-auto-rows: calc(var(--tile) / 1.6);
  gap: var(--gap);
  justify-content: center;
  align-content: center;
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
  --d: 0;
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
  font-size: calc(var(--tile) * 0.115);
  font-weight: 800;
  text-shadow: 0 -1px 0 rgba(255, 255, 255, 0.16), 0 2px 0 rgba(0, 0, 0, 0.45);
  /* Nástup jde po úhlopříčce, ne po pořadí, aby se u velké desky
     nečekalo několik sekund na poslední dlaždici. */
  animation: dealTile var(--dur-slow) var(--ease-out) calc(180ms + var(--d) * 34ms) both;
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
  font-size: calc(var(--tile) * 0.062);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: none;
  animation:
    dealTile var(--dur-slow) var(--ease-out) calc(180ms + var(--d) * 34ms) both,
    beacon 3s var(--ease-both) 2s infinite;
}

/* Vinětace: tma pod titulkem a pod záhlavím, aby text držel kontrast.
   Gradienty končí průhledně uvnitř své plochy, takže nemají viditelný okraj. */
.vignette {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(62% 58% at 50% 46%, var(--c-abyss) 0%, color-mix(in oklab, var(--c-abyss) 88%, transparent) 42%, transparent 74%),
    linear-gradient(180deg, var(--c-abyss) 0%, color-mix(in oklab, var(--c-abyss) 55%, transparent) 9%, transparent 20%),
    linear-gradient(0deg, var(--c-abyss) 0%, transparent 26%);
}

/* Titulek ------------------------------------------------------------------- */
.title { position: relative; z-index: 1; align-self: center; display: grid; justify-items: center; text-align: center; }

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
  /* Spodní mezera se počítá z velikosti písma, aby dotah „j" nikdy
     nedosedl na odstavec pod titulkem. */
  margin: clamp(var(--sp-2), 1.6vh, var(--sp-4)) 0 0.1em;
  /* Titulek má nést celou stránku, proto se roztahuje podle šířky i výšky
     okna. Strop v obou osách brání tomu, aby na širokém nebo nízkém
     monitoru přerostl plochu. */
  font-size: clamp(3rem, min(27vw, 42vh), 26rem);
  font-weight: 800;
  /* Řádkování musí nechat místo dotahu u „j". Při 0,82 se dotahovalo do
     odstavce pod titulkem. */
  line-height: 0.95;
  letter-spacing: -0.015em;
  perspective: 900px;
}
.wordmark__l {
  display: inline-block;
  /* Jednolitá barva, ne přechod. Přechod na písmu je otřepaný a hlavně
     seděl na každém písmenu zvlášť, takže se bílá a zlatá střídaly šestkrát
     přes jedno slovo. Zlatá navíc v celé aplikaci znamená akci, tady by
     tenhle význam rozmělnila. */
  color: var(--c-text);
  /* Žádný posunutý stín, ten dělá z písma plastiku. Jen tmavá svatozář
     bez odsazení, aby nápis držel čitelnost i nad světlou dlaždicí. */
  text-shadow: 0 0 0.3em color-mix(in oklab, var(--c-abyss) 70%, transparent);
  /* Písmena se otáčejí jako dlaždice na desce. */
  animation: letterIn 760ms var(--ease-back) calc(240ms + var(--n) * 85ms) both;
}

/* Přechod se nasadí, až když jsou změřené odskoky písmen. Do té doby drží
   plná barva, aby nebyl vidět přechod opakovaný na každém písmenu. */
.wordmark--painted .wordmark__l {
  background-image: linear-gradient(
    96deg,
    color-mix(in oklab, var(--c-text) 88%, var(--c-team-6)) 0%,
    var(--c-text) 38%,
    color-mix(in oklab, var(--c-gold) 44%, var(--c-text)) 100%
  );
  background-size: var(--gw, 100%) 100%;
  background-position: var(--gx, 0) 0;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
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
  position: relative;
  z-index: 1;
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
