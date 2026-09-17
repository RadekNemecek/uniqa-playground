<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { game, hasGame } from '@/stores/game'
import { hasQuiz, quiz } from '@/stores/quizHost'
import { count } from '@/lib/format'
import { GAMES, type GameEntry } from '@/games/registry'
import { hasSessionDb } from '@/lib/sessionDb'

const router = useRouter()

interface GameCard {
  entry: GameEntry
  resume: string | null
  warn: string | null
}

function resumeLabel(entry: GameEntry): string | null {
  if (entry.slug === 'pojistuj' && hasGame.value && game.value) {
    return `${game.value.packName} · ${count(game.value.teams.length, 'tým', 'týmy', 'týmů')}`
  }

  if (entry.slug === 'kviz' && hasQuiz.value && quiz.value) {
    const state = quiz.value
    if (state.phase === 'lobby') return `Čekárna · ${count(state.questions.length, 'otázka', 'otázky', 'otázek')}`
    if (state.phase === 'final') return 'Výsledky poslední hry'
    return `Otázka ${Math.min(state.index + 1, state.questions.length)} z ${state.questions.length}`
  }

  return null
}

const cards = computed<GameCard[]>(() =>
  GAMES.map((entry) => ({
    entry,
    resume: resumeLabel(entry),
    warn:
      entry.needsShared && !hasSessionDb()
        ? 'Telefony se teď nepřipojí. Hru můžeš dál vést jen z plátna.'
        : null,
  })),
)

function open(entry: GameEntry): void {
  void router.push(entry.route)
}
</script>

<template>
  <div class="home">
    <AppHeader />

    <main>
      <section class="hero page" aria-labelledby="home-title">
        <div class="hero__copy">
          <p class="hero__kicker">Školení, do kterého se zapojí všichni</p>
          <h1 id="home-title" class="hero__title">Co si dnes zahrajete?</h1>
        </div>

        <div class="playfield" aria-hidden="true">
          <div class="playfield__ring"></div>
          <span class="playfield__orbit playfield__orbit--score">
            <span class="playfield__token playfield__token--score">400</span>
          </span>
          <span class="playfield__orbit playfield__orbit--team">
            <span class="playfield__token playfield__token--team">A</span>
          </span>
          <span class="playfield__orbit playfield__orbit--shape">
            <span class="playfield__token playfield__token--shape">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3 22 20H2z" />
              </svg>
            </span>
          </span>
          <span class="playfield__orbit playfield__orbit--answer">
            <span class="playfield__token playfield__token--answer">B</span>
          </span>
          <span class="playfield__core">
            <strong>Hrajte</strong>
            <small>společně</small>
          </span>
        </div>
      </section>

      <section class="choice page" aria-label="Vyber hru">
        <ul class="games">
          <li
            v-for="(card, index) in cards"
            :key="card.entry.slug"
            class="game-card"
            :class="`game-card--${card.entry.slug}`"
          >
            <div class="game-card__preview" aria-hidden="true">
              <template v-if="card.entry.slug === 'pojistuj'">
                <div class="mini-board">
                  <span class="mini-board__category">Majetek</span>
                  <span class="mini-board__category">Život</span>
                  <span class="mini-board__category">Auto</span>
                  <template v-for="value in [200, 400, 600]" :key="value">
                    <span v-for="column in 3" :key="`${value}-${column}`" class="mini-board__tile">
                      {{ value }}
                    </span>
                  </template>
                </div>
                <span class="preview-label">Týmy si volí pole</span>
              </template>

              <template v-else>
                <div class="mini-quiz">
                  <div class="mini-quiz__top">
                    <span>Otázka 7 z 10</span>
                    <span class="mini-quiz__time">14 s</span>
                  </div>
                  <p>Která odpověď platí?</p>
                  <div class="mini-quiz__options">
                    <span class="mini-option mini-option--a">A</span>
                    <span class="mini-option mini-option--b">B</span>
                    <span class="mini-option mini-option--c">C</span>
                    <span class="mini-option mini-option--d">D</span>
                  </div>
                </div>
                <span class="preview-label">Každý odpovídá za sebe</span>
              </template>
            </div>

            <div class="game-card__body">
              <div class="game-card__index">0{{ index + 1 }}</div>
              <div class="game-card__heading">
                <p class="game-card__tagline">{{ card.entry.tagline }}</p>
                <h3>{{ card.entry.title }}</h3>
              </div>
              <p class="game-card__description">{{ card.entry.description }}</p>

              <div class="game-card__meta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="14" rx="2" />
                  <path d="M8 22h8M12 18v4" />
                </svg>
                {{ card.entry.needs }}
              </div>

              <p v-if="card.warn" class="game-card__warn">{{ card.warn }}</p>

              <div class="game-card__actions">
                <button type="button" class="game-card__play" @click="open(card.entry)">
                  {{ card.resume ? 'Pokračovat' : 'Připravit hru' }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                    <path d="M5 12h13M12 5l7 7-7 7" />
                  </svg>
                </button>
                <RouterLink :to="card.entry.editRoute" class="game-card__questions">
                  Spravovat otázky
                </RouterLink>
              </div>

              <p v-if="card.resume" class="game-card__resume">
                <span aria-hidden="true"></span>
                Rozehráno: {{ card.resume }}
              </p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100dvh;
  overflow: clip;
  background:
    radial-gradient(circle at 82% 8%, color-mix(in oklab, var(--c-brand) 16%, transparent), transparent 30%),
    radial-gradient(circle at 10% 38%, color-mix(in oklab, var(--c-team-2) 8%, transparent), transparent 34%);
}

