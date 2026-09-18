<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import QrCode from './QrCode.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import { count } from '@/lib/format'
import type { QuizPlayer } from '../types'

const props = defineProps<{
  code: string
  players: QuizPlayer[]
  total: number
}>()

const emit = defineEmits<{
  start: []
  kick: [uid: string]
  rename: [uid: string, nick: string]
}>()

const editing = ref<string | null>(null)
const draftNick = ref('')

/** Adresa, kterou nese QR kód. Krátká schválně, ať je kód řídký a čitelný
 *  i z posledního stolu. */
const url = computed(() => `${location.origin}${import.meta.env.BASE_URL}k/${props.code}`)

/**
 * `localhost` je jméno, které si každé zařízení překládá na sebe sama.
 * Telefon by se po načtení kódu pokusil spojit sám se sebou a nikam
 * nedošel. Nasazená aplikace to nepotká, při zkoušení z notebooku ano,
 * a bez upozornění by na to moderátorka přišla až před plnou místností.
 */
const onlyThisMachine = computed(() =>
  ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname),
)

/** Pro přepsání do telefonu se kód sází po znacích, jinak se z dálky slije. */
const letters = computed(() => [...props.code])

function startRename(p: QuizPlayer): void {
  editing.value = p.uid
  draftNick.value = p.nick
}

function commitRename(uid: string): void {
  const next = draftNick.value.trim()
  if (next && next !== props.players.find((p) => p.uid === uid)?.nick) {
    emit('rename', uid, next)
  }
  editing.value = null
}
</script>

