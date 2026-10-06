<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { endGame, game, hasGame } from '@/stores/game'
import { endQuiz, hasQuiz, quiz } from '@/stores/quizHost'
import { count, whenAgo } from '@/lib/format'
import { GAMES, type GameEntry } from '@/games/registry'
import { hasSessionDb } from '@/lib/sessionDb'
import { confirmAction, degraded } from '@/stores/ui'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import HeroMark from '@/components/HeroMark.vue'

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

/**
 * Dlaždice v pozadí úvodu.
 *
 * Značka Mučírny je mřížka dlaždic a obě hry na dlaždicích stojí, takže
 * pozadí nenese obrázek odjinud, ale vlastní tvar aplikace: barevné
 * dlaždice s inkoustovou hranou v barvách možností A až D. Leží u okrajů,
 * pomalu se pohupují, a když dlaždice s M dopadne, všechny nadskočí.
 * Náraz tak zasáhne celou obrazovku, ne jen nápis.
 *
 * Poloha je v procentech plochy úvodu, hrana v rem.
 */
interface BackTile {
  x: number
  y: number
  size: number
  rot: number
  tone: 'azur' | 'limeta' | 'levandule' | 'ruzova' | 'modra' | 'papir'
}

const TILES: BackTile[] = [
  { x: 4, y: 19, size: 7.5, rot: -14, tone: 'azur' },
  { x: 72, y: 6, size: 3.5, rot: 14, tone: 'modra' },
  { x: 87, y: 10, size: 6.5, rot: 10, tone: 'limeta' },
  { x: 90, y: 45, size: 4.5, rot: -8, tone: 'papir' },
  { x: 5, y: 53, size: 5.25, rot: 8, tone: 'levandule' },
  { x: 16, y: 72, size: 3.75, rot: 10, tone: 'papir' },
  { x: 79, y: 68, size: 5.5, rot: -12, tone: 'ruzova' },
]

