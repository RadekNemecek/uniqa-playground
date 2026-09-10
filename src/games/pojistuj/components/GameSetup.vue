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

const emit = defineEmits<{ start: [pack: Pack, setup: GameSetup] }>()

const route = useRoute()

const SETUP_KEY = 'playground.setup.v1'
const MAX_CATEGORIES = 6

/** Jména podle palety týmů, ve stejném pořadí jako TEAM_COLORS. */
const TEAM_NAMES = ['Azuroví', 'Tyrkysoví', 'Limetky', 'Levanduloví', 'Růžoví', 'Pískoví'] as const

function nameForColor(color: number, index: number): string {
  return TEAM_NAMES[color % TEAM_NAMES.length] ?? `Tým ${teamBadge(index)}`
}

interface SavedSetup {
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
/** Rozbalený výběr balíčku. */
const packOpen = ref(false)

function togglePicker(i: number) {
  packOpen.value = false
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

function choosePack(id: string) {
  packId.value = id
  packOpen.value = false
}

function togglePackOpen() {
  if (packs.packs.length <= 1) return
  picker.value = null
  packOpen.value = !packOpen.value
}

/** Barvu, kterou už má jiný tým, nabízet nemá smysl. */
function colorTakenBy(color: number, exceptIndex: number): number {
  return teams.value.findIndex((t, i) => i !== exceptIndex && t.color === color)
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (picker.value !== null && !target.closest('.team__color')) picker.value = null
  if (packOpen.value && !target.closest('.pack')) packOpen.value = false
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    picker.value = null
    packOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onEscape)
})

const maxWagerCells = computed(() => {
  const cells = selected.value.size * (pack.value?.ladder.length ?? 0)
  return Math.min(4, Math.max(0, Math.floor(cells / 6)))
})

watch(
  maxWagerCells,
  (max) => {
    if (!wagerPicked.value) rules.value.wagerCells = max
    else if (rules.value.wagerCells > max) rules.value.wagerCells = max
  },
  { immediate: true },
)

function pickWagerCells(n: number) {
  wagerPicked.value = true
  rules.value.wagerCells = n
}

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
  })
}
</script>

