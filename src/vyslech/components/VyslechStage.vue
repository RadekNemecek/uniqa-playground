<script setup lang="ts">
import { computed, watch } from 'vue'
import QrCode from '@/games/kviz/components/QrCode.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { QUIZ_OPTIONS } from '@/games/kviz/options'
import { count as countWords, plural } from '@/lib/format'
import { sfx } from '@/lib/sound'
import { minutesFor } from '../questions'
import type { VyslechQuestion } from '../types'

/**
 * Plátno během sběru.
 *
 * QR kód, název školení a počet odevzdaných dotazníků. Výsledky se
 * v sále neukazují: v malé skupině by šlo poznat, kdo co napsal,
 * a lektor by musel komentovat svoje hodnocení před lidmi.
 *
 * Každý odevzdaný dotazník přidá dlaždici. Je to jediný pohyb na plátně
 * a stačí, aby bylo vidět, že se něco děje, a lidi to mírně postrčilo.
 */
const props = defineProps<{
  code: string
  title: string
  questions: VyslechQuestion[]
  count: number
  phase: 'open' | 'closed'
  closing: boolean
  hasReport: boolean
  reportSaved: boolean
}>()

const emit = defineEmits<{
  close: []
  results: []
  again: []
  retrySave: []
  download: []
}>()

/** Adresa pro telefony. Krátká, ať je QR kód řídký a čitelný i z dálky. */
const url = computed(() => `${location.origin}${import.meta.env.BASE_URL}v/${props.code}`)
const letters = computed(() => [...props.code])
const minutes = computed(() => minutesFor(props.questions))

/** Stejné upozornění jako v čekárně kvízu: localhost telefon nenajde. */
const onlyThisMachine = computed(() =>
  ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname),
)

/** Dlaždice zmenšuje, aby se vešly na jednu obrazovku i při plném sále. */
const tileSize = computed(() => {
  if (props.count <= 24) return 'var(--vy-tile-lg)'
  if (props.count <= 60) return 'var(--vy-tile-md)'
  return 'var(--vy-tile-sm)'
})

/** Strop na počet kreslených dlaždic. Víc by se na plátno nevešlo
 *  a číslo nad nimi stejně říká přesný počet. */
const TILE_CAP = 150
const tiles = computed(() => Math.min(props.count, TILE_CAP))

function tone(i: number): string {
  return `var(${QUIZ_OPTIONS[i % QUIZ_OPTIONS.length]!.color.cssVar})`
}

/** Mírné natočení, ať dlaždice leží jako na stole, ne v tabulce. */
function tilt(i: number): string {
  return `${((i * 37) % 7) - 3}deg`
}

// Plop při každém novém dotazníku. Jen při přírůstku, ne při načtení
// po obnovení stránky.
watch(
  () => props.count,
  (next, prev) => {
    if (props.phase === 'open' && prev !== undefined && next > prev) sfx.pop()
  },
)
</script>