function toGames(): void {
  document.getElementById('hry')?.scrollIntoView({ block: 'start' })
}

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
    <!-- Rozcestník je bez hlavičky. Nebylo v ní nic, co by odtud šlo
         ovládat: celá obrazovka i velikost písma patří ke hře a navigace
         hry se ukáže, až je nějaká vybraná. -->
    <main id="obsah">
      <!-- Úvod je titulní strana: nápis vystředěný na výšku i na šířku,
           pod ním nálepka a dvě cesty dál. Zpod dolní hrany vykukují
           karty her, aby bylo vidět, že se roluje dál. -->
      <section class="hero" aria-labelledby="home-title">
        <div class="hero__tiles" aria-hidden="true">
          <span
            v-for="(tile, i) in TILES"
            :key="i"
            class="hero__tile"
            :class="`hero__tile--${tile.tone}`"
            :style="{
              '--x': `${tile.x}%`,
              '--y': `${tile.y}%`,
              '--s': `${tile.size}rem`,
              '--r': `${tile.rot}deg`,
              '--i': i,
            }"
          ><i></i></span>
        </div>

        <p class="hero__eyebrow">Hry na školení · pro tým UNIQA</p>

        <div class="hero__copy">
          <h1 id="home-title" class="hero__title"><HeroMark /></h1>
          <p class="hero__kicker">Kvízy, do kterých se zapojí celá místnost</p>
          <div class="hero__actions">
            <UiButton variant="brand" size="lg" icon-after="arrow-down" @click="toGames">
              Vybrat hru
            </UiButton>
            <UiButton size="lg" icon="phone" @click="router.push('/k')">
              Připojit se telefonem
            </UiButton>
          </div>
        </div>
      </section>

      <section id="hry" class="choice page" aria-labelledby="choice-title">
        <header class="choice__head">
          <div>
            <p class="choice__eyebrow">Vyber hru</p>
            <h2 id="choice-title" class="choice__title">Co se dnes bude hrát?</h2>
          </div>
          <p class="choice__lead">Obě hry se vedou z notebooku na plátně a posouvají se mezerníkem.</p>
        </header>

        <!-- Varování nese jinak hlavička, a ta tu není. Bez něj by se
             o chybějící sdílené databázi člověk dozvěděl až ve správě
             otázek, tedy typicky před místností. -->
        <p v-if="degraded.local" class="offline">
          <UiIcon name="warning" size="sm" />
          Sdílená databáze není dostupná. Otázky se berou jen z tohoto počítače
          a telefony hráčů se nepřipojí.
        </p>

        <ul class="games">
          <li
            v-for="(card, index) in cards"
            :key="card.entry.slug"
            class="game-card"
            :class="`game-card--${card.entry.slug}`"
            :style="{ '--i': index }"
            @click="open(card.entry)"
          >
            <span class="game-card__sticker" aria-hidden="true">
              {{ card.entry.slug === 'kviz' ? 'Telefony' : 'Týmy' }}
            </span>

            <div class="game-card__preview" aria-hidden="true">
              <div v-if="card.entry.slug === 'pojistuj'" class="mini-board">
                <span
                  v-for="n in 15"
                  :key="n"
                  class="mini-board__cell"
                  :class="{ 'mini-board__cell--live': n === 4 || n === 8 || n === 12 }"
                  :style="{ '--i': n % 4 }"
                >
                  <span class="mini-board__face">{{ [200, 400, 600][Math.floor((n - 1) / 5)] }}</span>
                  <span class="mini-board__face mini-board__face--back">?</span>
                </span>
              </div>

              <div v-else class="mini-quiz">
                <span class="mini-quiz__timer"><span></span></span>
                <div class="mini-quiz__options">
                  <span class="mini-option mini-option--a">A</span>
                  <span class="mini-option mini-option--b">B<UiIcon name="check" size="xs" /></span>
                  <span class="mini-option mini-option--c">C</span>
                  <span class="mini-option mini-option--d">D</span>
                </div>
              </div>
            </div>

            <div class="game-card__body">
              <p class="game-card__tagline">{{ card.entry.tagline }}</p>
              <h3 class="game-card__title">{{ card.entry.title }}</h3>
              <p class="game-card__description">{{ card.entry.description }}</p>

              <p class="game-card__meta">
                <UiIcon name="projector" size="xs" />
                {{ card.entry.needs }}
              </p>

              <p v-if="card.warn" class="game-card__warn">{{ card.warn }}</p>

              <!-- Kliknout jde kamkoli na kartu, tlačítko je tu proto, aby
                   bylo vidět co se stane, a proto, že myš není jediná cesta:
                   klávesnice potřebuje cíl, na který se dá zaměřit.
                   Roztažený pseudoprvek by nestačil, `UiButton` je sám
                   polohovaný a překryv by se zastavil na jeho okraji.
                   K balíčkům se chodí z hlavičky hry, ne odtud. -->
              <div class="game-card__actions">
                <UiButton class="game-card__play" variant="brand" icon-after="arrow-right" @click.stop="open(card.entry)">
                  {{ card.resume ? 'Pokračovat' : 'Připravit hru' }}
                </UiButton>
              </div>

              <!-- Rozehráno s datem a s cestou ven. Bez data se nedalo
                   poznat, jestli je to dnešní hra, nebo zbytek po minulém
                   školení, a zahodit ho šlo jedině vejít dovnitř a najít
                   „Konec". -->
              <p v-if="card.resume" class="game-card__resume">
                <span aria-hidden="true"></span>
                Rozehráno {{ card.resumeWhen }}: {{ card.resume }}
                <button type="button" class="game-card__discard" @click.stop="discard(card.entry)">
                  Zahodit
                </button>
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Patička. Tichá řádka: říká, pro koho to je a kdo to postavil,
           a tím splňuje i to, co se o původu má na rozcestníku objevit,
           dokud tu není logo UNIQA. -->
      <footer class="credit page">
        <p>
          Vytvořeno pro tým UNIQA. Postavil
          <a href="https://radeknemecek.cz/" target="_blank" rel="noopener noreferrer">
            Radek Němeček</a>.
        </p>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.home {
  /* Kolik z karet her vykoukne zpod úvodu. Tolik, aby byla vidět
     nálepka a horní hrana náhledu, takže je jasné, že se roluje dál. */
  --home-peek: 9rem;
  position: relative;
}

