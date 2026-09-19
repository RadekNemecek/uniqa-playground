<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { GameRules, GameSetup, Pack } from '@/types'
import { packs, packProgress, playableCategories } from '@/stores/packs'
import { settings } from '@/stores/settings'
import { TEAM_COLORS, teamBadge, teamColor } from '@/lib/teams'
import { count } from '@/lib/format'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import type { Segment } from '@/components/ui/segmented'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'

const emit = defineEmits<{ start: [pack: Pack, setup: GameSetup] }>()

const route = useRoute()

const SETUP_KEY = 'playground.setup.v1'
/**
 * Kolik kategorií unese deska na plátně.
 *
 * Musí sedět s `PLAYABLE_CATEGORIES` v editoru balíčků, jinak jde napsat
 * kategorii, která se do hry nikdy nedostane.
 */
const MAX_CATEGORIES = 6

/** Jména podle palety týmů, ve stejném pořadí jako TEAM_COLORS. */
const TEAM_NAMES = ['Azuroví', 'Tyrkysoví', 'Limetky', 'Levanduloví', 'Růžoví', 'Pískoví'] as const

function nameForColor(color: number, index: number): string {
  return TEAM_NAMES[color % TEAM_NAMES.length] ?? `Tým ${teamBadge(index)}`
}

interface SavedSetup {
  groupName?: string
  packId: string
  categoryIds: string[]
  teams: Array<{ name: string; color: number }>
  rules: GameRules
  wagerPicked: boolean
}

function loadSaved(): SavedSetup | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedSetup
  } catch {
    localStorage.removeItem(SETUP_KEY)
    return null
  }
}

const saved = loadSaved()

/**
 * Balíček z adresy má přednost před tím, co si příprava pamatuje.
 *
 * Tudy chodí „Vyzkoušet v hře" ze správy otázek: kdo si balíček zrovna
 * upravil, chce zkoušet jeho, ne ten, se kterým se hrálo naposled.
 */
const fromQuery = typeof route.query.pack === 'string' ? route.query.pack : ''

const packId = ref<string>(fromQuery || saved?.packId || '')
const selected = ref<Set<string>>(new Set(fromQuery ? [] : (saved?.categoryIds ?? [])))
const teams = ref(
  saved?.teams?.length
    ? saved.teams.map((t) => ({ name: t.name, color: t.color }))
    : [
        { name: nameForColor(0, 0), color: 0 },
        { name: nameForColor(1, 1), color: 1 },
      ],
)
const rules = ref<GameRules>({
  timerSeconds: saved?.rules.timerSeconds ?? 30,
  penalty: saved?.rules.penalty ?? true,
  steal: saved?.rules.steal ?? false,
  floorZero: saved?.rules.floorZero ?? true,
  wagerCells: saved?.rules.wagerCells ?? 0,
  sound: true,
})

/** Dokud si počet polí Riziko! nezvolí moderátorka sama, drží se na
 *  maximu, které deska unese. */
const wagerPicked = ref(saved?.wagerPicked ?? false)

/**
 * Koho školíme. Nepovinné, ale bez toho je archiv odehraných her jen
 * seznam dat: „hra z 12. 3." nikomu nepoví, které skupiny se týkala.
 * Pamatuje se stejně jako zbytek přípravy.
 */
const groupName = ref(saved?.groupName ?? '')

const TIMER_OPTIONS: Segment<number>[] = [0, 15, 30, 45, 60].map((s) => ({
  value: s,
  label: s === 0 ? 'Bez' : `${s} s`,
}))

const pack = computed<Pack | undefined>(() => packs.packs.find((p) => p.id === packId.value))

/** Do správy se chodí rovnou k vybranému balíčku, ne na jeho hledání. */
const editLink = computed(() =>
  packId.value ? { path: '/admin', query: { pack: packId.value } } : { path: '/admin' },
)
const usable = computed(() => (pack.value ? playableCategories(pack.value) : []))
const incomplete = computed(() =>
  pack.value ? pack.value.categories.filter((c) => !usable.value.some((u) => u.id === c.id)) : [],
)

const selectedCats = computed(() => usable.value.filter((c) => selected.value.has(c.id)))

const boardPreview = computed(() => ({
  cols: selectedCats.value.length,
  rows: pack.value?.ladder.length ?? 0,
  categories: selectedCats.value,
  ladder: pack.value?.ladder ?? [],
  cells: selectedCats.value.length * (pack.value?.ladder.length ?? 0),
}))

