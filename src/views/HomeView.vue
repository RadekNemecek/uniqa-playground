<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { endGame, game, hasGame } from '@/stores/game'
import { endQuiz, hasQuiz, quiz } from '@/stores/quizHost'
import { count, whenAgo } from '@/lib/format'
import { GAMES, type GameEntry } from '@/games/registry'
import { hasSessionDb } from '@/lib/sessionDb'
import { confirmAction, degraded } from '@/stores/ui'
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
 * Dlaždice plující pozadím.
 *
 * Značka Mučírny je mřížka dlaždic a obě hry na dlaždicích stojí, takže
 * pozadí nenese obrázek odjinud, ale vlastní tvar aplikace. Jsou to jen
 * souřadnice a tempo, vzhled si řeší styl.
 *
 * `slow` je doba jednoho přeletu tam a zpět. Čísla jsou schválně velká
 * a nesoudělná, aby se dlaždice nikdy nesrovnaly do společného rytmu
 * a pohyb zůstal na hraně vnímatelnosti.
 */
interface DriftTile {
  /** Poloha v procentech plochy. */
  x: number
  y: number
  /** Hrana dlaždice v rem. */
  size: number
  /** Natočení ve stupních. */
  rot: number
  /** Posun během přeletu v procentech vlastní velikosti. */
  dx: number
  dy: number
  /** Doba přeletu a odklad startu v sekundách. */
  slow: number
  delay: number
  tone: 'board' | 'azur' | 'levandule'
}

const DRIFT: DriftTile[] = [
  { x: 6, y: 12, size: 13, rot: -9, dx: 14, dy: -10, slow: 47, delay: 0, tone: 'board' },
  { x: 78, y: 8, size: 9, rot: 12, dx: -12, dy: 14, slow: 61, delay: -8, tone: 'azur' },
  { x: 88, y: 34, size: 15, rot: -6, dx: -9, dy: -12, slow: 53, delay: -21, tone: 'board' },
  { x: 16, y: 52, size: 8, rot: 14, dx: 18, dy: 9, slow: 43, delay: -14, tone: 'levandule' },
  { x: 43, y: 74, size: 11, rot: -11, dx: -10, dy: -16, slow: 67, delay: -31, tone: 'board' },
  { x: 68, y: 62, size: 7, rot: 8, dx: 15, dy: 12, slow: 39, delay: -5, tone: 'board' },
  { x: 2, y: 78, size: 10, rot: 6, dx: 11, dy: -13, slow: 57, delay: -26, tone: 'azur' },
  { x: 55, y: 22, size: 6, rot: -14, dx: -16, dy: 11, slow: 71, delay: -12, tone: 'board' },
]

/**
 * Odpočet v náhledu kvízu.
 *
 * Rozcestník visí na plátně, než se začne hrát, a náhled, ve kterém stojí
 * čas, je obrázek hry. Ubývající vteřiny z něj dělají běžící otázku,
 * a je to jediné místo na stránce, kde se mění text; víc takových míst by
 * z toho udělalo blikající výlohu.
 *
 * Pod vypnutým pohybem se nespouští: ubývající číslo je pohyb jako každý
 * jiný, jen se odehrává v textu, takže si ho `prefers-reduced-motion`
 * musí ohlídat ručně.
 */
const PREVIEW_FROM = 14
const previewSeconds = ref(PREVIEW_FROM)
const stillness = window.matchMedia('(prefers-reduced-motion: reduce)')
let ticker: number | undefined

/** Přepínač pohybu platí i tady, a platí hned. Styly na jeho přepnutí
 *  reagují samy, tohle je jediný pohyb na stránce, který si to musí
 *  ohlídat ručně. */
function retime(): void {
  window.clearInterval(ticker)
  ticker = undefined
  if (stillness.matches) {
    previewSeconds.value = PREVIEW_FROM
    return
  }
  ticker = window.setInterval(() => {
    previewSeconds.value = previewSeconds.value > 1 ? previewSeconds.value - 1 : PREVIEW_FROM
  }, 1000)
}

