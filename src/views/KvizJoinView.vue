<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlayerPad from '@/games/kviz/components/PlayerPad.vue'
import PlayerAvatar from '@/games/kviz/components/PlayerAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { BOOLEAN_LABELS, quizOption } from '@/games/kviz/options'
import { CODE_LENGTH, isCodeShaped, normalizeCode } from '@/games/kviz/code'
import { AVATARS, avatarFor } from '@/games/kviz/avatars'
import { formatScore } from '@/lib/teams'
import { count } from '@/lib/format'
import {
  answer,
  checking,
  join,
  joined,
  leaveGame,
  locked,
  myGain,
  myRank,
  pickAvatar,
  player,
  playerCount,
  rememberedNick,
  retry,
  wasRight,
  watchGame,
} from '@/stores/quizPlayer'

const route = useRoute()
const router = useRouter()
const nick = ref('')

/* --- Ruční zadání kódu ---------------------------------------------------
   `isCodeShaped()` bylo v `code.ts` napsané od začátku a nikdy se
   nezavolalo: obrazovka, která ho měla používat, neexistovala. */
const typedCode = ref('')
const codeError = ref('')

function goToCode(): void {
  const next = normalizeCode(typedCode.value)
  if (!isCodeShaped(next)) {
    codeError.value = `Kód má ${CODE_LENGTH} znaků. Přepiš ho z plátna přesně.`
    return
  }
  codeError.value = ''
  void router.push({ name: 'kviz-hrat', params: { code: next } })
}

function enterAnotherCode(): void {
  typedCode.value = ''
  codeError.value = ''
  void router.push({ name: 'kviz-kod' })
}

/** Znovu se pokusit navázat spojení, aniž by hráč musel přenačíst stránku. */
function retryConnect(): void {
  void watchGame(code.value)
}
/** Nabídka zvířat. Zavřená, dokud hráči přidělené nevadí. */
const zooOpen = ref(false)

const code = computed(() => normalizeCode(String(route.params.code ?? '')))
const session = computed(() => player.session)

/** Co má hráč zrovna vidět. Jedna obrazovka, ne pět, aby telefon
 *  nepřeskakoval mezi pohledy při každé změně fáze. */
const view = computed(() => {
  if (player.noConnection) return 'offline'
  if (!code.value) return 'code'
  if (player.missing) return 'missing'
  if (!session.value || checking.value) return 'loading'
  if (!joined.value) return 'join'
  switch (session.value.phase) {
    case 'lobby':
      return 'waiting'
    case 'question':
      return 'play'
    case 'locked':
      return 'locked'
    case 'reveal':
    case 'scores':
      return 'result'
    case 'final':
      return 'final'
    default:
      return 'waiting'
  }
})

/** Co bylo správně. U tvrzení slovo, u čtveřice možností písmeno: znění
 *  možností telefon nemá a mít nemá, ta jsou na plátně. */
const correctWord = computed(() => {
  const at = session.value?.reveal?.correctIndex ?? 0
  if (session.value?.kind === 'boolean') return BOOLEAN_LABELS[at] ?? ''
  return quizOption(at).letter
})

const myAvatar = computed(() => avatarFor(player.avatar))

function choose(id: string): void {
  pickAvatar(id)
  zooOpen.value = false
}

async function submit(): Promise<void> {
  if (nick.value.trim().length === 0) return
  await join(nick.value)
}