// Předvyber první balíček, který je vůbec hratelný.
watch(
  () => packs.packs,
  (list) => {
    if (packId.value && list.some((p) => p.id === packId.value)) return
    const first = list.find((p) => playableCategories(p).length >= 1) ?? list[0]
    if (first) packId.value = first.id
  },
  { immediate: true, deep: true },
)

watch(
  usable,
  (list) => {
    const still = [...selected.value].filter((id) => list.some((c) => c.id === id))
    if (still.length) {
      selected.value = new Set(still.slice(0, MAX_CATEGORIES))
      return
    }
    // Prázdný seznam znamená, že balíčky ještě nedorazily. Necháme
    // uložený výběr, ať ho nepřepíšeme dřív, než je s čím porovnat.
    if (!list.length) return
    selected.value = new Set(list.slice(0, MAX_CATEGORIES).map((c) => c.id))
  },
  { immediate: true },
)

function toggleCategory(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else if (next.size >= MAX_CATEGORIES) return
  else next.add(id)
  selected.value = next
}

function addTeam() {
  if (teams.value.length >= 6) return
  const used = new Set(teams.value.map((t) => t.color))
  const color = TEAM_COLORS.findIndex((_, i) => !used.has(i))
  const next = color < 0 ? teams.value.length % 6 : color
  teams.value.push({
    name: nameForColor(next, teams.value.length),
    color: next,
  })
}

function removeTeam(i: number) {
  if (teams.value.length <= 1) return
  teams.value.splice(i, 1)
}

/** Otevřená nabídka barev, index týmu. */
const picker = ref<number | null>(null)

function togglePicker(i: number) {
  picker.value = picker.value === i ? null : i
}

function chooseColor(i: number, color: number) {
  const team = teams.value[i]
  if (!team) return
  const prev = nameForColor(team.color, i)
  team.color = color
  // Když má tým výchozí jméno podle staré barvy, přejmenuj ho s barvou.
  if (!team.name.trim() || team.name === prev) team.name = nameForColor(color, i)
  picker.value = null
}

/** Barvu, kterou už má jiný tým, nabízet nemá smysl. */
function colorTakenBy(color: number, exceptIndex: number): number {
  return teams.value.findIndex((t, i) => i !== exceptIndex && t.color === color)
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (picker.value !== null && !target.closest('.team__color')) picker.value = null
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') picker.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onEscape)
})

/**
 * Kolik polí Riziko! deska unese.
 *
 * Nejvýš jedno na kategorii a nejvýš čtyři za hru. Dvě pole v jednom
 * sloupci by se potkala a víc než čtyři sázky za půlhodinu je zdržení.
 *
 * Dřív se počítalo jedno pole na šest políček. To nikde nestálo, nedalo
 * se to z obrazovky uhodnout a při jedné kategorii vycházela nula:
 * celá volba se tiše zakázala a zvolený počet spadl na Žádné, aniž by
 * se kdokoli dozvěděl proč. Pětkrát pět políček přitom na jednu sázku
 * místo má.
 */
const maxWagerCells = computed(() => {
  if (!pack.value?.ladder.length) return 0
  return Math.min(4, selected.value.size)
})

const wagerOptions = computed<Segment<number>[]>(() =>
  [0, 1, 2, 3, 4].map((n) => ({
    value: n,
    label: n === 0 ? 'Žádné' : String(n),
    disabled: n > maxWagerCells.value,
  })),
)

watch(
  maxWagerCells,
  (max) => {
    // Výchozí je jedno pole, ne maximum. Dřív se při pěti kategoriích
    // zapnula rovnou čtyři, aniž by je kdokoli zvolil, a moderátorku
    // čtyřikrát za hru přerušil dialog, který nečekala a neuměla ho
    // v místnosti ohlásit dopředu.
    if (!wagerPicked.value) rules.value.wagerCells = Math.min(1, max)
    else if (rules.value.wagerCells > max) rules.value.wagerCells = max
  },
  { immediate: true },
)

/** Zápis zároveň znamená „tohle si zvolila moderátorka", takže se počet
 *  polí přestane sám dorovnávat na velikost desky. */
const wagerCells = computed<number>({
  get: () => rules.value.wagerCells,
  set: (n) => {
    wagerPicked.value = true
    rules.value.wagerCells = n
  },
})

const showFloorZero = computed(() => rules.value.penalty || rules.value.wagerCells > 0)