<template>
  <div class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Pojišťuj!</p>
      <h1 class="setup__title">Připrav hru</h1>
    </header>

    <div class="setup__grid">
      <!-- Balíček a kategorie ------------------------------------------- -->
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><span class="panel__num">1</span> Balíček otázek</h2>
          <!-- Zkratka k tomu balíčku, který se chystáš hrát, ne cesta do
               správy. Tou je položka Otázky v hlavičce a ta vede vždycky
               na seznam balíčků. -->
          <RouterLink v-if="packId" :to="editLink" class="panel__new">
            Upravit balíček
          </RouterLink>
        </div>

        <p v-if="packs.packs.length === 0" class="empty">
          Zatím tu není žádný balíček. Založíš ho ve
          <RouterLink to="/admin">správě otázek</RouterLink>.
        </p>

        <div v-else class="pack" :class="{ 'pack--open': packOpen }">
          <button
            type="button"
            class="pack__trigger"
            :class="{ 'pack__trigger--static': packs.packs.length === 1 }"
            :aria-expanded="packs.packs.length > 1 ? packOpen : undefined"
            :aria-haspopup="packs.packs.length > 1 ? 'listbox' : undefined"
            :disabled="packs.packs.length === 1"
            @click="togglePackOpen"
          >
            <span class="pack__text">
              <span class="pack__name">{{ pack?.name ?? 'Vyber balíček' }}</span>
              <span v-if="pack" class="pack__meta">
                {{ count(usable.length, 'kategorie', 'kategorie', 'kategorií') }}
                · {{ count(packProgress(pack).done, 'otázka', 'otázky', 'otázek') }}
              </span>
            </span>
            <span v-if="packs.packs.length > 1" class="pack__chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          <ul
            v-if="packOpen"
            class="pack__list"
            role="listbox"
            aria-label="Dostupné balíčky"
          >
            <li v-for="p in packs.packs" :key="p.id" role="presentation">
              <button
                type="button"
                class="pack__option"
                role="option"
                :aria-selected="p.id === packId"
                :class="{ 'pack__option--on': p.id === packId }"
                @click="choosePack(p.id)"
              >
                <span class="pack__name">{{ p.name }}</span>
                <span class="pack__meta">
                  {{ count(playableCategories(p).length, 'kategorie', 'kategorie', 'kategorií') }}
                  · {{ count(packProgress(p).done, 'otázka', 'otázky', 'otázek') }}
                </span>
              </button>
            </li>
          </ul>
        </div>

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

      <!-- Týmy ----------------------------------------------------------- -->
      <section class="panel panel--teams">
        <h2 class="panel__title"><span class="panel__num">2</span> Týmy</h2>
        <p class="hint">Jeden až šest. Barvu změníš kliknutím na písmeno.</p>

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
            <button
              type="button"
              class="team__x"
              :disabled="teams.length <= 1"
              :aria-label="`Odebrat tým ${t.name}`"
              @click="removeTeam(i)"
            >
              &#215;
            </button>
          </li>
        </ul>

        <UiButton variant="ghost" size="sm" :disabled="teams.length >= 6" @click="addTeam">
          Přidat tým
        </UiButton>
      </section>

      <!-- Pravidla ------------------------------------------------------- -->
      <section class="panel panel--rules">
        <h2 class="panel__title"><span class="panel__num">3</span> Pravidla</h2>

        <UiField label="Časomíra" hint="Kolik času má tým na odpověď. Nula znamená bez měření.">
          <div class="segmented">
            <button
              v-for="s in [0, 15, 30, 45, 60]"
              :key="s"
              type="button"
              :class="{ 'seg--on': rules.timerSeconds === s }"
              :aria-pressed="rules.timerSeconds === s"
              @click="rules.timerSeconds = s"
            >
              {{ s === 0 ? 'Bez' : `${s} s` }}
            </button>
          </div>
        </UiField>

        <UiField
          label="Pole Riziko!"
          hint="Na těchto polích tým před otázkou vsadí část svých bodů."
        >
          <div class="segmented">
            <button
              v-for="n in [0, 1, 2, 3, 4]"
              :key="n"
              type="button"
              :disabled="n > maxWagerCells"
              :class="{ 'seg--on': rules.wagerCells === n }"
              :aria-pressed="rules.wagerCells === n"
              @click="pickWagerCells(n)"
            >
              {{ n === 0 ? 'Žádné' : n }}
            </button>
          </div>
        </UiField>

        <label class="switch">
          <input v-model="rules.steal" type="checkbox" />
          <span class="switch__box" aria-hidden="true"></span>
          <span>
            <strong>Přebrání jiným týmem</strong>
            <em>Když tým na tahu neuhodne, můžeš body přiznat tomu, kdo odpověděl správně.</em>
          </span>
        </label>

        <label class="switch">
          <input v-model="rules.penalty" type="checkbox" />
          <span class="switch__box" aria-hidden="true"></span>
          <span>
            <strong>Minusové body</strong>
            <em>Za špatnou odpověď se týmu na tahu hodnota políčka odečte.</em>
          </span>
        </label>

        <label v-if="showFloorZero" class="switch">
          <input v-model="rules.floorZero" type="checkbox" />
          <span class="switch__box" aria-hidden="true"></span>
          <span>
            <strong>Skóre nejméně nula</strong>
            <em>Při odečtu bodů tým nesmí klesnout pod nulu.</em>
          </span>
        </label>
      </section>
    </div>

    <div class="launch">
      <div class="launch__preview" aria-hidden="true">
        <template v-if="boardPreview.cols && boardPreview.rows">
          <div class="mini" :style="{ '--cols': boardPreview.cols }">
            <div
              v-for="value in boardPreview.ladder"
              :key="value"
              class="mini__row"
            >
              <span
                v-for="cat in boardPreview.categories"
                :key="`${cat.id}:${value}`"
                class="mini__cell"
              />
            </div>
          </div>
        </template>
        <p v-else class="launch__empty">Deska se objeví po výběru kategorií</p>
      </div>

      <div class="launch__info">
        <ul class="launch__teams" aria-label="Týmy">
          <li
            v-for="(t, i) in teams"
            :key="i"
            class="launch__team"
            :style="{ '--team': `var(${teamColor(t.color).cssVar})` }"
            :title="t.name"
          >
            <span class="launch__badge">{{ teamBadge(i) }}</span>
            <span class="launch__team-name">{{ t.name }}</span>
          </li>
        </ul>

        <ul v-if="problems.length" class="problems">
          <li v-for="p in problems" :key="p">{{ p }}</li>
        </ul>
        <p v-else class="summary">
          {{ count(boardPreview.cells, 'otázka', 'otázky', 'otázek') }}
          · {{ count(teams.length, 'tým', 'týmy', 'týmů') }}
          <template v-if="rules.timerSeconds"> · {{ rules.timerSeconds }}&nbsp;s</template>
          <template v-if="rules.wagerCells">
            · {{ count(rules.wagerCells, 'Riziko!', 'Riziko!', 'Riziko!') }}
          </template>
        </p>
      </div>

      <UiButton
        class="launch__cta"
        variant="brand"
        size="xl"
        :disabled="!ready"
        @click="start"
      >
        Spustit hru
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.setup { padding-block: var(--sp-5) var(--sp-8); }
.setup__head { margin-bottom: var(--sp-6); }
.setup__title { font-size: var(--fs-3xl); letter-spacing: -0.03em; margin-top: var(--sp-2); }

