<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import { quizPacks, quizPackProgress, reloadQuizPacks } from '@/stores/quizPacks'
import { count } from '@/lib/format'
import { availableCount } from '../questions'
import { hasSessionDb } from '@/lib/sessionDb'
import type { QuizPack, QuizSetup } from '../types'
import type { Segment } from '@/components/ui/segmented'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiField from '@/components/ui/UiField.vue'

withDefaults(defineProps<{ busy?: boolean }>(), { busy: false })
const emit = defineEmits<{ start: [packs: QuizPack[], setup: QuizSetup] }>()

const LIMITS = [10, 20, 30, 40, 50]

/** Nabízené stropy. Nula je „všechny" a stojí první, protože je výchozí. */
const COUNTS = [5, 10, 15, 20, 30]

const chosen = ref(new Set<string>())
const limitSeconds = ref(30)
/**
 * Strop na počet otázek. Nula znamená všechny a je to výchozí stav:
 * balíček se chystá na konkrétní školení, takže se obvykle hraje celý.
 * Strop je na krátký blok, kdy se z nachystané zásoby vylosuje výběr.
 */
const wantCount = ref(0)
/**
 * Bez sdílené databáze se telefony nemají kam připojit. Není to porucha,
 * je to druhý způsob, jak kvíz vést: promítaná hra s ručním bodováním.
 * Čte se až při vykreslení, ne při načtení modulu, aby na pořadí importů
 * nezáleželo.
 */
const canUsePhones = computed(() => hasSessionDb())
const withPhones = ref(true)

/**
 * Koho školíme. Nepovinné, ale rozhoduje o tom, jestli je archiv
 * k něčemu: „kvíz z 12. 3." je bez názvu skupiny nedohledatelný, když se
 * ten den školily tři party.
 */
const GROUP_KEY = 'playground.kviz.group.v1'
const groupName = ref(localStorage.getItem(GROUP_KEY) ?? '')
watch(groupName, (v) => {
  try {
    localStorage.setItem(GROUP_KEY, v)
  } catch {
    /* soukromé okno */
  }
})

/** Balíčky, ve kterých je aspoň jedna hotová otázka. */
const usable = computed(() => quizPacks.packs.filter((p) => quizPackProgress(p).done > 0))

const setup = computed<QuizSetup>(() => ({
  packIds: [...chosen.value],
  count: wantCount.value,
  limitSeconds: limitSeconds.value,
  withPhones: withPhones.value && canUsePhones.value,
  groupName: groupName.value.trim(),
}))

const pool = computed(() => availableCount(usable.value, setup.value))
const willPlay = computed(() =>
  wantCount.value > 0 ? Math.min(wantCount.value, pool.value) : pool.value,
)
const canStart = computed(() => pool.value > 0)

/**
 * Stropy, které dávají smysl. Nabízet „20 otázek", když jich je ve
 * vybraných balíčcích dvanáct, je jen past: vypadá to jako volba, ale
 * zahraje se totéž co u „všech".
 */
const offered = computed(() => COUNTS.filter((n) => n < pool.value))

/** Stejný přepínač jako u času: dvě volby vedle sebe se nemají lišit
 *  tvarem, když dělají totéž. Nula je „všechny" a stojí první. */
const countOptions = computed<Segment<number>[]>(() => [
  { value: 0, label: 'Všechny' },
  ...offered.value.map((n) => ({ value: n, label: String(n) })),
])

/** Kolik se vezme z každého balíčku. Losuje se po balíčcích kolem
 *  dokola, takže díl je stejný, dokud je z čeho brát. */
const perPack = computed(() => {
  const packs = chosen.value.size
  if (packs < 2 || wantCount.value === 0) return 0
  return Math.floor(willPlay.value / packs)
})

// Když se odškrtnutím balíčku zásoba smrskne pod zvolený strop, volba
// by v pásu zmizela a zůstala platit potichu. Vrátíme se na „všechny".
watch([pool, wantCount], ([n, want]) => {
  if (want > 0 && want >= n) wantCount.value = 0
})