const problems = computed<string[]>(() => {
  const out: string[] = []
  if (!pack.value) out.push('Vyber balíček otázek.')
  else if (usable.value.length === 0)
    out.push('V tomhle balíčku není ani jedna kategorie vyplněná celá.')
  if (selected.value.size < 1) out.push('Vyber aspoň jednu kategorii.')
  if (teams.value.length < 1) out.push('Přidej aspoň jeden tým.')
  return out
})

const ready = computed(() => problems.value.length === 0)

watch(
  [packId, selected, teams, rules, wagerPicked],
  () => {
    const payload: SavedSetup = {
      packId: packId.value,
      categoryIds: [...selected.value],
      teams: teams.value.map((t) => ({ name: t.name, color: t.color })),
      rules: { ...rules.value },
      wagerPicked: wagerPicked.value,
      groupName: groupName.value,
    }
    localStorage.setItem(SETUP_KEY, JSON.stringify(payload))
  },
  { deep: true },
)

function start() {
  if (!pack.value || !ready.value) return
  emit('start', pack.value, {
    packId: pack.value.id,
    // Pořadí kategorií na desce drží pořadí z balíčku.
    categoryIds: usable.value.filter((c) => selected.value.has(c.id)).map((c) => c.id),
    teams: teams.value.map((t) => ({ name: t.name.trim() || nameForColor(t.color, 0), color: t.color })),
    rules: { ...rules.value, sound: settings.sound },
    groupName: groupName.value.trim(),
  })
}
</script>