onMounted(() => {
  retime()
  stillness.addEventListener('change', retime)
})
onBeforeUnmount(() => {
  window.clearInterval(ticker)
  stillness.removeEventListener('change', retime)
})

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
    <!-- Dlaždice v pozadí. Pohyb je pomalý schválně: má dát ploše život,
         ne přetahovat se o pozornost s kartami. -->
    <div class="drift" aria-hidden="true">
      <span
        v-for="(tile, i) in DRIFT"
        :key="i"
        class="drift__tile"
        :class="`drift__tile--${tile.tone}`"
        :style="{
          '--x': `${tile.x}%`,
          '--y': `${tile.y}%`,
          '--s': `${tile.size}rem`,
          '--r': `${tile.rot}deg`,
          '--dx': `${tile.dx}%`,
          '--dy': `${tile.dy}%`,
          '--slow': `${tile.slow}s`,
          '--delay': `${tile.delay}s`,
        }"
      />
    </div>

    <!-- Rozcestník je bez hlavičky. Nebylo v ní nic, co by odtud šlo
         ovládat: celá obrazovka i velikost písma patří ke hře, značka
         stála podruhé kousek nad nápisem a navigace hry se ukáže, až
         je nějaká vybraná. -->
    <main id="obsah">
      <section class="hero page" aria-labelledby="home-title">
        <div class="hero__copy">
          <p class="hero__kicker">Kvízy, do kterých se zapojí celá místnost</p>
          <h1 id="home-title" class="hero__title">
            <HeroMark class="hero__image" />
          </h1>
        </div>
      </section>

      <section class="choice page" aria-label="Vyber hru">
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
          >
            <div class="game-card__preview" aria-hidden="true">
              <template v-if="card.entry.slug === 'pojistuj'">
                <div class="mini-board">
                  <span class="mini-board__category">Majetek</span>
                  <span class="mini-board__category">Život</span>
                  <span class="mini-board__category">Auto</span>
                  <template v-for="(value, row) in [200, 400, 600]" :key="value">
                    <span
                      v-for="column in 3"
                      :key="`${value}-${column}`"
                      class="mini-board__tile"
                      :style="{ '--i': row * 3 + column - 1 }"
                    >
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
                    <span class="mini-quiz__time">{{ previewSeconds }} s</span>
                  </div>
                  <p>Která odpověď platí?</p>
                  <div class="mini-quiz__options">
                    <span class="mini-option mini-option--a" style="--i: 0">A</span>
                    <span class="mini-option mini-option--b" style="--i: 2">B</span>
                    <span class="mini-option mini-option--c" style="--i: 3">C</span>
                    <span class="mini-option mini-option--d" style="--i: 1">D</span>
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

      <!-- Patička. Tichá řádka, ne podpis přes celou šířku: říká, pro koho
           to je a kdo to postavil, a tím splňuje i to, co se o původu má
           na rozcestníku objevit, dokud tu není logo UNIQA. -->
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
/* Rozměry rozcestníku. Nikdo jiný je nepoužívá, proto jsou tady a ne
   mezi tokeny: do :root patří jen to, co sdílí víc obrazovek. */
.home {
  /* Hlavička karty. Je to pevná výška, ne spodní mez: obě hry mají
     v náhledu jinak vysokou ukázku a karty vedle sebe se musí potkat
     na téže lince. */
  --home-preview-h: 15.5rem;
  --home-perspective: 40rem;
  /* Odstup dlaždic od nápisu. Počítá s ním i výška úvodu, proto je to
     proměnná a ne dvakrát zapsaná hodnota. */
  --home-choice-top: var(--sp-8);
  /* Pod co se úvod nesmí srazit ani na nízkém okně. */
  --home-hero-floor: 22rem;
  /* Nápis Mučírna nejde přes celou šířku stránky: na širokém monitoru
     přebíjel větu nad sebou a dlaždice tlačil pod ohyb. */
  --home-hero-image-max: 70rem;
  --home-card-side-min: 17rem;

  position: relative;
  /* Vlastní vrstvení. Zrno se míchá s pozadím, a bez vlastního kontextu
     by se míchalo s celou stránkou: obsah pak zmizí. Proto jsou vrstvy
     očíslované, ne na záporném z-indexu:

       0  světlo a plující dlaždice, tedy pozadí
       1  obsah
       2  zrno, to má ležet i přes obsah

     Obsah tu musí být vypsaný taky. Pozicovaný pseudoprvek se vykreslí
     nad nepozicovaným blokem bez ohledu na pořadí v dokumentu, takže
     dlaždice jinak plují přes karty, ne za nimi. */
  isolation: isolate;
  min-height: 100dvh;
  overflow: clip;
  background:
    radial-gradient(circle at 82% 8%, color-mix(in oklab, var(--c-brand) 16%, transparent), transparent 30%),
    radial-gradient(circle at 10% 38%, color-mix(in oklab, var(--c-team-2) 8%, transparent), transparent 34%);
}