/* --- Úvod ---------------------------------------------------------------- */

.hero {
  position: relative;
  min-height: calc(100svh - var(--home-peek));
  display: grid;
  place-items: center;
  padding: var(--sp-8) var(--sp-5) var(--sp-7);
  overflow: clip;
}

.hero__eyebrow {
  position: absolute;
  top: var(--sp-5);
  left: var(--sp-6);
  font-size: var(--fs-sm);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.hero__copy {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--sp-6);
  text-align: center;
}

.hero__title { line-height: 1; letter-spacing: 0; }

/* Ruční kicker. Jedno ze tří míst, kde smí být Caveat. Nálepka se při
   příchodu plácne na papír, natočení drží i bez animace. */
.hero__kicker {
  display: inline-block;
  padding: var(--sp-2) var(--sp-5);
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  color: var(--c-brand);
  font-family: var(--font-hand);
  font-size: var(--fs-3xl);
  font-weight: 600;
  line-height: var(--lh-snug);
  rotate: -4deg;
  animation: home-slap var(--dur-pop) var(--ease-out) var(--delay-mark-kick) both;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-4);
  animation: home-rise var(--dur-pop) var(--ease-out) var(--delay-mark-cta) both;
}

/* Dlaždice v pozadí. Obal nese polohu, natočení a pohupování, vnitřek
   vyskočí na místo a nadskočí, když dopadne M. Každá část animuje jinou
   vlastnost, takže se navzájem nepřebíjejí. */
.hero__tiles { position: absolute; inset: 0; pointer-events: none; }

.hero__tile {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  rotate: var(--r);
  animation: home-float var(--dur-float) var(--ease-both) calc(var(--i) * -0.7s) infinite;
}

.hero__tile i {
  display: block;
  width: 100%;
  height: 100%;
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: 24%;
  background: var(--tone);
  box-shadow: var(--shadow-md);
  animation:
    home-tile-in var(--dur-pop) var(--ease-out) calc(var(--i) * var(--stagger)) both,
    home-hop var(--dur-pop) var(--ease-out) calc(var(--delay-mark-hit) + var(--i) * 30ms);
}

.hero__tile--azur { --tone: var(--c-team-1); }
.hero__tile--limeta { --tone: var(--c-team-3); }
.hero__tile--levandule { --tone: var(--c-team-4); }
.hero__tile--ruzova { --tone: var(--c-team-5); }
.hero__tile--modra { --tone: var(--c-brand); }
.hero__tile--papir { --tone: var(--c-surface); }

/* --- Výběr hry ----------------------------------------------------------- */

.choice {
  display: grid;
  gap: var(--sp-7);
  padding-block: var(--sp-5) var(--sp-8);
  scroll-margin-top: var(--sp-6);
}

.choice__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-6);
}

.choice__eyebrow {
  font-size: var(--fs-sm);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.choice__title {
  margin-top: var(--sp-2);
  font-size: var(--fs-home-title);
  letter-spacing: -0.045em;
  line-height: 1;
}

.choice__lead {
  max-width: 22rem;
  color: var(--c-text-muted);
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
}

.games {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-7);
}

/* Karta hry je klikatelná celá. Mírně natočená, každá na jinou stranu,
   stejně jako dlaždice v pozadí: leží na stole, nevisí v mřížce. */