<template>
  <!-- Sběr běží --------------------------------------------------------- -->
  <section v-if="phase === 'open'" class="stage">
    <div class="join">
      <p class="join__lead">Načti a odpověz</p>
      <QrCode class="join__qr" :url="url" label="QR kód pro otevření dotazníku" />
      <div class="join__manual">
        <p class="join__label">Kód</p>
        <p class="join__code" :aria-label="`Kód ${letters.join(' ')}`">
          <span v-for="(ch, i) in letters" :key="i" aria-hidden="true">{{ ch }}</span>
        </p>
        <p class="join__url">{{ url.replace(/^https?:\/\//, '') }}</p>
      </div>
      <p v-if="onlyThisMachine" class="join__warn">
        Tahle adresa platí jen pro tenhle počítač, telefony se na ni
        nedostanou. Spusť <code>npm run dev:lan</code> a otevři Mučírnu
        na síťové adrese, kterou vypíše.
      </p>
    </div>

    <div class="room">
      <header class="room__head">
        <p class="eyebrow">Výslech</p>
        <h1 v-fit-text class="room__title">{{ title }}</h1>
        <p class="room__lead">
          Jak to dnes šlo? Odpovědi jsou anonymní a zabere to asi
          {{ countWords(minutes, 'minutu', 'minuty', 'minut') }}.
        </p>
      </header>

      <p class="room__count" aria-live="polite">
        <strong>{{ count }}</strong>
        <span>{{ plural(count, 'odevzdaný dotazník', 'odevzdané dotazníky', 'odevzdaných dotazníků') }}</span>
      </p>

      <ul class="tiles" :style="{ '--vy-tile': tileSize }" aria-hidden="true">
        <li
          v-for="i in tiles"
          :key="i"
          class="tile"
          :style="{ '--tone': tone(i - 1), '--tilt': tilt(i) }"
        >
          <UiIcon name="check" size="sm" />
        </li>
      </ul>

      <footer class="room__foot">
        <UiButton variant="danger" :loading="closing" @click="emit('close')">Ukončit sběr</UiButton>
        <p class="room__hint">Až odevzdají všichni, stiskni mezerník.</p>
      </footer>
    </div>
  </section>

  <!-- Uzavřeno ----------------------------------------------------------- -->
  <section v-else class="done">
    <div class="done__card">
      <p class="done__sticker">Uzavřeno</p>
      <h1 v-fit-text class="done__title">{{ title }}</h1>
      <p class="done__count">
        <strong>{{ count }}</strong>
        <span>{{ plural(count, 'odevzdaný dotazník', 'odevzdané dotazníky', 'odevzdaných dotazníků') }}</span>
      </p>

      <template v-if="!hasReport">
        <p class="done__lead">Nikdo neodpověděl, nic se neukládá.</p>
        <div class="done__actions">
          <UiButton variant="brand" @click="emit('again')">Nový sběr</UiButton>
        </div>
      </template>

      <template v-else-if="reportSaved">
        <p class="done__lead">Díky všem. Výsledky jsou uložené a čekají v záložce Výsledky.</p>
        <div class="done__actions">
          <UiButton variant="brand" icon-after="arrow-right" @click="emit('results')">Otevřít výsledky</UiButton>
          <UiButton variant="ghost" @click="emit('again')">Nový sběr</UiButton>
        </div>
      </template>

      <template v-else>
        <p class="done__warn" role="alert">
          Výsledky se nepodařilo uložit. Odpovědi zůstávají v databázi, zkus to
          znovu, nebo si stáhni tabulku.
        </p>
        <div class="done__actions">
          <UiButton variant="brand" @click="emit('retrySave')">Zkusit uložit znovu</UiButton>
          <UiButton variant="ghost" icon="download" @click="emit('download')">Stáhnout tabulku</UiButton>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* Rozměry plátna Výslechu. Používá je jen tahle obrazovka. */
.stage,
.done {
  --vy-qr-col: 28rem;
  --vy-qr-max: 34rem;
  --vy-qr-vmax: 54vh;
  --vy-tile-lg: 4.5rem;
  --vy-tile-md: 3rem;
  --vy-tile-sm: 2rem;
}

.stage {
  display: grid;
  grid-template-columns: minmax(var(--vy-qr-col), 0.95fr) minmax(0, 1.05fr);
  gap: var(--sp-6);
  align-items: stretch;
  height: 100%;
  min-height: 0;
  padding: var(--sp-4) var(--sp-6) var(--sp-5);
}

/* Připojení: stejný tvar jako čekárna kvízu, ať sál pozná, co dělat. */
.join { display: grid; align-content: start; justify-items: center; gap: var(--sp-3); min-height: 0; }
.join__lead {
  font-size: var(--fs-xl);
  font-weight: 900;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-muted);
}
.join__qr { width: min(100%, var(--vy-qr-max), var(--vy-qr-vmax)); }
.join__manual { display: grid; justify-items: center; gap: var(--sp-1); }
.join__label { color: var(--c-text-muted); font-size: var(--fs-xs); font-weight: 900; letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.join__code {
  display: flex;
  gap: var(--sp-2);
  font-family: var(--font-display);
  font-size: calc(var(--fs-hero) * 0.75);
  font-weight: 900;
  line-height: 1;
  color: var(--c-brand);
}
.join__code span {
  display: grid;
  place-items: center;
  min-width: 1.1em;
  padding: 0.1em 0.12em;
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}
/* Výjimka z pravidla o dělení: adresa není slovo, opisuje se po znacích. */
.join__url {
  max-width: var(--content-narrow);
  font-size: var(--fs-xs);
  color: var(--c-text-muted);
  overflow-wrap: anywhere;
  text-align: center;
}
.join__warn {
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
  font-size: var(--fs-xs);
  line-height: var(--lh-body);
}

/* Počítadlo ----------------------------------------------------------------- */
.room {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: var(--sp-4);
  height: 100%;
  min-height: 0;
  padding: var(--sp-5);
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
}
.room__head { display: grid; gap: var(--sp-2); min-width: 0; }
.room__title {
  font-size: calc(var(--fs-prompt) * var(--fit-text, 1));
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: var(--lh-tight);
}
.room__lead { color: var(--c-text-muted); font-size: var(--fs-xl); line-height: var(--lh-snug); }
.room__count { display: flex; align-items: baseline; gap: var(--sp-3); flex-wrap: wrap; }
.room__count strong {
  color: var(--c-brand);
  font-size: var(--fs-hero);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.room__count span { color: var(--c-text-muted); font-size: var(--fs-xl); font-weight: 700; }

.tiles {
  list-style: none;
  margin: 0;
  padding: var(--sp-1);
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--vy-tile));
  grid-auto-rows: var(--vy-tile);
  align-content: start;
  gap: var(--sp-2);
  min-height: 0;
  overflow: hidden;
}
.tile {
  display: grid;
  place-items: center;
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--tone);
  box-shadow: var(--shadow-sm);
  color: var(--c-text-ink);
  rotate: var(--tilt);
  animation: drop-in var(--dur-pop) var(--ease-back) both;
}
@keyframes drop-in {
  from { opacity: 0; transform: scale(0.4) rotate(-20deg); }
  to { opacity: 1; transform: none; }
}

.room__foot { display: flex; align-items: center; gap: var(--sp-4); flex-wrap: wrap; }
.room__hint { font-size: var(--fs-sm); color: var(--c-text-muted); }

/* Uzavřeno ------------------------------------------------------------------ */
.done { display: grid; place-items: center; height: 100%; min-height: 0; padding: var(--sp-6); }
.done__card {
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  width: min(100%, var(--content-reading));
  padding: var(--sp-7) var(--sp-6);
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
  text-align: center;
}
.done__sticker {
  padding: var(--sp-1) var(--sp-5);
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-ok-fill);
  box-shadow: var(--shadow-md);
  color: var(--c-text-ink);
  font-size: var(--fs-xl);
  font-weight: 900;
  rotate: -3deg;
  animation: stamp var(--dur-pop) var(--ease-back) both;
}
.done__title { width: 100%; font-size: calc(var(--fs-2xl) * var(--fit-text, 1)); font-weight: 900; line-height: var(--lh-tight); }
.done__count { display: grid; justify-items: center; }
.done__count strong { color: var(--c-brand); font-size: var(--fs-hero); font-weight: 900; line-height: 1; font-variant-numeric: tabular-nums; }
.done__count span { color: var(--c-text-muted); font-size: var(--fs-md); font-weight: 700; }
.done__lead { color: var(--c-text-muted); font-size: var(--fs-md); line-height: var(--lh-body); max-width: var(--content-narrow); }
.done__warn {
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.done__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; justify-content: center; }

@keyframes stamp {
  from { opacity: 0; transform: scale(1.6) rotate(8deg); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .done__sticker { animation: none; }
}

@media (max-width: 960px) {
  .stage { grid-template-columns: minmax(0, 1fr); align-items: start; overflow-y: auto; }
  .room { height: auto; }
}
</style>