.home::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(color-mix(in oklab, var(--c-line) 20%, transparent) var(--separator-w), transparent var(--separator-w)),
    linear-gradient(90deg, color-mix(in oklab, var(--c-line) 20%, transparent) var(--separator-w), transparent var(--separator-w));
  background-size: var(--sp-9) var(--sp-9);
  mask-image: linear-gradient(to bottom, transparent, var(--c-text) 18%, transparent 70%);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(var(--home-aside-min), 0.85fr);
  align-items: center;
  gap: var(--sp-8);
  min-height: min(var(--home-hero-min), calc(100dvh - var(--header-h)));
  padding-block: var(--sp-7) var(--sp-5);
}

.hero__copy { max-width: var(--content-narrow); }
.hero__kicker {
  margin-bottom: var(--sp-4);
  color: var(--c-brand);
  font-family: var(--font-hand);
  font-size: var(--fs-3xl);
  font-weight: 500;
  line-height: var(--lh-snug);
}
.hero__title {
  max-width: 11ch;
  font-size: var(--fs-home-hero);
  letter-spacing: -0.045em;
}

.playfield {
  position: relative;
  justify-self: center;
  width: min(100%, var(--home-visual));
  aspect-ratio: 1;
  border-radius: var(--r-full);
}
.playfield::before,
.playfield::after,
.playfield__ring {
  content: '';
  position: absolute;
  inset: var(--sp-7);
  border: var(--separator-w) solid color-mix(in oklab, var(--c-brand) 32%, transparent);
  border-radius: var(--r-full);
}
.playfield::before { inset: var(--sp-3); opacity: 0.35; }
.playfield::after { inset: var(--sp-9); opacity: 0.55; }
.playfield__ring {
  inset: var(--sp-6);
  border-style: dashed;
}
.playfield__core {
  position: absolute;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-lg);
}
.playfield__core {
  inset: 31%;
  align-content: center;
  border: var(--separator-w) solid var(--c-line);
  border-radius: var(--r-full);
  background: radial-gradient(circle at 38% 28%, var(--c-surface-3), var(--c-surface));
  text-align: center;
  animation: coreGlow var(--dur-breathe) var(--ease-both) infinite alternate;
}
.playfield__core strong { font-size: var(--fs-xl); }
.playfield__core small { color: var(--c-text-muted); font-size: var(--fs-xs); }
.playfield__orbit {
  position: absolute;
  inset: var(--sp-3);
  animation: orbit var(--dur-orbit) linear infinite;
}
.playfield__orbit--team,
.playfield__orbit--answer { inset: var(--sp-7); animation-duration: var(--dur-orbit-slow); }
.playfield__orbit--score { animation-delay: var(--dur-orbit-score-delay); }
.playfield__orbit--shape { animation-delay: var(--dur-orbit-shape-delay); }
.playfield__orbit--team { animation-delay: var(--dur-orbit-team-delay); }
.playfield__orbit--answer { animation-delay: var(--dur-orbit-answer-delay); }
.playfield__token {
  position: absolute;
  top: 0;
  left: 50%;
  display: grid;
  place-items: center;
  width: var(--home-token);
  aspect-ratio: 1;
  border: var(--separator-w) solid color-mix(in oklab, var(--c-text) 18%, transparent);
  border-radius: var(--r-xl);
  font-size: var(--fs-xl);
  font-weight: 900;
  transform: translate(-50%, -50%);
  animation: counterOrbit var(--dur-orbit) linear infinite;
}
.playfield__orbit--team .playfield__token,
.playfield__orbit--answer .playfield__token { animation-duration: var(--dur-orbit-slow); }
.playfield__orbit--score .playfield__token { animation-delay: var(--dur-orbit-score-delay); }
.playfield__orbit--shape .playfield__token { animation-delay: var(--dur-orbit-shape-delay); }
.playfield__orbit--team .playfield__token { animation-delay: var(--dur-orbit-team-delay); }
.playfield__orbit--answer .playfield__token { animation-delay: var(--dur-orbit-answer-delay); }
.playfield__token svg { width: 46%; }
.playfield__token--score { background: linear-gradient(160deg, var(--c-tile-top), var(--c-tile-bottom)); color: var(--c-value); }
.playfield__token--team { background: var(--c-team-1); color: var(--c-text-ink); }
.playfield__token--shape { background: var(--c-team-3); color: var(--c-text-ink); }
.playfield__token--answer { background: var(--c-team-4); color: var(--c-text-ink); }