.game-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: var(--sp-5);
  padding: var(--sp-6);
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: var(--r-xl);
  background: var(--card);
  box-shadow: var(--shadow-lg);
  color: var(--c-text-ink);
  cursor: pointer;
  rotate: -1.5deg;
  transition:
    translate var(--dur-press) var(--ease-out),
    box-shadow var(--dur-press) var(--ease-out);
}
.game-card:nth-child(even) { rotate: 1.5deg; }
.game-card--pojistuj { --card: var(--c-team-1); }
.game-card--kviz { --card: var(--c-team-3); }

.game-card:hover {
  translate: var(--shadow-x-md) var(--shadow-x-md);
  box-shadow: var(--shadow-md);
}

.game-card__sticker {
  position: absolute;
  top: calc(var(--sp-5) * -1);
  right: var(--sp-6);
  padding: var(--sp-1) var(--sp-4);
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: var(--r-full);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--fs-sm);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  rotate: 5deg;
}
.game-card:nth-child(even) .game-card__sticker { rotate: -5deg; }

.game-card__preview {
  height: 9.5rem;
  padding: var(--sp-4);
  border: var(--border-w-heavy) solid var(--c-ink);
  border-radius: var(--r-lg);
  background: var(--c-surface);
}

.mini-board {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--sp-2);
}

.mini-board__cell {
  position: relative;
  transform-style: preserve-3d;
}
.mini-board__cell--live {
  animation: home-flip var(--dur-flip) var(--ease-out) calc(1.4s + var(--i) * 2s) infinite;
}

.mini-board__face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: var(--border-w-strong) solid var(--c-ink);
  border-radius: var(--r-md);
  background: var(--c-tile-top);
  color: var(--c-value);
  font-size: var(--fs-sm);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  backface-visibility: hidden;
}
.mini-board__face--back {
  transform: rotateY(180deg);
  background: var(--c-surface);
  color: var(--c-text-ink);
  font-size: var(--fs-xl);
}

.mini-quiz {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--sp-3);
}

.mini-quiz__timer {
  height: var(--sp-3);
  border: var(--border-w-strong) solid var(--c-ink);
  border-radius: var(--r-full);
  overflow: hidden;
}
.mini-quiz__timer span {
  display: block;
  height: 100%;
  background: var(--c-ink);
  transform-origin: left;
  animation: home-timer var(--dur-pick) linear 1.6s infinite;
}

.mini-quiz__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
}

.mini-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: var(--sp-3);
  border: var(--border-w-strong) solid var(--c-ink);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  font-weight: 900;
  font-size: var(--fs-lg);
}
.mini-option--a { background: var(--c-team-1); }
.mini-option--b { background: var(--c-surface); animation: home-pick var(--dur-pick) var(--ease-out) 1.6s infinite; }
.mini-option--c { background: var(--c-team-4); }
.mini-option--d { background: var(--c-team-5); }
.mini-option :deep(svg) {
  width: var(--icon-xl);
  height: var(--icon-xl);
  padding: var(--sp-1);
  border-radius: var(--r-full);
  background: var(--c-ink);
  color: var(--c-on-ink);
  transform: scale(0);
  animation: home-check var(--dur-pick) var(--ease-back) 1.6s infinite;
}

.game-card__body { display: grid; gap: var(--sp-3); }

.game-card__tagline {
  font-size: var(--fs-xs);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
}

.game-card__title {
  font-size: var(--fs-3xl);
  letter-spacing: -0.04em;
  line-height: 1;
}

.game-card__description { font-size: var(--fs-md); line-height: var(--lh-body); }

.game-card__meta {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-ink);
  border-radius: var(--r-full);
  background: var(--c-surface);
  font-size: var(--fs-sm);
  font-weight: 900;
}

.game-card__warn,
.offline {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-ink);
  border-radius: var(--r-md);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.offline svg { flex: none; }

.game-card__actions { margin-top: var(--sp-2); }

/* Hlavní tlačítko karty je inkoustové, ne modré: na barevné kartě by
   modrá UNIQA soupeřila s plochou. */