<template>
  <section class="lobby">
    <div class="lobby__join">
      <p class="lobby__lead">Připoj se do hry</p>
      <QrCode class="lobby__qr" :url="url" />

      <div class="lobby__manual">
        <p class="lobby__code-label">Kód hry</p>
        <p class="lobby__code" :aria-label="`Kód hry ${letters.join(' ')}`">
          <span v-for="(ch, i) in letters" :key="i" aria-hidden="true">{{ ch }}</span>
        </p>
        <p class="lobby__url">{{ url.replace(/^https?:\/\//, '') }}</p>
      </div>

      <p v-if="onlyThisMachine" class="lobby__warn">
        Tahle adresa platí jen pro tenhle počítač, telefony se na ni
        nedostanou. Spusť <code>npm run dev:lan</code> a otevři Playground
        na síťové adrese, kterou vypíše. QR kód se pak opraví sám.
      </p>
    </div>

    <div class="lobby__room">
      <header class="room__head">
        <div>
          <p class="eyebrow">Čekárna</p>
          <h2 class="room__title">Přihlášení hráči</h2>
        </div>
        <p class="room__count">
          <strong>{{ players.length }}</strong>
          <span>{{ count(players.length, 'hráč připojen', 'hráči připojeni', 'hráčů připojeno') }}</span>
        </p>
      </header>

      <p v-if="players.length === 0" class="room__empty">
        Jména naskočí sama, jak se lidé připojí.
      </p>

      <ul v-else class="room__list">
        <li v-for="p in players" :key="p.uid" class="who">
          <template v-if="editing === p.uid">
            <input
              v-model="draftNick"
              class="who__input"
              type="text"
              maxlength="20"
              :aria-label="`Přezdívka hráče ${p.nick}`"
              @keydown.enter="commitRename(p.uid)"
              @keydown.esc="editing = null"
              @blur="commitRename(p.uid)"
            />
          </template>
          <template v-else>
            <PlayerAvatar class="who__ava" :id="p.avatar" />
            <span class="who__nick">{{ p.nick }}</span>
            <button type="button" class="who__tool" :aria-label="`Přejmenovat ${p.nick}`" @click="startRename(p)">
              Přejmenovat
            </button>
            <button type="button" class="who__tool who__tool--danger" :aria-label="`Vyhodit ${p.nick}`" @click="emit('kick', p.uid)">
              Vyhodit
            </button>
          </template>
        </li>
      </ul>

      <footer class="room__foot">
        <UiButton size="lg" variant="brand" :disabled="players.length === 0" @click="emit('start')">
          Spustit hru · {{ count(total, 'otázka', 'otázky', 'otázek') }}
        </UiButton>
        <p class="room__hint">Až jsou všichni připojení, stiskni mezerník.</p>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.lobby {
  display: grid;
  grid-template-columns: minmax(var(--quiz-lobby-qr-col), 0.95fr) minmax(0, 1.05fr);
  gap: var(--sp-6);
  align-items: stretch;
  height: 100%;
  min-height: 0;
  padding: var(--sp-4) var(--sp-6) var(--sp-5);
}

/* Připojení --------------------------------------------------------------- */
.lobby__join { display: grid; align-content: start; justify-items: center; gap: var(--sp-3); min-height: 0; }
.lobby__lead {
  font-size: var(--fs-xl);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-muted);
}
.lobby__qr { width: min(100%, var(--quiz-qr-max), var(--quiz-qr-vmax)); }
.lobby__manual { display: grid; justify-items: center; gap: var(--sp-1); }
.lobby__code-label { color: var(--c-text-faint); font-size: var(--fs-xs); font-weight: 700; letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.lobby__warn {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-bad) 16%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-xs);
  line-height: var(--lh-body);
  text-align: left;
}
.lobby__warn code {
  font-family: ui-monospace, monospace;
  color: var(--c-text);
}
.lobby__url { max-width: var(--content-narrow); font-size: var(--fs-xs); color: var(--c-text-faint); overflow-wrap: anywhere; text-align: center; }

/* Kód se čte z druhého konce místnosti, proto jde na doraz a po znacích. */
.lobby__code {
  display: flex;
  gap: var(--sp-2);
  font-family: var(--font-display);
  font-size: clamp(var(--fs-2xl), 1rem + 3vw, 4.5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--c-brand);
}

/* Soupiska ---------------------------------------------------------------- */
.lobby__room { display: grid; grid-template-rows: auto 1fr auto; gap: var(--sp-5); height: 100%; min-height: 0; padding: var(--sp-4); border: var(--separator-w) solid var(--c-line); border-radius: var(--r-xl); background: color-mix(in oklab, var(--c-surface) 72%, transparent); }
.room__head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: var(--sp-4); }
.room__title { margin-top: var(--sp-1); font-size: var(--fs-2xl); font-weight: 900; }
.room__count { display: grid; justify-items: end; line-height: var(--lh-tight); }
.room__count strong { color: var(--c-brand); font-size: var(--fs-hero); font-weight: 900; font-variant-numeric: tabular-nums; }
.room__count span { color: var(--c-text-muted); font-size: var(--fs-sm); font-weight: 700; }
.room__empty { color: var(--c-text-faint); }

.room__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: start;
  gap: var(--sp-2);
  min-height: 0;
  overflow-y: auto;
}
.who {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: var(--c-surface);
  /* Jméno nastupuje, aby bylo poznat, že někdo právě přišel. */
  animation: pop var(--dur-base) var(--ease-back) both;
}
.who__ava { --ava-size: 1.75rem; }
.who__nick { font-weight: 700; }
.who__tool {
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
}
.who__tool:hover { color: var(--c-text); }
.who__tool--danger:hover { color: var(--c-bad); }
.who__input {
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--c-brand);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text);
  font-weight: 700;
}

.room__foot { display: grid; gap: var(--sp-2); justify-items: start; }
.room__hint { font-size: var(--fs-xs); color: var(--c-text-faint); }

@keyframes pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .who { animation: none; }
}

@media (max-width: 860px) {
  .lobby { grid-template-columns: minmax(0, 1fr); overflow-y: auto; }
  .lobby__room { min-height: var(--quiz-lobby-room-min); }
}
</style>