.setup__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
  align-items: start;
}
.panel--rules { grid-column: 1 / -1; }

.panel {
  display: grid;
  gap: var(--sp-4);
  align-content: start;
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
}
.panel--teams {
  border-color: color-mix(in oklab, var(--c-brand) 35%, var(--c-line));
  background:
    linear-gradient(
      165deg,
      color-mix(in oklab, var(--c-brand) 8%, var(--c-surface)),
      var(--c-surface) 45%
    );
}
.panel--rules {
  padding-block: var(--sp-4);
  background: color-mix(in oklab, var(--c-surface) 70%, var(--c-base));
  border-color: var(--c-line-soft);
}
.panel--rules .panel__title { font-size: var(--fs-md); color: var(--c-text-muted); }
.panel--rules .panel__num {
  background: var(--c-surface);
  color: var(--c-text-faint);
}

.panel__title { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-lg); }
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.panel__new {
  flex: none;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-brand);
  border-radius: var(--r-md);
  background: var(--c-brand);
  color: var(--c-on-accent);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.panel__new:hover {
  background: var(--c-brand-soft);
  border-color: var(--c-brand-soft);
}
.panel__num {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--r-full);
  background: var(--c-surface-3);
  color: var(--c-brand);
  font-size: var(--fs-sm);
  font-family: var(--font-ui);
}

.sub { font-size: var(--fs-md); margin-top: var(--sp-2); }
.hint { font-size: var(--fs-sm); color: var(--c-text-faint); margin-top: calc(var(--sp-3) * -1); }
.empty { color: var(--c-text-muted); font-size: var(--fs-sm); }
.warn { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.5; }