.game-card__play {
  --btn-bg: var(--c-ink);
  --btn-bg-hover: var(--c-ink);
  --btn-fg: var(--c-on-ink);
}

.game-card__resume {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.game-card__resume span {
  width: var(--sp-3);
  height: var(--sp-3);
  border: var(--border-w) solid var(--c-ink);
  border-radius: var(--r-full);
  background: var(--c-ok-fill);
}
.game-card__discard {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-text-ink);
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.credit {
  padding-block: var(--sp-6) var(--sp-7);
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.credit a { color: var(--c-text); font-weight: 900; }
.credit a:hover { color: var(--c-brand); }

/* --- Pohyb --------------------------------------------------------------- */

@keyframes home-slap {
  0% { transform: scale(2.4) rotate(14deg); opacity: 0; }
  55% { transform: scale(0.9) rotate(-3deg); opacity: 1; }
  100% { transform: none; opacity: 1; }
}
@keyframes home-rise {
  0% { transform: translateY(2.5rem); opacity: 0; }
  70% { transform: translateY(-0.4rem); opacity: 1; }
  100% { transform: none; opacity: 1; }
}
@keyframes home-tile-in {
  0% { transform: scale(0) rotate(-40deg); }
  70% { transform: scale(1.1); }
  100% { transform: none; }
}
@keyframes home-hop {
  0%, 100% { transform: none; }
  30% { transform: translateY(-2rem) rotate(-9deg); }
  60% { transform: translateY(0.25rem) rotate(4deg); }
  80% { transform: translateY(-0.4rem); }
}
@keyframes home-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -0.6rem; }
}
@keyframes home-flip {
  0%, 30%, 100% { transform: rotateY(0); }
  36%, 70% { transform: rotateY(180deg); }
}
@keyframes home-timer {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
@keyframes home-pick {
  0%, 20%, 100% { translate: 0 0; box-shadow: var(--shadow-sm); }
  26%, 70% { translate: var(--shadow-x-sm) var(--shadow-x-sm); box-shadow: var(--shadow-none); }
}
@keyframes home-check {
  0%, 26% { transform: scale(0); }
  32%, 70% { transform: scale(1); }
  76%, 100% { transform: scale(0); }
}

/* Bez pohybu je všechno rovnou na místě. Klíčové snímky tokeny trvání
   nevypnou, nekonečné cykly by běžely dál. */
@media (prefers-reduced-motion: reduce) {
  .hero__kicker,
  .hero__actions,
  .hero__tile,
  .hero__tile i,
  .mini-board__cell--live,
  .mini-quiz__timer span,
  .mini-option--b,
  .mini-option :deep(svg) { animation: none; }
  .mini-option :deep(svg) { transform: none; }
}

/* --- Šířky --------------------------------------------------------------- */

@media (max-width: 960px) {
  .games { grid-template-columns: minmax(0, 1fr); max-width: 40rem; margin-inline: auto; width: 100%; }
}

/* Na užší obrazovce by dlaždice v plné velikosti vlezly do nápisu.
   Zmenší se a zůstanou u okrajů. */
@media (max-width: 960px) {
  .hero__tile { width: calc(var(--s) * 0.6); height: calc(var(--s) * 0.6); }
}

@media (max-width: 720px) {
  .home { --home-peek: 4rem; }
  .choice__head { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
  .hero__eyebrow { left: var(--sp-4); right: var(--sp-4); text-align: center; }
  .hero__tile { width: calc(var(--s) * 0.45); height: calc(var(--s) * 0.45); }
  .hero__kicker { font-size: var(--fs-2xl); }
}

@media (max-width: 560px) {
  .hero__actions { flex-direction: column; align-items: stretch; width: 100%; }
  .game-card { padding: var(--sp-5); rotate: -0.75deg; }
  .game-card:nth-child(even) { rotate: 0.75deg; }
}
</style>