// Kdo už jednou hrál, má přezdívku předvyplněnou. Platí to i pro
// vyhozeného hráče: ten se na formulář vrátí a nemá ji ťukat znovu.
watch(
  view,
  (v) => {
    if (v === 'join' && nick.value.length === 0) {
      nick.value = player.nick || rememberedNick(code.value)
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (code.value) void watchGame(code.value)
})

// Kód se mění i bez přenačtení stránky, když hráč zadá jiný.
watch(code, (next) => {
  if (next) void watchGame(next)
})
onBeforeUnmount(leaveGame)
</script>

<template>
  <main id="obsah" class="play">
    <!-- Zadání kódu ------------------------------------------------------
         Kdo QR nenačte (odlesk projektoru, zadní řada, starší telefon),
         musel dřív přepisovat celou adresu z nejmenšího písma na plátně.
         Tahle obrazovka je konec té slepé uličky. -->
    <form v-if="view === 'code'" class="card" @submit.prevent="goToCode">
      <h1 class="card__title">Zadej kód hry</h1>
      <p class="card__lead">Je na plátně, velkými písmeny.</p>
      <input
        v-model="typedCode"
        class="code-input"
        type="text"
        inputmode="text"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        :maxlength="CODE_LENGTH"
        aria-label="Kód hry"
      />
      <p v-if="codeError" class="card__error">{{ codeError }}</p>
      <UiButton type="submit" variant="brand" size="lg" block>Připojit se</UiButton>
    </form>

    <!-- Bez spojení ------------------------------------------------------
         Jiná hláška než „hra neběží". Dřív obojí vypadalo stejně, takže
         pomalý telefon obvinil hráče z chyby, kterou neudělal. -->
    <section v-else-if="view === 'offline'" class="card">
      <h1 class="card__title">Nemám spojení</h1>
      <p class="card__lead">
        Telefon se nedostal k internetu. Zkontroluj wifi nebo data a zkus to znovu.
      </p>
      <UiButton variant="brand" size="lg" block @click="retryConnect">Zkusit znovu</UiButton>
      <UiButton v-if="code" variant="ghost" @click="enterAnotherCode">Zadat jiný kód</UiButton>
    </section>

    <!-- Hra neběží ------------------------------------------------------- -->
    <section v-else-if="view === 'missing'" class="card">
      <h1 class="card__title">Tahle hra neběží</h1>
      <p class="card__lead">
        Zkontroluj kód na plátně. Pokud sedí, hra ještě nezačala, nebo už skončila.
      </p>
      <p class="card__code">{{ code }}</p>
      <UiButton variant="ghost" @click="enterAnotherCode">Zadat jiný kód</UiButton>
    </section>

    <section v-else-if="view === 'loading'" class="card">
      <p class="card__lead">Hledám hru…</p>
    </section>

    <!-- Přezdívka -------------------------------------------------------- -->
    <form v-else-if="view === 'join'" class="card" @submit.prevent="submit">
      <h1 class="card__title">Jak ti mám říkat?</h1>

      <!-- Zvíře je přidělené, výběr je nabídka, ne úkol. Kdo si ho měnit
           nechce, jen vyplní jméno a jede dál. -->
      <button type="button" class="me" :aria-expanded="zooOpen" @click="zooOpen = !zooOpen">
        <PlayerAvatar class="me__ava" :id="player.avatar" />
        <span class="me__name">{{ myAvatar.label }}</span>
        <span class="me__swap">{{ zooOpen ? 'Zavřít nabídku' : 'Vybrat jiné zvíře' }}</span>
      </button>

      <ul v-if="zooOpen" class="zoo">
        <li v-for="a in AVATARS" :key="a.id">
          <button
            type="button"
            class="zoo__pick"
            :class="{ 'zoo__pick--on': a.id === player.avatar }"
            :aria-pressed="a.id === player.avatar"
            :aria-label="a.label"
            @click="choose(a.id)"
          >
            <PlayerAvatar :id="a.id" />
          </button>
        </li>
      </ul>

      <input
        v-model="nick"
        class="card__input"
        type="text"
        maxlength="20"
        autocomplete="off"
        autocapitalize="words"
        aria-label="Přezdívka"
        placeholder="Přezdívka"
      />
      <p v-if="player.joinError" class="card__error">{{ player.joinError }}</p>
      <UiButton type="submit" size="lg" variant="brand" block :disabled="player.joining || nick.trim().length === 0">
        {{ player.joining ? 'Připojuji…' : 'Jdu do toho' }}
      </UiButton>
      <p class="card__hint">Uvidí ji celá místnost na plátně.</p>
    </form>

    <!-- Čekárna ----------------------------------------------------------- -->
    <section v-else-if="view === 'waiting'" class="card">
      <PlayerAvatar class="card__ava" :id="player.avatar" />
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">Jsi ve hře</h1>
      <p class="card__lead">Dívej se na plátno. Otázka se objeví tam, tady budou tlačítka.</p>

      <!-- Známka života. Statická karta bez jediného pohybu vypadá při
           pětiminutovém dobíhání sálu jako zamrzlý telefon. -->
      <p class="alive"><span class="alive__dot" aria-hidden="true"></span> Spojení běží</p>
      <p v-if="playerCount > 0" class="card__hint">
        {{ count(playerCount, 'hráč je', 'hráči jsou', 'hráčů je') }} připojeno
      </p>

      <!-- Bodování nebylo vysvětlené nikde. Hra je rychlostní a nikdo
           o tom nevěděl, takže nikdo nespěchal. -->
      <p class="card__hint">Kdo odpoví správně a rychle, má víc bodů než ten, kdo váhá.</p>
    </section>

    <!-- Otázka ------------------------------------------------------------ -->
    <section v-else-if="view === 'play' || view === 'locked'" class="stage">
      <header class="stage__bar">
        <span class="stage__nick">{{ player.nick }}</span>
        <span class="stage__pos">{{ (session?.index ?? 0) + 1 }} / {{ session?.total }}</span>
      </header>

      <p v-if="locked && player.choice === null" class="stage__msg">
        {{ view === 'locked' ? 'Zamčeno' : 'Připrav se' }}
      </p>
      <p v-else-if="player.choice !== null" class="stage__msg">
        <template v-if="player.send === 'failed'">Neodesláno</template>
        <template v-else-if="player.send === 'sending'">Odesílám…</template>
        <template v-else>Máš zamčeno, kouknij na plátno</template>
      </p>
      <p v-else class="stage__msg stage__msg--go">Vyber možnost</p>

      <PlayerPad
        class="stage__pad"
        :locked="locked"
        :chosen="player.choice"
        :kind="session?.kind ?? 'choice'"
        @pick="answer"
      />

      <UiButton v-if="player.send === 'failed'" variant="danger" block @click="retry">
        Zkusit odeslat znovu
      </UiButton>
    </section>

    <!-- Výsledek otázky --------------------------------------------------- -->
    <section v-else-if="view === 'result'" class="card" :class="wasRight === null ? '' : wasRight ? 'card--ok' : 'card--bad'">
      <PlayerAvatar class="card__ava" :id="player.avatar" />
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">
        <template v-if="wasRight === null">Neodpověděl jsi</template>
        <template v-else-if="wasRight">Správně</template>
        <template v-else>Vedle</template>
      </h1>

      <p v-if="session?.reveal" class="card__correct">
        Správně bylo
        <span class="card__letter" :style="{ color: `var(${quizOption(session.reveal.correctIndex).color.cssVar})` }">
          {{ correctWord }}
        </span>
      </p>

      <p v-if="myGain > 0" class="card__gain">+{{ formatScore(myGain) }}</p>
      <p class="card__score">{{ formatScore(session?.scores[player.uid] ?? 0) }} bodů</p>
      <p class="card__lead">{{ myRank }}. z {{ playerCount }}</p>

      <!-- Poučka se na telefony posílala od začátku a nikdy se nezobrazila.
           Je to obsah, kvůli kterému se kvíz hraje, a zahazoval se zrovna
           na zařízení, do kterého se všichni koukají. -->
      <p v-if="session?.reveal?.note" class="card__note">{{ session.reveal.note }}</p>
    </section>

    <!-- Konec ------------------------------------------------------------- -->
    <section v-else class="card">
      <PlayerAvatar class="card__ava" :id="player.avatar" />
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">{{ myRank }}. místo</h1>
      <p class="card__score">{{ formatScore(session?.scores[player.uid] ?? 0) }} bodů</p>
      <p class="card__lead">Výsledky jsou na plátně.</p>
    </section>
  </main>
</template>

<style scoped>
/* Telefon hráče je běžné rozhraní, ne herní plocha: nastavení velikosti
   písma sem nepatří, ovládá se jen palcem a čte zblízka. */
.play {
  min-height: 100dvh;
  display: grid;
  padding: var(--sp-4);
  background: linear-gradient(180deg, var(--c-base) 0%, var(--c-abyss) 100%);
}

/* Karta ------------------------------------------------------------------- */
.card {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--sp-3);
  text-align: center;
  padding: var(--sp-5);
}
.card__eyebrow {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.card__title { font-size: var(--fs-2xl); font-weight: 900; letter-spacing: -0.02em; }
.card__lead { color: var(--c-text-muted); line-height: var(--lh-body); max-width: 22rem; }
.card__hint { font-size: var(--fs-xs); color: var(--c-text-faint); }
.card__error { color: var(--c-bad); font-size: var(--fs-sm); }
.card__code {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 900;
  letter-spacing: 0.15em;
  color: var(--c-brand);
}
.card__input {
  width: min(100%, 20rem);
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-bg-field);
  color: var(--c-text);
  font-size: var(--fs-lg);
  text-align: center;
}
.card__input:focus-visible { border-color: var(--c-brand); }