function toggle(id: string): void {
  const next = new Set(chosen.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  chosen.value = next
}

// První balíček zaškrtneme samy, ať se nezačíná na prázdné obrazovce.
// Zároveň z výběru vypadne balíček, který mezitím někdo smazal.
watch(
  usable,
  (list) => {
    const live = new Set(list.map((p) => p.id))
    const kept = [...chosen.value].filter((id) => live.has(id))
    if (kept.length === 0 && list.length > 0) chosen.value = new Set([list[0]!.id])
    else if (kept.length !== chosen.value.size) chosen.value = new Set(kept)
  },
  { immediate: true },
)

function start(): void {
  if (!canStart.value) return
  emit('start', usable.value, setup.value)
}
</script>

<template>
  <main id="obsah" class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Na kolik to dáš?</p>
      <h1 class="setup__title">Připrav kvíz.</h1>
      <p class="lead">Vyber otázky a nastav průběh.</p>
    </header>

    <UiSkeleton v-if="!quizPacks.loaded" :lines="5" />
    <UiEmpty v-else-if="quizPacks.denied" title="Balíčky se nepodařilo načíst" text="Zkontroluj připojení a zkus to znovu.">
      <UiButton variant="brand" @click="reloadQuizPacks">Zkusit znovu</UiButton>
    </UiEmpty>
    <UiEmpty v-else-if="!usable.length" title="Připrav první otázky" text="Ke spuštění stačí jedna hotová otázka nebo jedno tvrzení.">
      <RouterLink to="/kviz/otazky">Přejít k otázkám</RouterLink>
    </UiEmpty>

    <div v-else class="setup__grid">
      <div class="setup__form">
        <section class="section" aria-labelledby="setup-packs">
          <div class="section__head">
            <h2 id="setup-packs"><span class="section__num" aria-hidden="true">01</span> Z čeho se bude hrát</h2>
            <RouterLink to="/kviz/otazky" class="edit-link">Upravit otázky</RouterLink>
          </div>
          <p class="hint">Vyber jeden nebo více balíčků.</p>
          <ul class="packs">
            <li v-for="p in usable" :key="p.id">
              <UiCheckbox class="pick" :model-value="chosen.has(p.id)" @update:model-value="toggle(p.id)">
                <span class="pick__row">
                  <span class="pick__text">
                    <strong>{{ p.name }}</strong>
                    <span class="hint">{{ quizPackProgress(p).done }} z {{ quizPackProgress(p).total }} otázek hotových</span>
                  </span>
                  <span class="pick__count" aria-hidden="true">{{ quizPackProgress(p).done }}</span>
                </span>
              </UiCheckbox>
            </li>
          </ul>
        </section>

        <section class="section" aria-labelledby="setup-rules">
          <div class="section__head"><h2 id="setup-rules"><span class="section__num" aria-hidden="true">02</span> Jak bude kvíz probíhat</h2></div>
          <div class="rules">
            <div class="rule">
              <p class="rule__label">Počet otázek</p>
              <UiSegmented v-model="wantCount" :options="countOptions" aria-label="Počet otázek" />
            </div>
            <div class="rule">
              <p class="rule__label">Čas na odpověď</p>
              <UiSegmented v-model="limitSeconds" :options="LIMITS.map(s => ({ value: s, label: `${s} s` }))" aria-label="Čas na odpověď" />
            </div>
          </div>
          <p class="hint">
            <template v-if="wantCount === 0">Zahrají se všechny vybrané otázky. Pořadí otázek i možností se zamíchá.</template>
            <template v-else-if="perPack > 0">Vylosuje se {{ count(willPlay, 'otázka', 'otázky', 'otázek') }}, z každého balíčku zhruba {{ perPack }}. Pořadí se zamíchá.</template>
            <template v-else>Vylosuje se {{ count(willPlay, 'otázka', 'otázky', 'otázek') }}. Pořadí se zamíchá.</template>
          </p>
          <UiField label="Skupina (nepovinné)" hint="Název najdeš ve vyhodnocení a ve staženém souboru.">
            <input v-model="groupName" type="text" maxlength="60" placeholder="Např. Obchod Morava" />
          </UiField>
          <UiSwitch v-if="canUsePhones" v-model="withPhones" label="Hráči odpovídají z telefonů" hint="Připojí se přes QR kód. Bez telefonů se kvíz jen promítá a body se nepočítají." />
          <p v-else class="notice">Telefony se teď nepřipojí. Kvíz můžeš promítat bez nich, body si počítáš sama.</p>
        </section>
      </div>

      <aside class="summary" aria-label="Shrnutí připraveného kvízu">
        <p class="eyebrow">Tvůj kvíz</p>
        <h2>Na kolik to dáš?</h2>
        <p class="summary__total" aria-live="polite"><strong>{{ willPlay }}</strong><span>{{ willPlay === 1 ? 'otázka' : willPlay >= 2 && willPlay <= 4 ? 'otázky' : 'otázek' }} ve hře</span></p>
        <dl>
          <dt>Vybrané balíčky</dt><dd>{{ chosen.size }}</dd>
          <dt>Na odpověď</dt><dd>{{ limitSeconds }} s</dd>
          <dt>Odpovídání</dt><dd>{{ setup.withPhones ? 'Z telefonů' : 'Jen promítání' }}</dd>
        </dl>
        <UiButton variant="brand" block :disabled="!canStart" :loading="busy" @click="start">{{ setup.withPhones ? 'Otevřít čekárnu' : 'Spustit promítání' }}</UiButton>
        <p class="summary__next">{{ !canStart ? 'Vyber alespoň jeden balíček.' : setup.withPhones ? 'Hru spustíš, až se hráči připojí.' : 'Bez telefonů se body nepočítají.' }}</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.setup { max-width: var(--content-reading); padding-block: var(--sp-6) var(--sp-8); }
.setup__head { margin-bottom: var(--sp-6); }
.setup__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.lead { color: var(--c-text-muted); margin-top: var(--sp-3); font-size: var(--fs-sm); }
.setup__grid { display: grid; grid-template-columns: minmax(0, 1fr) var(--content-sidebar); gap: var(--sp-7); align-items: start; }
.setup__form { display: grid; gap: var(--sp-6); min-width: 0; }
.section { display: grid; gap: var(--sp-4); }
.section__head { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: space-between; align-items: center; }
.section__head h2 { display: flex; align-items: baseline; gap: var(--sp-3); font-size: var(--fs-xl); }
.section__num { font-size: var(--fs-sm); color: var(--c-brand); font-variant-numeric: tabular-nums; }
.edit-link { display: inline-flex; align-items: center; min-height: var(--control-touch); font-size: var(--fs-sm); font-weight: 700; }
.hint { font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--c-text-faint); }
.packs { list-style: none; padding: 0; border-top: var(--border-w) solid var(--c-border-soft); }
.packs li { border-bottom: var(--border-w) solid var(--c-border-soft); }
.pick { padding: var(--sp-4) var(--sp-2); }
.pick:hover { background: var(--c-bg-active); }
.pick__row { display: flex; justify-content: space-between; gap: var(--sp-4); align-items: center; }
.pick__text { display: grid; gap: var(--sp-1); overflow-wrap: anywhere; }
.pick__count { font-weight: 900; color: var(--c-brand); font-variant-numeric: tabular-nums; }
.rules { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sp-4); align-items: start; }
.rule { display: grid; gap: var(--sp-2); }
.rule__label { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-muted); }
.notice { border-top: var(--border-w) solid var(--c-border-soft); padding-top: var(--sp-4); font-size: var(--fs-sm); color: var(--c-text-muted); }
/* Shrnutí je jediný těžký blok obrazovky. Na světlém sešitu to byl
   tmavý panel; na plátně je to obráceně, tedy vyvýšená plocha
   s hranou. Role je táž, barvy jdou z rampy a nic si tu nepřepisuje
   aliasy. */
.summary {
  position: sticky; top: var(--sp-5); padding: var(--sp-5);
  border: var(--border-w) solid var(--c-border-soft); border-radius: var(--r-lg);
  background: var(--c-surface);
}
.summary .eyebrow, .summary__next { color: var(--c-brand); }
.summary h2 { margin-top: var(--sp-2); font-size: var(--fs-xl); }
.summary__total { display: grid; margin-block: var(--sp-5); }
.summary__total strong { font-size: var(--fs-work-number); font-weight: 900; line-height: var(--lh-tight); font-variant-numeric: tabular-nums; }
.summary__total span { font-size: var(--fs-sm); margin-top: var(--sp-2); }
.summary dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-3); margin-block: var(--sp-5); font-size: var(--fs-sm); }
.summary dd { margin: 0; font-weight: 700; text-align: right; }
.summary__next { font-size: var(--fs-sm); margin-top: var(--sp-3); }
@media (max-width: 960px) { .setup__grid { gap: var(--sp-5); grid-template-columns: minmax(0, 1fr) minmax(0, .65fr); } .rules { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 720px) { .setup__grid { grid-template-columns: minmax(0, 1fr); } .summary { position: static; } .section__head h2 { font-size: var(--fs-lg); } }
</style>