.pack { position: relative; }
.pack__trigger {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}
.pack__trigger:hover:not(:disabled) { border-color: var(--c-surface-3); }
.pack__trigger:focus-visible {
  outline: 3px solid var(--c-brand);
  outline-offset: 2px;
}
.pack--open .pack__trigger {
  border-color: var(--c-brand);
  background: color-mix(in oklab, var(--c-brand) 10%, var(--c-sunken));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.pack__trigger--static {
  cursor: default;
  border-color: color-mix(in oklab, var(--c-brand) 40%, var(--c-line));
  background: color-mix(in oklab, var(--c-brand) 8%, var(--c-sunken));
}
.pack__trigger--static:disabled { opacity: 1; color: var(--c-text); }
.pack__text { display: grid; gap: var(--sp-1); min-width: 0; flex: 1; }
.pack__name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pack__meta { font-size: var(--fs-xs); color: var(--c-text-faint); }
.pack__chev {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--c-text-muted);
  transition: transform var(--dur-fast) var(--ease-out);
}
.pack--open .pack__chev { transform: rotate(180deg); }

.pack__list {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 3;
  list-style: none;
  padding: var(--sp-1);
  margin: 0;
  border: 1px solid var(--c-brand);
  border-top: 0;
  border-radius: 0 0 var(--r-md) var(--r-md);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  display: grid;
  gap: var(--sp-1);
  max-height: 16rem;
  overflow: auto;
  animation: pop var(--dur-fast) var(--ease-out) both;
}
.pack__option {
  display: grid;
  gap: var(--sp-1);
  width: 100%;
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text);
}
.pack__option:hover { background: var(--c-surface-2); }
.pack__option--on {
  background: color-mix(in oklab, var(--c-brand) 14%, transparent);
}
.pack__option--on .pack__name { color: var(--c-brand-soft); }

.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.chip {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}
.chip:hover:not(:disabled) { color: var(--c-text); border-color: var(--c-surface-3); }
.chip:disabled { opacity: 0.35; cursor: not-allowed; }
.chip--on {
  color: var(--c-on-accent);
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.teams { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.team { display: flex; align-items: center; gap: var(--sp-2); }
.team__dot {
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: var(--r-md);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-sm);
  box-shadow:
    inset 0 1px 0 var(--c-tile-sheen),
    0 2px 0 color-mix(in oklab, var(--c-abyss) 55%, transparent);
  transition: transform var(--dur-fast) var(--ease-back);
}
.team__dot:hover { transform: scale(1.08); }

.team__color { position: relative; display: inline-flex; }

.swatches {
  position: absolute;
  top: calc(100% + var(--sp-2));
  left: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: var(--sp-2);
  padding: var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
  box-shadow: var(--shadow-md);
  animation: pop var(--dur-fast) var(--ease-back) both;
}
.swatches::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 0.9rem;
  width: 9px;
  height: 9px;
  rotate: 45deg;
  background: var(--c-surface-2);
  border-left: 1px solid var(--c-line);
  border-top: 1px solid var(--c-line);
}

.swatch {
  width: 1.75rem;
  height: 1.75rem;
  border: 2px solid transparent;
  border-radius: var(--r-full);
  box-shadow: inset 0 1px 0 var(--c-tile-sheen);
  transition: transform var(--dur-fast) var(--ease-back), border-color var(--dur-fast) var(--ease-out);
}
.swatch:hover:not(:disabled) { transform: scale(1.14); }
.swatch--on { border-color: var(--c-text); }
.swatch:disabled { opacity: 0.28; cursor: not-allowed; }

@keyframes pop {
  from { opacity: 0; transform: translateY(calc(var(--sp-2) * -1)) scale(0.94); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .swatches,
  .pack__list { animation: none; }
  .swatch,
  .pack__chev { transition: none; }
}

.team__name {
  flex: 1;
  min-width: 0;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text);
  font-size: var(--fs-md);
}
.team__name:focus { border-color: var(--c-brand); }
.team__x {
  flex: none;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-xl);
  line-height: 1;
}
.team__x:hover:not(:disabled) { color: var(--c-bad); background: var(--c-surface-2); }
.team__x:disabled { opacity: 0.25; }

.panel--rules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--sp-4) var(--sp-5);
  align-items: start;
}
.panel--rules .panel__title { grid-column: 1 / -1; }

.segmented {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
}
.segmented button {
  flex: 1;
  padding: var(--sp-2) var(--sp-1);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}