/* Pole na kód. Velké a prostrkané, protože se do něj opisuje z plátna
   a překlep tu stojí hráče celou hru. */
.code-input {
  width: min(100%, 20rem);
  padding: var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-bg-field);
  color: var(--c-brand);
  font-family: var(--font-display);
  font-size: var(--fs-3xl);
  font-weight: 900;
  letter-spacing: 0.18em;
  text-align: center;
  text-transform: uppercase;
}
.code-input:focus-visible { border-color: var(--c-brand); }

/* Poučka po odhalení. Odsazená čárou, aby nesplynula s body. */
.card__note {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: var(--border-w) solid var(--c-border-soft);
  max-width: 24rem;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.card__ava { --ava-size: 4rem; }

/* Puls spojení. Pomalý, aby uklidňoval, ne aby na sebe upozorňoval. */
.alive {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-ok);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.alive__dot {
  width: var(--sp-2);
  height: var(--sp-2);
  border-radius: var(--r-full);
  background: currentColor;
  animation: alive-pulse var(--dur-breathe) var(--ease-both) infinite;
}
@keyframes alive-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .alive__dot { animation: none; }
}

/* Vlastní zvíře. Je to tlačítko, protože na něj jde ťuknout a vyměnit ho,
   ale nevypadá jako formulář: hlavní úkol téhle obrazovky je jméno. */