.choice { padding-block: var(--sp-5) var(--sp-9); }

.games {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-5);
  padding: 0;
  list-style: none;
}
.game-card {
  min-width: 0;
  overflow: hidden;
  border: var(--separator-w) solid var(--c-line);
  border-radius: var(--r-xl);
  background: color-mix(in oklab, var(--c-surface) 92%, transparent);
  box-shadow: var(--shadow-md);
  transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.game-card:hover { border-color: var(--c-brand); transform: translateY(calc(var(--sp-1) * -1)); box-shadow: var(--shadow-lg); }
.game-card__preview {
  position: relative;
  min-height: var(--home-preview-h);
  padding: var(--sp-5);
  overflow: hidden;
  border-bottom: var(--separator-w) solid var(--c-line);
  background:
    linear-gradient(145deg, color-mix(in oklab, var(--c-surface-3) 82%, transparent), var(--c-sunken)),
    var(--c-surface-2);
}
.preview-label {
  position: absolute;
  right: var(--sp-4);
  bottom: var(--sp-4);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--c-abyss) 78%, transparent);
  color: var(--c-text-muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.mini-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-2);
  width: 84%;
  transform: perspective(var(--home-perspective)) rotateX(7deg) rotateZ(-2deg);
  transform-origin: bottom left;
}
.mini-board__category {
  overflow: hidden;
  color: var(--c-text-muted);
  font-size: var(--fs-xs);
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini-board__tile {
  display: grid;
  place-items: center;
  min-height: var(--sp-7);
  border-radius: var(--r-md);
  background: linear-gradient(180deg, var(--c-tile-top), var(--c-tile-bottom));
  box-shadow: inset 0 var(--separator-w) 0 var(--c-tile-sheen), 0 var(--sp-1) 0 var(--c-tile-edge);
  color: var(--c-value);
  font-size: var(--fs-sm);
  font-weight: 900;
  transition: transform var(--dur-base) var(--ease-out);
}
.game-card:hover .mini-board__tile:nth-child(8) { transform: translateY(calc(var(--sp-2) * -1)); }

.mini-quiz { display: grid; gap: var(--sp-3); width: 86%; }
.mini-quiz__top { display: flex; justify-content: space-between; color: var(--c-text-faint); font-size: var(--fs-xs); font-weight: 700; }
.mini-quiz__time { color: var(--c-brand); }
.mini-quiz > p { color: var(--c-text); font-size: var(--fs-lg); font-weight: 900; }
.mini-quiz__options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-2); }
.mini-option {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: var(--sp-7);
  padding-inline: var(--sp-3);
  border-radius: var(--r-md);
  color: var(--c-text-ink);
  font-size: var(--fs-sm);
  font-weight: 900;
  transition: transform var(--dur-base) var(--ease-out);
}
.mini-option--a { background: var(--c-team-1); }
.mini-option--b { background: var(--c-team-3); }
.mini-option--c { background: var(--c-team-4); }
.mini-option--d { background: var(--c-team-5); }
.game-card:hover .mini-option--b { transform: translateX(var(--sp-2)); }