/* Světlo putující plochou.
   Rozcestník visí na plátně, než se začne hrát, a úplně nehybný obraz
   na projektoru vypadá jako zamrzlá aplikace. Je to jeden veliký měkký
   kruh na dlouhé smyčce, ne efekt: pozná se, že se něco děje, a přitom
   se na to nedá dívat. Leží pod dlaždicemi, protože je to pozadí
   pozadí. */
.home::before {
  content: '';
  position: absolute;
  /* Přetahuje přes okraje, aby při zvětšení nikde nevznikla ostrá hrana. */
  inset: -20%;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 32% 42%,
    color-mix(in oklab, var(--c-brand) 11%, transparent),
    transparent 46%
  );
  animation: home-glow var(--dur-orbit-slow) var(--ease-both) infinite alternate;
}

@keyframes home-glow {
  from { opacity: 0.65; transform: translate3d(0, 0, 0) scale(1); }
  to { opacity: 1; transform: translate3d(11%, -7%, 0) scale(1.14); }
}

/* Dlaždice v pozadí. Nesou tvar i hmotu dlaždic z desky, jen ztlumené
   a rozostřené, aby zůstaly pozadím. Animuje se jen posun a natočení,
   tedy to, co umí grafická karta bez překreslování stránky. */
.drift {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.drift__tile {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  border-radius: var(--r-xl);
  border: var(--separator-w) solid color-mix(in oklab, var(--c-line) 55%, transparent);
  background: linear-gradient(160deg, var(--c-tile-top), var(--c-tile-bottom));
  box-shadow: inset 0 var(--separator-w) 0 var(--c-tile-sheen);
  opacity: 0.22;
  /* Jen tolik rozostření, aby dlaždice ustoupila do pozadí a přitom
     zůstala dlaždicí. Víc z ní udělá šmouhu. */
  filter: blur(calc(var(--sp-1) / 2));
  animation: drift var(--slow) var(--ease-out) var(--delay) infinite alternate;
}
/* Dva odstíny z palety možností, aby plocha nebyla jen modrá na modré.
   Význam nenesou, tady je to plocha, ne volba. */
.drift__tile--azur { background: linear-gradient(160deg, var(--c-team-1), transparent); opacity: 0.1; }
.drift__tile--levandule { background: linear-gradient(160deg, var(--c-team-4), transparent); opacity: 0.09; }

@keyframes drift {
  from { transform: translate3d(0, 0, 0) rotate(var(--r)); }
  to { transform: translate3d(var(--dx), var(--dy), 0) rotate(calc(var(--r) * -1)); }
}

/* Zrno. Tmavé přechody na projektoru i na levnějším monitoru pruhují
   a zrno ty pruhy rozbije. Je to jeden vzorek 160 px, ne soubor
   ke stažení. */
.home::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  /* Overlay, ne soft-light: tmavá místa nechá tmavá, takže se pozadí
     nezamlží. Síla je schválně na hraně viditelnosti. */
  opacity: 0.14;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Obsah nad dekoracemi, pod zrnem. Viz vrstvení u `.home`. */
main {
  position: relative;
  z-index: 1;
}

/* Úvod vyplní obrazovku tak, aby pod jeho spodní hranou zbyla přesně
   hlavička karet. Karty tím na první pohled vykukují zpod ohybu a je
   z toho vidět, že se má rolovat dál. */
.hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: max(
    var(--home-hero-floor),
    calc(100dvh - var(--home-choice-top) - var(--home-preview-h) - var(--separator-w) * 2)
  );
  padding-block: var(--sp-7);
  text-align: center;
}

/* Kužel z projektoru. Obě hry se promítají, takže nápis nestojí na
   prázdné ploše, ale ve světle, které na ni dopadá. Je to gradient
   s výsečí, ne obrázek. */
