<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { GAMES } from '@/games/registry'
import { hasGame, game } from '@/stores/game'
import { packs } from '@/stores/packs'
import { count } from '@/lib/format'
import { teamColor } from '@/lib/teams'

/**
 * Deska na úvodní stránce. Není to hra, je to obraz hry: na první pohled
 * má být jasné, o čem aplikace je. Jedno políčko je bonusové, jedno už
 * získal tým, aby byl vidět i princip bodování.
 */
const BOARD = [
  [{ v: 200 }, { v: 200 }, { v: 200 }, { v: 200 }],
  [{ v: 400 }, { v: 400, team: 0 }, { v: 400 }, { v: 400 }],
  [{ v: 600 }, { v: 600 }, { v: 600, bonus: true }, { v: 600 }],
] as Array<Array<{ v: number; team?: number; bonus?: boolean }>>

const tiles = computed(() =>
  BOARD.flatMap((row, r) =>
    row.map((tile, c) => ({ ...tile, key: `${r}-${c}`, i: r * row.length + c })),
  ),
)

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
          <p class="eyebrow">Interaktivní hry pro školení</p>
          <h1 class="hero__title">Playground</h1>
          <p class="hero__lead">
            Připrav si otázky dopředu, hru pak vedeš jedním klikáním
            před celou místností.
          </p>

          <div class="hero__actions">
            <RouterLink to="/riskuj" class="cta">
              Hrát Riskuj
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M5 12h13M12 5l7 7-7 7" />
              </svg>
            </RouterLink>
            <RouterLink to="/admin" class="cta cta--quiet">Připravit otázky</RouterLink>
          </div>

          <p class="hero__meta">{{ packLabel }}</p>
        </div>

        <!-- Obraz herní desky ------------------------------------------- -->
        <div class="board" aria-hidden="true">
          <span
            v-for="t in tiles"
            :key="t.key"
            class="tile"
            :class="{ 'tile--team': t.team !== undefined, 'tile--bonus': t.bonus }"
            :style="{
              '--i': t.i,
              '--team': t.team !== undefined ? `var(${teamColor(t.team).cssVar})` : undefined,
            }"
          >
            <template v-if="t.team !== undefined">A</template>
            <template v-else-if="t.bonus">Riskuj!</template>
            <template v-else>{{ t.v }}</template>
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

      <!-- Seznam her. Zatím jedna, ale místo pro další tu je. ----------- -->
      <section class="games" aria-label="Hry">
        <h2 class="games__title">Hry</h2>
        <ul class="games__list">
          <li v-for="g in GAMES" :key="g.slug">
            <RouterLink :to="g.route" class="entry">
              <span class="entry__name">{{ g.title }}</span>
              <span class="entry__desc">{{ g.description }}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <path d="M5 12h13M12 5l7 7-7 7" />
              </svg>
            </RouterLink>
          </li>
        </ul>
      </section>
    </main>

    <footer class="foot page">
      <p>Funguje i bez připojení k internetu.</p>
    </footer>
  </div>
</template>

<style scoped>
.home { min-height: 100dvh; display: flex; flex-direction: column; }
main { flex: 1; padding-block: var(--sp-7) var(--sp-8); display: grid; gap: var(--sp-6); align-content: start; }

/* Hero --------------------------------------------------------------------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: var(--sp-8);
  align-items: center;
}
.hero__text { max-width: 34rem; }

.hero__title {
  font-size: var(--fs-hero);
  font-weight: 800;
  letter-spacing: -0.035em;
  margin: var(--sp-2) 0 var(--sp-4);
  background: linear-gradient(160deg, var(--c-text) 22%, var(--c-gold) 130%);
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

/* Obraz desky -------------------------------------------------------------- */
.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(8px, 0.8vw, 14px);
  perspective: 1200px;
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
  font-size: clamp(1rem, 0.4rem + 1.5vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-shadow: 0 -1px 0 rgba(255, 255, 255, 0.18), 0 2px 0 rgba(0, 0, 0, 0.45);
  animation: deal var(--dur-slow) var(--ease-out) calc(120ms + var(--i) * 55ms) both;
}

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
  font-size: clamp(0.7rem, 0.3rem + 0.85vw, 1.05rem);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-shadow: none;
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

/* Seznam her --------------------------------------------------------------- */
.games { display: grid; gap: var(--sp-3); }
.games__title {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.games__list { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.entry {
  display: grid;
  grid-template-columns: minmax(6rem, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.entry:hover { border-color: color-mix(in oklab, var(--c-gold) 45%, var(--c-line)); transform: translateX(3px); }
.entry:hover svg { color: var(--c-gold); }
.entry__name { font-size: var(--fs-lg); font-weight: 700; }
.entry__desc { font-size: var(--fs-sm); color: var(--c-text-faint); }
.entry svg { color: var(--c-text-faint); transition: color var(--dur-fast) var(--ease-out); }

.foot { padding-block: var(--sp-6); color: var(--c-text-faint); font-size: var(--fs-sm); }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes deal {
  from { opacity: 0; transform: translateY(26px) rotateX(22deg); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__title, .hero__lead, .hero__actions, .tile { animation: none; }
}

@media (max-width: 960px) {
  .hero { grid-template-columns: minmax(0, 1fr); gap: var(--sp-6); }
  .hero__text { max-width: none; }
  .board { max-width: 32rem; }
  .entry { grid-template-columns: minmax(0, 1fr) auto; }
  .entry__desc { display: none; }
}
</style>