.me {
  display: grid;
  justify-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2);
  border: 0;
  background: transparent;
  color: var(--c-text);
}
.me__ava { --ava-size: 6rem; }
.me__name { font-weight: 700; }
.me__swap { font-size: var(--fs-xs); color: var(--c-brand); text-decoration: underline; }

.zoo {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sp-2);
  width: min(100%, 20rem);
}
.zoo__pick {
  display: grid;
  place-items: center;
  width: 100%;
  padding: var(--sp-1);
  border: var(--separator-w) solid transparent;
  border-radius: var(--r-lg);
  background: transparent;
}
.zoo__pick :deep(.ava) { --ava-size: 100%; }
/* Vybrané zvíře pozná i ten, kdo barvy nerozezná: má rámeček a plochu. */
.zoo__pick--on { border-color: var(--c-brand); background: var(--c-surface-2); }
.card__correct { color: var(--c-text-muted); }
.card__letter { font-family: var(--font-display); font-weight: 900; font-size: var(--fs-xl); }
.card__gain {
  font-family: var(--font-display);
  font-size: var(--fs-3xl);
  font-weight: 900;
  color: var(--c-ok);
}
.card__score { font-size: var(--fs-lg); font-weight: 700; }

/* Výsledek nese slovo i barvu. Samotný odstín by na slunci u okna nestačil. */
.card--ok .card__title { color: var(--c-ok); }
.card--bad .card__title { color: var(--c-bad); }

/* Otázka ------------------------------------------------------------------ */
.stage {
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: var(--sp-3);
  min-height: 0;
}
.stage__bar {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
}
.stage__nick { font-weight: 700; color: var(--c-text-muted); }
.stage__msg {
  text-align: center;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-muted);
}
.stage__msg--go { color: var(--c-brand); }
.stage__pad { min-height: 0; }

@media (pointer: coarse) {
  .me,
  .zoo__pick { min-height: var(--control-touch); }
}
</style>
