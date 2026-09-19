<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
 * Dlaždice plující pozadím.
 *
 * Značka Mučírny je mřížka dlaždic a obě hry na dlaždicích stojí, takže
 * pozadí nenese obrázek odjinud, ale vlastní tvar aplikace. Jsou to jen
 * souřadnice a tempo, vzhled si řeší styl.
 *
 * `slow` je doba jednoho okruhu. Čísla jsou schválně velká
 * a nesoudělná, aby se dlaždice nikdy nesrovnaly do společného rytmu.
 * Dráha není úsečka tam a zpět, ale uzavřený čtyřbodový okruh: dlaždice
 * se tím nekývá, ale plave. Na jeden úsek vychází kolem deseti vteřin,
 * takže je pohyb vidět, když se člověk zastaví, a nerve se o pozornost,
 * když ne.
 *
 * Pole je celá stránka včetně úvodu, klidně i za nápisem: dlaždice jsou
 * tlumené a rozostřené natolik, že značce neubírají. U okrajů je
 * zaříznutá hrana stránky, takže z nich kouká jen kus a čtou se jako
 * geometrie, ne jako obrázky. Za nápisem je navíc měkký kruh světla,
 * který je ztlumí ještě o kus víc.
 */
interface DriftTile {
  /** Poloha v procentech plochy. */
  x: number
  y: number
  /** Hrana dlaždice v rem. */
  size: number
  /** Natočení ve stupních. */
  rot: number
  /** Nejzazší bod dráhy v procentech vlastní velikosti. Zbytek dráhy
   *  se z něj odvozuje, takže tvar plavby je jeden a délka vlastní. */
  dx: number
  dy: number
  /** Doba jednoho okruhu a odklad startu v sekundách. */
  slow: number
  delay: number
  /** Modrá je vzácná: dvě dlaždice z osmi, jinak by z pozadí byl vzor. */
  tone: 'papir' | 'modra'
}

const DRIFT: DriftTile[] = [
  { x: -5, y: 3, size: 14, rot: -9, dx: 38, dy: -26, slow: 79, delay: 0, tone: 'papir' },
  { x: 91, y: 7, size: 11, rot: 12, dx: -34, dy: 41, slow: 97, delay: -13, tone: 'modra' },
  { x: 27, y: 6, size: 8, rot: 14, dx: 52, dy: 33, slow: 67, delay: -28, tone: 'papir' },
  { x: 62, y: 15, size: 7, rot: -6, dx: -46, dy: -37, slow: 83, delay: -41, tone: 'papir' },
  { x: -2, y: 26, size: 12, rot: 6, dx: 41, dy: -31, slow: 89, delay: -54, tone: 'papir' },
  { x: 84, y: 30, size: 13, rot: 8, dx: -29, dy: 36, slow: 61, delay: -9, tone: 'papir' },
  { x: 19, y: 36, size: 9, rot: -11, dx: -44, dy: -48, slow: 73, delay: -62, tone: 'modra' },
  { x: 55, y: 80, size: 11, rot: -14, dx: -39, dy: 28, slow: 101, delay: -35, tone: 'papir' },
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
         ne přetahovat se o pozornost se značkou. -->
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
      <!-- Úvod je titulní strana: značka vystředěná na výšku i na šířku
           a zpod dolní hrany vykukuje kus náhledu, aby bylo vidět, že se
           roluje dál. -->
      <section class="hero page" aria-labelledby="home-title">
        <div class="hero__copy">
          <h1 id="home-title" class="hero__title">
            <HeroMark class="hero__image" />
          </h1>
          <p class="hero__kicker">Kvízy, do kterých se zapojí celá místnost</p>
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
            @click="open(card.entry)"
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

              <!-- Kliknout jde kamkoli na kartu, tlačítko je tu proto, aby
                   bylo vidět co se stane, a proto, že myš není jediná cesta:
                   klávesnice potřebuje cíl, na který se dá zaměřit.
                   Roztažený pseudoprvek by nestačil, `UiButton` je sám
                   polohovaný a překryv by se zastavil na jeho okraji.
                   K balíčkům se chodí z hlavičky hry, ne odtud. -->
              <div class="game-card__actions">
                <UiButton class="game-card__play" variant="brand" @click.stop="open(card.entry)">
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
  --home-preview-h: 12rem;
  --home-perspective: 40rem;
  /* Zpod úvodu kouká celý náhled hry, tedy grafická část karty, a to
     u obou her na stejné lince. Pod čárou začíná text a ten se čte až
     po odrolování. Není to odhad, počítá se to z výšky náhledu. */
  --home-peek: calc(var(--home-preview-h) + var(--border-w) * 2);
  /* Pod co se úvod nesmí srazit ani na nízkém okně. */
  --home-hero-floor: 26rem;
  --home-hero-image-max: 64rem;
  --home-card-side-min: 17rem;

  /* Vlastní vrstvení: dlaždice plují pod obsahem. Obsah musí být
     vypsaný taky, pozicovaný pseudoprvek se jinak vykreslí nad
     nepozicovaným blokem bez ohledu na pořadí v dokumentu. */
  position: relative;
  isolation: isolate;
  overflow: clip;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--c-base);
}