.hero::before {
  content: '';
  position: absolute;
  inset-block: calc(var(--sp-9) * -1) 0;
  inset-inline: 0;
  z-index: -1;
  pointer-events: none;
  /* Světlo shora, ne ostrá výseč: kužel s okraji se na ploše čte jako
     trojúhelník, kdežto rozptýlená záře jako světlo. */
  background:
    radial-gradient(
      ellipse 62% 58% at 50% -6%,
      color-mix(in oklab, var(--c-light) 24%, transparent),
      transparent 62%
    ),
    radial-gradient(
      ellipse 26% 70% at 50% 0%,
      color-mix(in oklab, var(--c-light) 15%, transparent),
      transparent 70%
    );
  transform-origin: top center;
  /* Sotva znatelné dýchání, jako když se projektor rozehřívá. Pomalé
     schválně: je to pozadí, ne animace k dívání. */
  animation: beam-sway 26s var(--ease-out) infinite alternate;
}

/* Dopad světla za nápisem. Drží ho v ploše, aby nevisel v prázdnu. */
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse 52% 42% at 50% 56%,
    color-mix(in oklab, var(--c-brand) 10%, transparent),
    transparent 70%
  );
}

@keyframes beam-sway {
  from { opacity: 0.7; transform: scale(1); }
  to { opacity: 1; transform: scale(1.08); }
}

.hero__copy {
  display: grid;
  justify-items: center;
  gap: var(--sp-5);
  width: 100%;
}
/* Kicker přichází první a sám. Je to začátek téže věty, kterou pak
   dopoví nápis: nejdřív se objeví řádek, pak slovo, nakonec do něj
   dosedne dlaždice. */
.hero__kicker {
  animation: kicker-in var(--dur-stage) var(--ease-out) backwards;
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

@keyframes kicker-in {
  from { opacity: 0; transform: translateY(var(--sp-3)); }
  to { opacity: 1; transform: none; }
}

/* Dlaždice nezačínají hned pod nápisem: rozcestník je první, co
   uživatelka vidí, a stálo za to nechat ho dýchat. */
.choice { padding-block: var(--home-choice-top) var(--sp-7); }

/* Patička. Nejtišší text na stránce, ale odkaz musí být poznat i bez
   barvy, proto podtržení. */
.credit {
  padding-block: var(--sp-5) var(--sp-8);
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  line-height: var(--lh-body);
  text-align: center;
}
.credit a {
  color: var(--c-text-muted);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  transition: color var(--dur-fast) var(--ease-out);
}
.credit a:hover { color: var(--c-brand); }

/* Chybějící sdílená databáze. Tichý řádek, ne poplach: hrát se dá dál,
   jen z jednoho počítače a bez telefonů. */
.offline {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border: var(--separator-w) solid color-mix(in oklab, var(--c-bad) 45%, transparent);
  border-radius: var(--r-lg);
  background: color-mix(in oklab, var(--c-bad) 12%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: var(--lh-body);
}
.offline svg { flex: none; }

.games {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-5);
  padding: 0;
  list-style: none;
}
.game-card {
  /* Odklad ambientního pohybu v náhledu. Bez něj by obě karty blikaly
     naráz a z náhledů by byl jeden rytmus místo dvou her. */
  --preview-phase: 0s;

  /* Karty nastupují jedna po druhé. Nástup je jediné místo, kde se dá
     ukázat, že jsou dvě a ne jedna dlouhá plocha. */
  animation: card-in var(--dur-stage) var(--ease-out) calc(var(--dur-fast) * var(--i)) backwards;
  min-width: 0;
  overflow: hidden;
  border: var(--separator-w) solid var(--c-line);
  border-radius: var(--r-xl);
  background: color-mix(in oklab, var(--c-surface) 92%, transparent);
  box-shadow: var(--shadow-md);
  transition: border-color var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.game-card--kviz { --preview-phase: calc(var(--dur-ambient) * 0.26); }
.game-card:hover {
  border-color: var(--c-brand);
  transform: translateY(calc(var(--sp-1) * -1));
  /* Ke stínu i záře: karta je dlaždice, na kterou jde sáhnout, a ta se
     pod prstem rozsvítí. Samotný zvednutý stín se na tmavém pozadí
     skoro neprojeví. */
  box-shadow: var(--shadow-lg), 0 0 var(--sp-8) calc(var(--sp-4) * -1) var(--c-brand-glow);
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(var(--sp-5)); }
  to { opacity: 1; transform: none; }
}
.game-card__preview {
  position: relative;
  display: grid;
  place-items: center;
  block-size: var(--home-preview-h);
  padding: var(--sp-5);
  overflow: hidden;
  border-bottom: var(--separator-w) solid var(--c-line);
  background:
    linear-gradient(145deg, color-mix(in oklab, var(--c-surface-3) 82%, transparent), var(--c-sunken)),
    var(--c-surface-2);
}
/* Světlo zespodu při najetí. Je to `::before`, ne `::after`: pseudoprvek
   se řadí před potomky, takže ukázka i štítek zůstanou nad ním. */
.game-card__preview::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 75% 65% at 50% 112%,
    color-mix(in oklab, var(--c-brand) 28%, transparent),
    transparent 72%
  );
  transition: opacity var(--dur-base) var(--ease-out);
}
.game-card:hover .game-card__preview::before { opacity: 1; }
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
  /* Deskou jednou za čas přejede vlna: dlaždice se po řadě nadzvednou
     a zase dosednou. Dřív tu byl hover na jediné dlaždici, o kterém se
     nikdo nedozvěděl, dokud na kartu nenajel myší. Vlna jde zleva
     doprava a shora dolů, takže to je pohyb se směrem, ne blikání. */
  animation: tile-wave var(--dur-ambient) var(--ease-out)
    calc(var(--dur-ambient) / 48 * var(--i) + var(--preview-phase)) infinite;
}