.segmented button:hover:not(:disabled) { color: var(--c-text); background: var(--c-surface); }
.segmented button:disabled { opacity: 0.3; cursor: not-allowed; }
.segmented .seg--on { background: var(--c-brand); color: var(--c-on-accent); }

.switch { display: flex; gap: var(--sp-3); align-items: flex-start; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch__box {
  flex: none;
  margin-top: var(--sp-1);
  width: 2.6rem;
  height: 1.5rem;
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  border: 1px solid var(--c-line);
  position: relative;
  transition: background-color var(--dur-fast) var(--ease-out);
}
.switch__box::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: var(--r-full);
  background: var(--c-text-muted);
  transition: transform var(--dur-fast) var(--ease-back), background-color var(--dur-fast) var(--ease-out);
}
.switch input:checked + .switch__box { background: var(--c-brand); border-color: var(--c-brand); }
.switch input:checked + .switch__box::after { transform: translateX(1.1rem); background: var(--c-on-accent); }
.switch input:focus-visible + .switch__box { outline: 3px solid var(--c-brand); outline-offset: 3px; }
.switch strong { display: block; font-size: var(--fs-sm); font-weight: 600; }
.switch em { display: block; font-style: normal; font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.5; }

.launch {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--sp-4) var(--sp-5);
  align-items: center;
  margin-top: var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background:
    linear-gradient(
      90deg,
      color-mix(in oklab, var(--c-brand) 6%, var(--c-surface)),
      var(--c-surface) 40%
    );
}
.launch__info {
  display: grid;
  gap: var(--sp-2);
  min-width: 0;
}
.launch__teams {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
.launch__team {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  max-width: 10rem;
  padding: var(--sp-1) var(--sp-2) var(--sp-1) var(--sp-1);
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--team) 16%, transparent);
  border: 1px solid color-mix(in oklab, var(--team) 35%, transparent);
}
.launch__badge {
  display: grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: var(--r-full);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 900;
}
.launch__team-name {
  font-size: var(--fs-xs);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.launch__cta { flex: none; }
.launch__preview {
  min-width: 0;
  max-width: 11rem;
  padding: var(--sp-2);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  border: 1px solid var(--c-line-soft);
}
.launch__empty {
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  padding: var(--sp-1);
  max-width: 8rem;
  line-height: var(--lh-snug);
}

.mini {
  --cols: 1;
  display: grid;
  gap: var(--sp-1);
}
.mini__row {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--sp-1);
}
.mini__cell {
  display: block;
  aspect-ratio: 1.35 / 1;
  min-height: 0.7rem;
  border-radius: var(--r-sm);
  background: linear-gradient(178deg, var(--c-tile-top), var(--c-tile-bottom));
  box-shadow: inset 0 1px 0 var(--c-tile-sheen);
}

.summary { color: var(--c-text-muted); font-size: var(--fs-sm); }
.problems { list-style: none; padding: 0; display: grid; gap: var(--sp-1); color: var(--c-text-faint); font-size: var(--fs-sm); }

@media (max-width: 860px) {
  .setup__grid { grid-template-columns: 1fr; }
  .panel--rules { grid-column: auto; }
  .launch {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }
  .launch__preview { max-width: none; }
  .launch__cta { width: 100%; }
}

@media (pointer: coarse) {
  .team__dot { width: 2.75rem; height: 2.75rem; }
  .team__name { padding-block: var(--sp-3); font-size: var(--fs-md); }
  .team__x { width: 2.75rem; height: 2.75rem; font-size: var(--fs-2xl); }
  .swatches { grid-template-columns: repeat(3, auto); gap: var(--sp-3); padding: var(--sp-4); }
  .swatch { width: 2.75rem; height: 2.75rem; }
  .segmented button { padding-block: var(--sp-3); }
  .chip { padding: var(--sp-3) var(--sp-4); }
  .panel__new { min-height: 2.75rem; display: inline-grid; place-items: center; }
}
</style>