/* Dlaždice v pozadí. Nesou tvar dlaždic z desky, jen na papíře: světlá
   plocha o odstín výš než pozadí, bez hrany a lesku, stejně jako sama
   značka. Světlý text na nich drží 10,1:1. Animuje se jen posun
   a natočení, tedy to, co umí grafická karta bez překreslování
   stránky. */
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
  background: var(--c-surface-2);
  opacity: 0.5;
  /* Jen tolik rozostření, aby dlaždice ustoupila do pozadí a přitom
     zůstala dlaždicí. Víc z ní udělá šmouhu. */
  filter: blur(calc(var(--sp-1) / 2));
  /* Okruh je uzavřený, takže se nesmyčkuje přes `alternate`: dlaždice
     doplave zpátky tam, odkud vyrazila, a smyčka nikde neucukne.
     Náběh se počítá na každý úsek zvlášť, proto to na obrátkách
     nedrhne. */
  animation: drift var(--slow) var(--ease-both) var(--delay) infinite;
}
/* Dvě modré dlaždice, aby plocha nebyla jen šedá na šedé. Význam
   nenesou, tady je to plocha, ne volba. */
.drift__tile--modra { background: var(--c-brand); opacity: 0.08; }

@keyframes drift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--r)); }
  25% {
    transform: translate3d(var(--dx), calc(var(--dy) * 0.3), 0)
      rotate(calc(var(--r) * 0.1));
  }
  50% {
    transform: translate3d(calc(var(--dx) * 0.45), var(--dy), 0)
      rotate(calc(var(--r) * -1));
  }
  75% {
    transform: translate3d(calc(var(--dx) * -0.5), calc(var(--dy) * 0.55), 0)
      rotate(calc(var(--r) * -0.35));
  }
}

main {
  position: relative;
  z-index: 1;
}

/* Úvod je hlavička stránky, ne scéna. Dřív se roztahoval na celé okno
   a karty pod ním jen vykukovaly, takže se muselo rolovat i tehdy, když
   moderátorka jen jde spustit hru, kterou zná. Nápis teď začíná na téže
   svislé lince jako všechno pod ním a jako nadpisy v přípravě. */
.hero {
  display: grid;
  place-items: center;
  min-height: max(var(--home-hero-floor), calc(100dvh - var(--home-peek)));
  /* Symetricky, jinak by vystředění na výšku lhalo o rozdíl obou
     odsazení. */
  padding-block: var(--sp-6);
}
.hero__copy { position: relative; display: grid; justify-items: center; gap: var(--sp-5); width: 100%; }
/* Kicker přichází poslední a stojí pod značkou. Vtip s odebraným „M"
   se přečte sám a věta ho teprve dopoví, takže nemá smysl ji pouštět
   napřed. Odklad odpovídá konci sekvence nápisu: slovo, dosednutí
   dlaždice, teprve pak řádek. */
.hero__kicker {
  animation: kicker-in var(--dur-stage) var(--ease-out)
    calc(var(--dur-stage) * 0.8 + var(--dur-slow)) backwards;
  color: var(--c-text-muted);
  font-family: var(--font-hand);
  font-size: var(--fs-2xl);
  font-weight: 500;
  line-height: var(--lh-snug);
  text-align: center;
}
@keyframes kicker-in {
  from { opacity: 0; transform: translateY(var(--sp-3)); }
  to { opacity: 1; transform: none; }
}

/* Světlo pod značkou. Dlaždice plují po celé ploše a pod nápisem z nich
   byl závoj; tohle jim tam uklidí a značka stojí na čisté ploše. Je to
   jeden měkký kruh, ne kužel: kužel s okraji se na ploše čte jako
   trojúhelník. Leží nad dlaždicemi a pod nápisem, vystředěný s ním. */