/* Špička je krátká a zbytek cyklu je klid. Je to náhled na rozcestníku,
   ne prvek, který si říká o pozornost. */
/* Rozsvícení je spočítané, ne odhadnuté: `brightness(1.3)` posune
   `--c-tile-top` z #12559A na zhruba #176FC8 a bílá hodnota na něm drží
   5,1:1, tedy pořád nad 4,5:1. */
@keyframes tile-wave {
  0% { transform: none; filter: none; }
  2% { transform: translateY(calc(var(--sp-1) * -0.75)); filter: brightness(1.3); }
  8%, 100% { transform: none; filter: none; }
}

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
  /* Možnosti se rozsvěcují na přeskáčku, jako když do kvízu padají
     hlasy z telefonů. Proto je pořadí v šabloně jiné než A, B, C, D:
     odpovědi taky nechodí popořadě. */
  animation: option-ping var(--dur-ambient) var(--ease-out)
    calc(var(--dur-ambient) / 36 * var(--i) + var(--preview-phase)) infinite;
}

@keyframes option-ping {
  0% { transform: none; filter: none; }
  2% { transform: translateX(var(--sp-1)); filter: brightness(1.16); }
  9%, 100% { transform: none; filter: none; }
}
.mini-option--a { background: var(--c-team-1); }
.mini-option--b { background: var(--c-team-3); }
.mini-option--c { background: var(--c-team-4); }
.mini-option--d { background: var(--c-team-5); }

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
  .home::before,
  .hero::before,
  .hero__kicker,
  .drift__tile,
  .game-card,
  .mini-board__tile,
  .mini-option { animation: none; }
  .game-card:hover,
  .game-card__play:hover { transform: none; }
}

@media (max-width: 960px) {
  .games { grid-template-columns: minmax(0, 1fr); }
  .game-card { display: grid; grid-template-columns: minmax(var(--home-card-side-min), 0.8fr) minmax(0, 1.2fr); }
  /* Na užším okně stojí náhled vedle textu, takže se výška řídí kartou. */
  .game-card__preview { block-size: auto; min-height: 100%; border-right: var(--separator-w) solid var(--c-line); border-bottom: 0; }
}

@media (max-width: 720px) {
  /* Na úzké obrazovce by osm dlaždic dělalo nepořádek, půlka stačí. */
  .drift__tile:nth-child(n + 5) { display: none; }
  .hero { min-height: 0; padding-block: var(--sp-8); }
  .hero__copy { gap: var(--sp-4); }
  .hero__kicker { font-size: var(--fs-xl); }
  .choice { padding-block: var(--sp-6) var(--sp-8); }
  .game-card { display: block; }
  /* Zpátky na pevnou výšku. `min-height: 100%` z širšího rozvržení se
     musí zrušit, jinak by se náhled natáhl přes celou kartu. */
  .game-card__preview {
    block-size: var(--home-preview-h);
    min-height: 0;
    border-right: 0;
    border-bottom: var(--separator-w) solid var(--c-line);
  }
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
