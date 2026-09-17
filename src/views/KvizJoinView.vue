<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PlayerPad from '@/games/kviz/components/PlayerPad.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { quizOption } from '@/games/kviz/options'
import { normalizeCode } from '@/games/kviz/code'
import { formatScore } from '@/lib/teams'
import {
  answer,
  checking,
  join,
  joined,
  leaveGame,
  locked,
  myGain,
  myRank,
  player,
  playerCount,
  rememberedNick,
  retry,
  wasRight,
  watchGame,
} from '@/stores/quizPlayer'

const route = useRoute()
const nick = ref('')

const code = computed(() => normalizeCode(String(route.params.code ?? '')))
const session = computed(() => player.session)

/** Co má hráč zrovna vidět. Jedna obrazovka, ne pět, aby telefon
 *  nepřeskakoval mezi pohledy při každé změně fáze. */
const view = computed(() => {
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

onMounted(() => void watchGame(code.value))
onBeforeUnmount(leaveGame)
</script>

<template>
  <div class="play">
    <!-- Hra neběží ------------------------------------------------------- -->
    <section v-if="view === 'missing'" class="card">
      <h1 class="card__title">Tahle hra neběží</h1>
      <p class="card__lead">
        Zkontroluj kód na plátně. Pokud sedí, hra ještě nezačala, nebo už skončila.
      </p>
      <p class="card__code">{{ code }}</p>
    </section>

    <section v-else-if="view === 'loading'" class="card">
      <p class="card__lead">Hledám hru…</p>
    </section>

    <!-- Přezdívka -------------------------------------------------------- -->
    <form v-else-if="view === 'join'" class="card" @submit.prevent="submit">
      <h1 class="card__title">Jak ti mám říkat?</h1>
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
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">Jsi ve hře</h1>
      <p class="card__lead">Dívej se na plátno. Otázka se objeví tam, tady budou tlačítka.</p>
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

      <PlayerPad class="stage__pad" :locked="locked" :chosen="player.choice" @pick="answer" />

      <UiButton v-if="player.send === 'failed'" variant="danger" block @click="retry">
        Zkusit odeslat znovu
      </UiButton>
    </section>

    <!-- Výsledek otázky --------------------------------------------------- -->
    <section v-else-if="view === 'result'" class="card" :class="wasRight === null ? '' : wasRight ? 'card--ok' : 'card--bad'">
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">
        <template v-if="wasRight === null">Neodpověděl jsi</template>
        <template v-else-if="wasRight">Správně</template>
        <template v-else>Vedle</template>
      </h1>

      <p v-if="session?.reveal" class="card__correct">
        Správně bylo
        <span class="card__letter" :style="{ color: `var(${quizOption(session.reveal.correctIndex).color.cssVar})` }">
          {{ quizOption(session.reveal.correctIndex).letter }}
        </span>
      </p>

      <p v-if="myGain > 0" class="card__gain">+{{ formatScore(myGain) }}</p>
      <p class="card__score">{{ formatScore(session?.scores[player.uid] ?? 0) }} bodů</p>
      <p class="card__lead">{{ myRank }}. z {{ playerCount }}</p>
    </section>

    <!-- Konec ------------------------------------------------------------- -->
    <section v-else class="card">
      <p class="card__eyebrow">{{ player.nick }}</p>
      <h1 class="card__title">{{ myRank }}. místo</h1>
      <p class="card__score">{{ formatScore(session?.scores[player.uid] ?? 0) }} bodů</p>
      <p class="card__lead">Výsledky jsou na plátně.</p>
    </section>
  </div>
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
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-sunken);
  color: var(--c-text);
  font-size: var(--fs-lg);
  text-align: center;
}
.card__input:focus { border-color: var(--c-brand); }
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
</style>