.hero__copy::before {
  content: '';
  position: absolute;
  inset: calc(var(--sp-8) * -1) calc(var(--sp-6) * -1);
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse 58% 62% at 50% 50%,
    color-mix(in oklab, var(--c-brand) 13%, transparent),
    transparent 72%
  );
}
.hero__title { display: flex; justify-content: center; width: 100%; }
.hero__image { width: min(100%, var(--home-hero-image-max)); height: auto; }

.choice { padding-block: 0 var(--sp-7); }

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
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
  padding: var(--sp-4);
  border-left: var(--border-w-strong) solid var(--c-bad);
  background: var(--c-surface);
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
  position: relative;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  border: var(--border-w) solid var(--c-border-soft);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  transition:
    border-color var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}
.game-card--kviz { --preview-phase: calc(var(--dur-ambient) * 0.26); }
/* Karta se pod prstem nadzvedne. Je to dlaždice, ne řádek v tabulce. */
.game-card:hover { border-color: var(--c-brand); transform: translateY(calc(var(--sp-1) * -1)); }

@keyframes card-in {
  from { opacity: 0; transform: translateY(var(--sp-5)); }
  to { opacity: 1; transform: none; }
}
/* Náhled je plátno zapuštěné do karty: karta je vyvýšená plocha,
   ukázka hry leží o patro níž, na téže barvě jako samotná hra. */
.game-card__preview {
  /* Štítek má vlastní řádek, neleží přes ukázku. Dřív byl odsazený
     absolutně a stačilo náhled o kus zkrátit, aby seděl na dlaždicích. */
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  align-items: center;
  gap: var(--sp-3);
  block-size: var(--home-preview-h);
  padding: var(--sp-5);
  overflow: hidden;
  background: var(--c-base);
}
.preview-label {
  justify-self: end;
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.mini-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-2);
  width: 78%;
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
  min-height: var(--sp-6);
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

.mini-quiz { display: grid; gap: var(--sp-2); width: 82%; }
.mini-quiz__top { display: flex; justify-content: space-between; color: var(--c-text-faint); font-size: var(--fs-xs); font-weight: 700; }
.mini-quiz__time { color: var(--c-brand); }
.mini-quiz > p { color: var(--c-text); font-size: var(--fs-lg); font-weight: 900; }
.mini-quiz__options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-2); }
.mini-option {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: var(--sp-6);
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

.game-card__body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--sp-4); padding: var(--sp-5); }
.game-card__index {
  padding-top: var(--sp-2);
  color: var(--c-brand);
  font-size: var(--fs-sm);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.game-card__heading h3 { margin-top: var(--sp-1); font-size: var(--fs-2xl); }
.game-card__tagline { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 700; }
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
  padding-left: var(--sp-3);
  border-left: var(--border-w-strong) solid var(--c-bad);
  color: var(--c-bad);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.game-card__actions { grid-column: 2; display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; margin-top: var(--sp-2); }
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
  .drift__tile,
  .hero__kicker,
  .game-card,
  .mini-board__tile,
  .mini-option { animation: none; }
  .game-card:hover { transform: none; }
}

@media (max-width: 960px) {
  .games { grid-template-columns: minmax(0, 1fr); }
  .game-card { display: grid; grid-template-columns: minmax(var(--home-card-side-min), 0.8fr) minmax(0, 1.2fr); }
  /* Na užším okně stojí náhled vedle textu, takže se výška řídí kartou. */
  .game-card__preview { block-size: auto; min-height: 100%; }
}

@media (max-width: 720px) {
  /* Na úzké obrazovce by osm dlaždic dělalo nepořádek, půlka stačí. */
  .drift__tile:nth-child(n + 5) { display: none; }
  /* Na telefonu se roluje rád a celá obrazovka pro značku je tam
     plýtvání: úvod se srazí na svůj obsah. */
  .hero { min-height: 0; padding-block: var(--sp-7) var(--sp-6); }
  .hero__copy { gap: var(--sp-4); }
  .hero__kicker { font-size: var(--fs-xl); }
  .choice { padding-block: 0 var(--sp-8); }
  .game-card { display: block; }
  /* Zpátky na pevnou výšku. `min-height: 100%` z širšího rozvržení se
     musí zrušit, jinak by se náhled natáhl přes celou kartu. */
  .game-card__preview { block-size: var(--home-preview-h); min-height: 0; }
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
  .game-card__actions :deep(.btn) { width: 100%; }
}

</style>
