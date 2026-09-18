<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { endGame, game, hasGame } from '@/stores/game'
import { endQuiz, hasQuiz, quiz } from '@/stores/quizHost'
import { count, whenAgo } from '@/lib/format'
import { GAMES, type GameEntry } from '@/games/registry'
import { hasSessionDb } from '@/lib/sessionDb'
import { confirmAction } from '@/stores/ui'
import UiIcon from '@/components/ui/UiIcon.vue'
import heroTitleUrl from '@/assets/mucirna-hero.png'

const router = useRouter()

interface GameCard {
  entry: GameEntry
  resume: string | null
  /** Kdy se ta rozehraná hra naposled hrála. */
  resumeWhen: string
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

function resumeWhen(entry: GameEntry): string {
  if (entry.slug === 'pojistuj' && hasGame.value && game.value) return whenAgo(game.value.startedAt)
  if (entry.slug === 'kviz' && hasQuiz.value && quiz.value) return whenAgo(quiz.value.startedAt)
  return ''
}

const cards = computed<GameCard[]>(() =>
  GAMES.map((entry) => ({
    entry,
    resume: resumeLabel(entry),
    resumeWhen: resumeWhen(entry),
    warn:
      entry.needsShared && !hasSessionDb()
        ? 'Telefony se teď nepřipojí. Hru můžeš dál vést jen z plátna.'
        : null,
  })),
)

function open(entry: GameEntry): void {
  void router.push(entry.route)
}

async function discard(entry: GameEntry): Promise<void> {
  const ok = await confirmAction({
    title: 'Zahodit rozehranou hru',
    text:
      entry.slug === 'kviz'
        ? 'Session se ukončí, telefony se odpojí a výsledky se ztratí.'
        : 'Skóre i stav desky se ztratí a příště se začne od přípravy.',
    confirmLabel: 'Zahodit',
    danger: true,
  })
  if (!ok) return
  if (entry.slug === 'pojistuj') endGame()
  else await endQuiz(true)
}
</script>

<template>
  <div class="home">
    <AppHeader />

    <main id="obsah">
      <section class="hero page" aria-labelledby="home-title">
        <div class="hero__copy">
          <p class="hero__kicker">Kvízy, do kterých se zapojí celá místnost</p>
          <h1 id="home-title" class="hero__title">
            <img class="hero__image" :src="heroTitleUrl" alt="Mučírna" />
          </h1>
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
                <UiIcon name="projector" size="xs" />
                {{ card.entry.needs }}
              </div>

              <p v-if="card.warn" class="game-card__warn">{{ card.warn }}</p>

              <div class="game-card__actions">
                <button type="button" class="game-card__play" @click="open(card.entry)">
                  {{ card.resume ? 'Pokračovat' : 'Připravit hru' }}
                  <UiIcon name="arrow-right" size="md" />
                </button>
                <RouterLink :to="card.entry.editRoute" class="game-card__questions">
                  Spravovat otázky
                </RouterLink>
              </div>

              <!-- Rozehráno s datem a s cestou ven. Bez data se nedalo
                   poznat, jestli je to dnešní hra, nebo zbytek po minulém
                   školení, a zahodit ho šlo jedině vejít dovnitř a najít
                   „Konec". -->
              <p v-if="card.resume" class="game-card__resume">
                <span aria-hidden="true"></span>
                Rozehráno {{ card.resumeWhen }}: {{ card.resume }}
                <button type="button" class="game-card__discard" @click="discard(card.entry)">
                  Zahodit
                </button>
              </p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* Rozměry rozcestníku. Nikdo jiný je nepoužívá, proto jsou tady a ne
   mezi tokeny: do :root patří jen to, co sdílí víc obrazovek. */
.home {
  --home-preview-h: 14rem;
  --home-perspective: 40rem;
  --home-hero-min: 28rem;
  /* Nápis Mučírna nejde přes celou šířku stránky: na širokém monitoru
     přebíjel větu nad sebou a dlaždice tlačil pod ohyb. */
  --home-hero-image-max: 70rem;
  --home-card-side-min: 17rem;

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
  place-items: center;
  min-height: min(var(--home-hero-min), calc(100dvh - var(--header-h)));
  padding-block: var(--sp-7);
  text-align: center;
}

.hero__copy {
  display: grid;
  justify-items: center;
  gap: var(--sp-5);
  width: 100%;
}
.hero__kicker {
  color: var(--c-text-muted);
  font-family: var(--font-hand);
  font-size: var(--fs-2xl);
  font-weight: 500;
  line-height: var(--lh-snug);
}
.hero__title {
  display: flex;
  justify-content: center;
  width: 100%;
}
.hero__image {
  width: min(100%, var(--home-hero-image-max));
  height: auto;
}

/* Dlaždice nezačínají hned pod nápisem: rozcestník je první, co
   uživatelka vidí, a stálo za to nechat ho dýchat. */
.choice { padding-block: var(--sp-8) var(--sp-9); }

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
.game-card__discard {
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.game-card__discard:hover { color: var(--c-bad); }

.game-card__resume { grid-column: 2; display: flex; align-items: center; gap: var(--sp-2); color: var(--c-text-muted); font-size: var(--fs-xs); }
.game-card__resume span { width: var(--sp-2); height: var(--sp-2); border-radius: var(--r-full); background: var(--c-ok); box-shadow: 0 0 0 var(--sp-1) color-mix(in oklab, var(--c-ok) 18%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .game-card:hover,
  .game-card:hover .mini-board__tile:nth-child(8),
  .game-card:hover .mini-option--b,
  .game-card__play:hover { transform: none; }
}

@media (max-width: 960px) {
  .games { grid-template-columns: minmax(0, 1fr); }
  .game-card { display: grid; grid-template-columns: minmax(var(--home-card-side-min), 0.8fr) minmax(0, 1.2fr); }
  .game-card__preview { min-height: 100%; border-right: var(--separator-w) solid var(--c-line); border-bottom: 0; }
}

@media (max-width: 720px) {
  .hero { min-height: 0; padding-block: var(--sp-8); }
  .hero__copy { gap: var(--sp-4); }
  .hero__kicker { font-size: var(--fs-xl); }
  .choice { padding-block: var(--sp-6) var(--sp-8); }
  .game-card { display: block; }
  .game-card__preview { min-height: var(--home-preview-h); border-right: 0; border-bottom: var(--separator-w) solid var(--c-line); }
}

@media (max-width: 560px) {
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