<template>
  <main id="obsah" class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Pojišťuj!</p>
      <h1 class="setup__title">Připrav hru.</h1>
      <p class="lead">Vyber otázky, týmy a pravidla.</p>
    </header>

    <div class="setup__grid">
      <div class="setup__form">
        <!-- 01 Balíček a kategorie -------------------------------------- -->
        <section class="section" aria-labelledby="setup-pack">
          <div class="section__head">
            <h2 id="setup-pack"><span class="section__num" aria-hidden="true">01</span> Z čeho se bude hrát</h2>
            <!-- Zkratka k tomu balíčku, který se chystáš hrát, ne cesta do
                 správy. Tou je položka Otázky v hlavičce a ta vede vždycky
                 na seznam balíčků. -->
            <RouterLink v-if="packId" :to="editLink" class="edit-link">Upravit balíček</RouterLink>
          </div>
          <p class="hint">Vyber jeden balíček. Deska se skládá z jednoho, ne z několika.</p>

          <!-- Až po prvním snímku. Prázdný seznam před doručením dat není
               prázdná knihovna, jen ještě nedoručená. -->
          <UiSkeleton v-if="!packs.loaded" :lines="3" />

          <UiEmpty
            v-else-if="packs.packs.length === 0"
            title="Připrav první otázky"
            text="Deska potřebuje aspoň jednu kategorii s vyplněnými otázkami."
          >
            <RouterLink to="/admin">Přejít k otázkám</RouterLink>
          </UiEmpty>

          <ul v-else class="packs">
            <li v-for="p in packs.packs" :key="p.id">
              <label class="pick">
                <input v-model="packId" type="radio" name="setup-pack-choice" :value="p.id" />
                <span class="pick__row">
                  <span class="pick__text">
                    <strong>{{ p.name }}</strong>
                    <span class="hint">
                      {{ count(playableCategories(p).length, 'hratelná kategorie', 'hratelné kategorie', 'hratelných kategorií') }}
                      · {{ count(packProgress(p).done, 'otázka', 'otázky', 'otázek') }}
                    </span>
                  </span>
                  <span class="pick__count" aria-hidden="true">{{ playableCategories(p).length }}</span>
                </span>
              </label>
            </li>
          </ul>

          <template v-if="pack && usable.length">
            <h3 class="sub">Kategorie do hry</h3>
            <p class="hint">
              Jednu až {{ MAX_CATEGORIES }}. Každá kategorie je jeden sloupec desky.
              <template v-if="selected.size >= MAX_CATEGORIES"> Vybráno maximum.</template>
            </p>
            <div class="chips">
              <button
                v-for="c in usable"
                :key="c.id"
                type="button"
                class="chip"
                :class="{ 'chip--on': selected.has(c.id) }"
                :aria-pressed="selected.has(c.id)"
                :disabled="!selected.has(c.id) && selected.size >= MAX_CATEGORIES"
                @click="toggleCategory(c.id)"
              >
                {{ c.name }}
              </button>
            </div>
            <p v-if="incomplete.length" class="warn">
              Nehratelné, protože nemají vyplněné všechny otázky:
              {{ incomplete.map((c) => c.name).join(', ') }}
            </p>
          </template>
        </section>

        <!-- 02 Týmy ------------------------------------------------------ -->
        <section class="section" aria-labelledby="setup-teams">
          <div class="section__head">
            <h2 id="setup-teams"><span class="section__num" aria-hidden="true">02</span> Kdo hraje</h2>
          </div>

          <UiField label="Skupina (nepovinné)" hint="Název najdeš v přehledu odehraných her.">
            <input v-model="groupName" type="text" maxlength="60" placeholder="Např. Obchod Morava" />
          </UiField>
          <p class="hint">Jeden až šest týmů. Barvu změníš kliknutím na písmeno.</p>

          <ul class="teams">
            <li v-for="(t, i) in teams" :key="i" class="team">
              <span class="team__color">
                <button
                  type="button"
                  class="team__dot"
                  :style="{ background: `var(${teamColor(t.color).cssVar})` }"
                  :aria-label="`Barva týmu ${t.name || i + 1}: ${teamColor(t.color).label}, vybrat jinou`"
                  :aria-expanded="picker === i"
                  aria-haspopup="true"
                  @click.stop="togglePicker(i)"
                >
                  {{ teamBadge(i) }}
                </button>

                <span v-if="picker === i" class="swatches" role="group" aria-label="Barva týmu">
                  <button
                    v-for="(c, ci) in TEAM_COLORS"
                    :key="ci"
                    type="button"
                    class="swatch"
                    :class="{ 'swatch--on': t.color === ci }"
                    :style="{ background: `var(${c.cssVar})` }"
                    :disabled="colorTakenBy(ci, i) >= 0"
                    :aria-pressed="t.color === ci"
                    :title="colorTakenBy(ci, i) >= 0 ? `${c.label}, už má jiný tým` : c.label"
                    :aria-label="colorTakenBy(ci, i) >= 0 ? `${c.label}, už má jiný tým` : c.label"
                    @click.stop="chooseColor(i, ci)"
                  />
                </span>
              </span>
              <input
                v-model="t.name"
                class="team__name"
                type="text"
                maxlength="24"
                :placeholder="nameForColor(t.color, i)"
                :aria-label="`Název týmu ${i + 1}`"
              />
              <UiIconButton
                icon="close"
                size="sm"
                variant="danger"
                :disabled="teams.length <= 1"
                :label="`Odebrat tým ${t.name}`"
                @click="removeTeam(i)"
              />
            </li>
          </ul>

          <UiButton class="add-team" variant="ghost" size="sm" :disabled="teams.length >= 6" @click="addTeam">
            Přidat tým
          </UiButton>
        </section>

        <!-- 03 Pravidla -------------------------------------------------- -->
        <section class="section" aria-labelledby="setup-rules">
          <div class="section__head">
            <h2 id="setup-rules"><span class="section__num" aria-hidden="true">03</span> Jak bude hra probíhat</h2>
          </div>

          <div class="rules">
            <div class="rule">
              <p class="rule__label">Časomíra</p>
              <UiSegmented v-model="rules.timerSeconds" aria-label="Časomíra" :options="TIMER_OPTIONS" />
              <p class="hint">Kolik času má tým na odpověď. Bez znamená bez měření.</p>
            </div>
            <div class="rule">
              <p class="rule__label">Pole Riziko!</p>
              <UiSegmented v-model="wagerCells" aria-label="Počet polí Riziko!" :options="wagerOptions" />
              <p class="hint">
                Tým na nich před otázkou vsadí část bodů. Na desce poznat nejsou,
                rozsvítí se až při otevření. Nejvýš jedno na kategorii.
              </p>
            </div>
          </div>

          <UiSwitch
            v-model="rules.steal"
            label="Přebrání jiným týmem"
            hint="Když tým na tahu neuhodne, můžeš body přiznat tomu, kdo odpověděl správně."
          />

          <UiSwitch
            v-model="rules.penalty"
            label="Minusové body"
            hint="Za špatnou odpověď se týmu na tahu hodnota políčka odečte."
          />

          <UiSwitch
            v-if="showFloorZero"
            v-model="rules.floorZero"
            label="Skóre nejméně nula"
            hint="Při odečtu bodů tým nesmí klesnout pod nulu."
          />
        </section>
      </div>

      <!-- Shrnutí ---------------------------------------------------------- -->
      <aside class="summary" aria-label="Shrnutí připravené hry">
        <p class="eyebrow">Tvoje hra</p>
        <h2>Pojišťuj!</h2>

        <p class="summary__total" aria-live="polite">
          <strong>{{ boardPreview.cells }}</strong>
          <span>{{ boardPreview.cells === 1 ? 'otázka' : boardPreview.cells >= 2 && boardPreview.cells <= 4 ? 'otázky' : 'otázek' }} na desce</span>
        </p>

        <div class="summary__preview" aria-hidden="true">
          <div v-if="boardPreview.cols && boardPreview.rows" class="mini" :style="{ '--cols': boardPreview.cols }">
            <div v-for="value in boardPreview.ladder" :key="value" class="mini__row">
              <span v-for="cat in boardPreview.categories" :key="`${cat.id}:${value}`" class="mini__cell" />
            </div>
          </div>
          <p v-else class="summary__empty">Deska se objeví po výběru kategorií</p>
        </div>

        <dl>
          <dt>Kategorie</dt><dd>{{ selectedCats.length }}</dd>
          <dt>Týmy</dt><dd>{{ teams.length }}</dd>
          <dt>Časomíra</dt><dd>{{ rules.timerSeconds ? `${rules.timerSeconds} s` : 'Bez' }}</dd>
          <dt>Riziko!</dt><dd>{{ rules.wagerCells || 'Žádné' }}</dd>
        </dl>

        <ul class="summary__teams" aria-label="Týmy">
          <li
            v-for="(t, i) in teams"
            :key="i"
            class="summary__team"
            :style="{ '--team': `var(${teamColor(t.color).cssVar})` }"
            :title="t.name"
          >
            <span class="summary__badge">{{ teamBadge(i) }}</span>
            <span v-fit-text class="summary__team-name">{{ t.name }}</span>
          </li>
        </ul>

        <UiButton variant="brand" block :disabled="!ready" @click="start">Spustit hru</UiButton>

        <ul v-if="problems.length" class="problems">
          <li v-for="p in problems" :key="p">{{ p }}</li>
        </ul>
        <p v-else class="summary__next">Deska se otevře rovnou na plátně.</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* Týž tvar jako příprava kvízu: číslované sekce v jednom sloupci
   a vpravo shrnutí, které drží jediné hlavní tlačítko. Obě hry se
   chystají stejně, takže se to nemá lišit. */
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
.sub { font-size: var(--fs-md); margin-top: var(--sp-2); }
.warn { font-size: var(--fs-sm); color: var(--c-text-faint); line-height: var(--lh-body); }