.game-card__body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--sp-4); padding: var(--sp-6); }
.game-card__index {
  padding-top: var(--sp-1);
  color: var(--c-brand);
  font-size: var(--fs-xs);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
}
.game-card__heading h3 { margin-top: var(--sp-1); font-size: var(--fs-2xl); }
.game-card__tagline { color: var(--c-brand); font-size: var(--fs-xs); font-weight: 900; letter-spacing: var(--tracking-wide); text-transform: uppercase; }
.game-card__description { grid-column: 2; color: var(--c-text-muted); line-height: var(--lh-body); }
.game-card__meta {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-text-faint);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.game-card__meta svg { width: var(--fs-lg); flex: none; }
.game-card__warn {
  grid-column: 2;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-bad) 14%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-xs);
}
.game-card__actions { grid-column: 2; display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-2); }
.game-card__play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  min-height: var(--control-touch);
  padding: var(--sp-3) var(--sp-5);
  border: 0;
  border-radius: var(--r-md);
  background: linear-gradient(180deg, var(--c-brand), var(--c-brand-deep));
  color: var(--c-on-accent);
  font-weight: 900;
  box-shadow: 0 var(--sp-1) 0 color-mix(in oklab, var(--c-brand-deep) 45%, var(--c-abyss));
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.game-card__play:hover { transform: translateY(calc(var(--sp-1) * -0.5)); }
.game-card__play:active { transform: translateY(var(--sp-1)); box-shadow: none; }
.game-card__play svg { width: var(--fs-lg); }
.game-card__questions {
  display: grid;
  place-items: center;
  min-height: var(--control-touch);
  padding-inline: var(--sp-4);
  border-radius: var(--r-md);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: none;
}
.game-card__questions:hover { background: var(--c-surface-2); color: var(--c-text); }
.game-card__resume { grid-column: 2; display: flex; align-items: center; gap: var(--sp-2); color: var(--c-text-muted); font-size: var(--fs-xs); }
.game-card__resume span { width: var(--sp-2); height: var(--sp-2); border-radius: var(--r-full); background: var(--c-ok); box-shadow: 0 0 0 var(--sp-1) color-mix(in oklab, var(--c-ok) 18%, transparent); }

@keyframes orbit { to { transform: rotate(1turn); } }
@keyframes counterOrbit { to { transform: translate(-50%, -50%) rotate(-1turn); } }
@keyframes coreGlow {
  to {
    border-color: color-mix(in oklab, var(--c-brand) 58%, var(--c-line));
    box-shadow: var(--shadow-lg), 0 0 var(--sp-8) color-mix(in oklab, var(--c-brand-glow) 70%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .playfield__orbit,
  .playfield__token,
  .playfield__core,
  .playfield__ring { animation: none; }
  .game-card:hover,
  .game-card:hover .mini-board__tile:nth-child(8),
  .game-card:hover .mini-option--b,
  .game-card__play:hover { transform: none; }
}

@media (max-width: 960px) {
  .hero { grid-template-columns: minmax(0, 1fr) minmax(var(--home-aside-mid), 0.55fr); gap: var(--sp-5); }
  .games { grid-template-columns: minmax(0, 1fr); }
  .game-card { display: grid; grid-template-columns: minmax(var(--home-card-side-min), 0.8fr) minmax(0, 1.2fr); }
  .game-card__preview { min-height: 100%; border-right: var(--separator-w) solid var(--c-line); border-bottom: 0; }
}

@media (max-width: 720px) {
  .hero { grid-template-columns: minmax(0, 1fr); min-height: 0; padding-block: var(--sp-7); }
  .hero__copy { text-align: center; }
  .hero__title { margin-inline: auto; }
  .playfield { width: min(64vw, var(--home-visual-mobile)); }
  .game-card { display: block; }
  .game-card__preview { min-height: var(--home-preview-h); border-right: 0; border-bottom: var(--separator-w) solid var(--c-line); }
}

@media (max-width: 480px) {
  .game-card__preview { padding: var(--sp-4); }
  .game-card__body { grid-template-columns: minmax(0, 1fr); padding: var(--sp-5); }
  .game-card__index { display: none; }
  .game-card__description,
  .game-card__meta,
  .game-card__warn,
  .game-card__actions,
  .game-card__resume { grid-column: 1; }
  .game-card__actions { align-items: stretch; }
  .game-card__play,
  .game-card__questions { width: 100%; }
}

/* Dotyková pravidla jsou poslední, aby je pozdější breakpoint nepřepsal. */
@media (pointer: coarse) {
  .game-card__play,
  .game-card__questions { min-height: var(--control-touch); }
}
</style>