/* Balíček je jeden, ne několik, takže přepínač místo zaškrtávátka.
   Řádek je jinak týž jako v přípravě kvízu. */
.packs { list-style: none; padding: 0; border-top: var(--border-w) solid var(--c-border-soft); }
.packs li { border-bottom: var(--border-w) solid var(--c-border-soft); }
.pick { display: flex; align-items: center; gap: var(--sp-3); cursor: pointer; min-height: var(--control-touch); padding: var(--sp-4) var(--sp-2); }
.pick:hover { background: var(--c-bg-active); }
.pick input { flex: none; width: var(--control-check); height: var(--control-check); margin: 0; accent-color: var(--c-brand); }
.pick__row { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: var(--sp-4); align-items: center; }
.pick__text { display: grid; gap: var(--sp-1); overflow-wrap: anywhere; }
.pick__count { font-weight: 900; color: var(--c-brand); font-variant-numeric: tabular-nums; }

.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.chip {
  padding: var(--sp-2) var(--sp-4);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  transition: var(--tr-surface);
}
.chip:hover:not(:disabled) { color: var(--c-text); background: var(--c-bg-raised); }
.chip:disabled { opacity: 0.35; cursor: not-allowed; }
.chip--on { color: var(--c-on-accent); background: var(--c-brand); border-color: var(--c-brand); }

.teams { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
/* Sekce je mřížka, takže by se tlačítko roztáhlo přes celou šířku. */
.add-team { justify-self: start; }
.team { display: flex; align-items: center; gap: var(--sp-2); }
.team__color { position: relative; display: inline-flex; }
.team__dot {
  flex: none;
  width: var(--control-md);
  height: var(--control-md);
  border: 0;
  border-radius: var(--r-md);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--fs-sm);
  transition: transform var(--dur-fast) var(--ease-back);
}
.team__dot:hover { transform: scale(1.08); }
.team__name {
  flex: 1;
  min-width: 0;
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
  font-size: var(--fs-md);
}
.team__name:focus { border-color: var(--c-brand); }

.swatches {
  position: absolute;
  top: calc(100% + var(--sp-2));
  left: 0;
  z-index: var(--z-header);
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: var(--sp-2);
  padding: var(--sp-3);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
}
.swatch {
  width: var(--control-sm);
  height: var(--control-sm);
  border: var(--border-w-strong) solid transparent;
  border-radius: var(--r-full);
  transition: transform var(--dur-fast) var(--ease-back), border-color var(--dur-fast) var(--ease-out);
}
.swatch:hover:not(:disabled) { transform: scale(1.14); }
.swatch--on { border-color: var(--c-text); }
.swatch:disabled { opacity: 0.28; cursor: not-allowed; }

.rules { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sp-4); align-items: start; }
.rule { display: grid; gap: var(--sp-2); }
.rule__label { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-muted); }

.summary {
  position: sticky; top: var(--sp-5); padding: var(--sp-5);
  border: var(--border-w) solid var(--c-border-soft); border-radius: var(--r-lg);
  background: var(--c-surface);
}
.summary .eyebrow, .summary__next { color: var(--c-brand); }
.summary h2 { margin-top: var(--sp-2); font-size: var(--fs-xl); }
.summary__total { display: grid; margin-block: var(--sp-5) var(--sp-4); }
.summary__total strong { font-size: var(--fs-work-number); font-weight: 900; line-height: var(--lh-tight); font-variant-numeric: tabular-nums; }
.summary__total span { font-size: var(--fs-sm); margin-top: var(--sp-2); color: var(--c-text-muted); }
.summary__preview { padding: var(--sp-3); border-radius: var(--r-md); background: var(--c-bg-field); }
.summary__empty { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: var(--lh-snug); }
.summary dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-3); margin-block: var(--sp-5); font-size: var(--fs-sm); color: var(--c-text-muted); }
.summary dd { margin: 0; font-weight: 700; text-align: right; color: var(--c-text); }
.summary__teams { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-5); }
.summary__team { display: inline-flex; align-items: center; gap: var(--sp-2); max-width: 100%; min-width: 0; }
.summary__badge {
  display: grid;
  place-items: center;
  width: var(--control-xs);
  height: var(--control-xs);
  border-radius: var(--r-sm);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
}
.summary__team-name { font-size: calc(var(--fs-xs) * var(--fit-text, 1)); font-weight: 700; min-width: 0; }
.summary__next { font-size: var(--fs-sm); margin-top: var(--sp-3); }
.problems { list-style: none; padding: 0; display: grid; gap: var(--sp-1); margin-top: var(--sp-3); color: var(--c-text-faint); font-size: var(--fs-sm); }

/* Náhled desky. Dlaždice si drží hmotu, protože takhle deska na plátně
   opravdu vypadá. */
.mini { --cols: 1; display: grid; gap: var(--sp-1); }
.mini__row { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: var(--sp-1); }
.mini__cell {
  display: block;
  aspect-ratio: 1.35 / 1;
  min-height: var(--sp-3);
  border-radius: var(--r-sm);
  background: linear-gradient(178deg, var(--c-tile-top), var(--c-tile-bottom));
  box-shadow: var(--shadow-inset-top);
}

@media (max-width: 960px) {
  .setup__grid { gap: var(--sp-5); grid-template-columns: minmax(0, 1fr) minmax(0, .65fr); }
  .rules { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 720px) {
  .setup__grid { grid-template-columns: minmax(0, 1fr); }
  .summary { position: static; }
  .section__head h2 { font-size: var(--fs-lg); }
}

/* Dotyková pravidla jsou poslední, aby je pozdější breakpoint nepřebil. */
@media (pointer: coarse) {
  .team__dot { width: var(--control-touch); height: var(--control-touch); }
  .team__name { padding-block: var(--sp-3); font-size: var(--fs-md); }
  .swatches { gap: var(--sp-3); padding: var(--sp-4); }
  .swatch { width: var(--control-touch); height: var(--control-touch); }
  .chip { padding: var(--sp-3) var(--sp-4); min-height: var(--control-touch); }
}
</style>
