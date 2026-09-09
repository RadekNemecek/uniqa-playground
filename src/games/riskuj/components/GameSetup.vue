<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GameRules, GameSetup, Pack } from '@/types'
import { packs, packProgress, playableCategories } from '@/stores/packs'
import { TEAM_COLORS, teamBadge, teamColor } from '@/lib/teams'
import { count } from '@/lib/format'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'

const emit = defineEmits<{ start: [pack: Pack, setup: GameSetup] }>()

const DEFAULT_TEAM_NAMES = ['Modří', 'Zelení', 'Červení', 'Žlutí', 'Fialoví', 'Bílí']

const packId = ref<string>('')
const selected = ref<Set<string>>(new Set())
const teams = ref([
  { name: 'Tým A', color: 0 },
  { name: 'Tým B', color: 1 },
])
const rules = ref<GameRules>({
  timerSeconds: 30,
  penalty: true,
  steal: true,
  wagerCells: 0,
  sound: true,
})

/** Dokud si počet bonusových polí nezvolí moderátorka sama, drží se na
 *  maximu, které deska unese. */
const wagerPicked = ref(false)

const pack = computed<Pack | undefined>(() => packs.packs.find((p) => p.id === packId.value))
const usable = computed(() => (pack.value ? playableCategories(pack.value) : []))
const incomplete = computed(() =>
  pack.value ? pack.value.categories.filter((c) => !usable.value.some((u) => u.id === c.id)) : [],
)

// Předvyber první balíček, který je vůbec hratelný.
watch(
  () => packs.packs,
  (list) => {
    if (packId.value && list.some((p) => p.id === packId.value)) return
    const first = list.find((p) => playableCategories(p).length >= 2) ?? list[0]
    if (first) packId.value = first.id
  },
  { immediate: true, deep: true },
)

watch(
  usable,
  (list) => {
    selected.value = new Set(list.slice(0, 6).map((c) => c.id))
  },
  { immediate: true },
)

function toggleCategory(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function addTeam() {
  if (teams.value.length >= 6) return
  const used = new Set(teams.value.map((t) => t.color))
  const color = TEAM_COLORS.findIndex((_, i) => !used.has(i))
  teams.value.push({
    name: `Tým ${teamBadge(teams.value.length)}`,
    color: color < 0 ? teams.value.length % 6 : color,
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
  if (team) team.color = color
  picker.value = null
}

/** Barvu, kterou už má jiný tým, nabízet nemá smysl. */
function colorTakenBy(color: number, exceptIndex: number): number {
  return teams.value.findIndex((t, i) => i !== exceptIndex && t.color === color)
}

function onDocumentClick(e: MouseEvent) {
  if (picker.value === null) return
  const target = e.target as HTMLElement
  if (!target.closest('.team__color')) picker.value = null
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

function start() {
  if (!pack.value || !ready.value) return
  emit('start', pack.value, {
    packId: pack.value.id,
    // Pořadí kategorií na desce drží pořadí z balíčku.
    categoryIds: usable.value.filter((c) => selected.value.has(c.id)).map((c) => c.id),
    teams: teams.value.map((t) => ({ name: t.name, color: t.color })),
    rules: { ...rules.value },
  })
}
</script>

<template>
  <div class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Riskuj</p>
      <h1 class="setup__title">Připrav hru</h1>
    </header>

    <div class="setup__grid">
      <!-- Balíček a kategorie ------------------------------------------- -->
      <section class="panel">
        <h2 class="panel__title"><span class="panel__num">1</span> Balíček otázek</h2>

        <p v-if="packs.packs.length === 0" class="empty">
          Zatím tu není žádný balíček. Založ ho v sekci
          <RouterLink to="/admin">Otázky</RouterLink>.
        </p>

        <div v-else class="picker">
          <button
            v-for="p in packs.packs"
            :key="p.id"
            type="button"
            class="pick"
            :class="{ 'pick--on': p.id === packId }"
            :aria-pressed="p.id === packId"
            @click="packId = p.id"
          >
            <span class="pick__name">{{ p.name }}</span>
            <span class="pick__meta">
              {{ playableCategories(p).length }} z {{ p.categories.length }} kategorií hotových,
              {{ packProgress(p).done }} z {{ packProgress(p).total }} otázek
            </span>
          </button>
        </div>

        <template v-if="pack && usable.length">
          <h3 class="sub">Kategorie do hry</h3>
          <p class="hint">Vyber dvě až šest. Každá kategorie je jeden sloupec desky.</p>
          <div class="chips">
            <button
              v-for="c in usable"
              :key="c.id"
              type="button"
              class="chip"
              :class="{ 'chip--on': selected.has(c.id) }"
              :aria-pressed="selected.has(c.id)"
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
      <section class="panel">
        <h2 class="panel__title"><span class="panel__num">2</span> Týmy</h2>
        <p class="hint">Jeden až šest týmů. Barvu změníš kliknutím na kolečko.</p>

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
              :placeholder="DEFAULT_TEAM_NAMES[i]"
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
      <section class="panel">
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
          label="Bonusová pole Riskuj!"
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
      </section>
    </div>

    <div class="launch">
      <ul v-if="problems.length" class="problems">
        <li v-for="p in problems" :key="p">{{ p }}</li>
      </ul>
      <p v-else class="summary">
        {{ count(selected.size, 'kategorie', 'kategorie', 'kategorií') }},
        {{ count(pack?.ladder.length ?? 0, 'hodnota', 'hodnoty', 'hodnot') }},
        {{ count(selected.size * (pack?.ladder.length ?? 0), 'otázka', 'otázky', 'otázek') }},
        {{ count(teams.length, 'tým', 'týmy', 'týmů') }}.
      </p>
      <UiButton variant="gold" size="xl" :disabled="!ready" @click="start">Spustit hru</UiButton>
    </div>
  </div>
</template>

<style scoped>
.setup { padding-block: var(--sp-5) var(--sp-8); }
.setup__head { margin-bottom: var(--sp-6); }
.setup__title { font-size: var(--fs-3xl); letter-spacing: -0.03em; margin-top: var(--sp-2); }

.setup__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 21rem), 1fr));
  gap: var(--sp-4);
  align-items: start;
}

.panel {
  display: grid;
  gap: var(--sp-4);
  align-content: start;
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
}
.panel__title { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-lg); }
.panel__num {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--r-full);
  background: var(--c-surface-3);
  color: var(--c-gold);
  font-size: var(--fs-sm);
  font-family: var(--font-ui);
}

.sub { font-size: var(--fs-md); margin-top: var(--sp-2); }
.hint { font-size: var(--fs-sm); color: var(--c-text-faint); margin-top: calc(var(--sp-3) * -1); }
.empty { color: var(--c-text-muted); font-size: var(--fs-sm); }
.warn { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.5; }

.picker { display: grid; gap: var(--sp-2); }
.pick {
  display: grid;
  gap: 2px;
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
  color: var(--c-text);
  transition: all var(--dur-fast) var(--ease-out);
}
.pick:hover { border-color: var(--c-surface-3); }
.pick--on { border-color: var(--c-gold); background: color-mix(in oklab, var(--c-gold) 10%, var(--c-abyss)); }
.pick__name { font-weight: 600; }
.pick__meta { font-size: var(--fs-xs); color: var(--c-text-faint); }

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
.chip:hover { color: var(--c-text); border-color: var(--c-surface-3); }
.chip--on {
  color: var(--c-text-ink);
  background: var(--c-gold);
  border-color: var(--c-gold);
}

.teams { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.team { display: flex; align-items: center; gap: var(--sp-2); }
.team__dot {
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: var(--r-full);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-sm);
  transition: transform var(--dur-fast) var(--ease-back);
}
.team__dot:hover { transform: scale(1.08); }

/* Výběr barvy ------------------------------------------------------------- */
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
/* Špička směrem k tlačítku, ať je vidět, ke kterému týmu nabídka patří. */
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
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transition: transform var(--dur-fast) var(--ease-back), border-color var(--dur-fast) var(--ease-out);
}
.swatch:hover:not(:disabled) { transform: scale(1.14); }
.swatch--on { border-color: var(--c-text); }
.swatch:disabled { opacity: 0.28; cursor: not-allowed; }

@keyframes pop {
  from { opacity: 0; transform: translateY(-6px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .swatches { animation: none; }
  .swatch { transition: none; }
}
.team__name {
  flex: 1;
  min-width: 0;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
  color: var(--c-text);
  font-size: var(--fs-md);
}
.team__name:focus { border-color: var(--c-gold); outline: none; }
.team__x {
  flex: none;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-faint);
  font-size: 1.35rem;
  line-height: 1;
}
.team__x:hover:not(:disabled) { color: var(--c-bad); background: var(--c-surface-2); }
.team__x:disabled { opacity: 0.25; }

.segmented { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: var(--c-abyss); }
.segmented button {
  flex: 1;
  padding: var(--sp-2) var(--sp-1);
  border: 0;
  border-radius: calc(var(--r-md) - 3px);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}
.segmented button:hover:not(:disabled) { color: var(--c-text); background: var(--c-surface); }
.segmented button:disabled { opacity: 0.3; cursor: not-allowed; }
.segmented .seg--on { background: var(--c-gold); color: var(--c-text-ink); }

.switch { display: flex; gap: var(--sp-3); align-items: flex-start; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.switch__box {
  flex: none;
  margin-top: 2px;
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
.switch input:checked + .switch__box { background: var(--c-gold); border-color: var(--c-gold); }
.switch input:checked + .switch__box::after { transform: translateX(1.1rem); background: var(--c-text-ink); }
.switch input:focus-visible + .switch__box { outline: 3px solid var(--c-gold); outline-offset: 3px; }
.switch strong { display: block; font-size: var(--fs-sm); font-weight: 600; }
.switch em { display: block; font-style: normal; font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.5; }

.launch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-5);
  flex-wrap: wrap;
  margin-top: var(--sp-6);
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
}
.summary { color: var(--c-text-muted); font-size: var(--fs-sm); }
.problems { list-style: none; padding: 0; display: grid; gap: var(--sp-1); color: var(--c-text-faint); font-size: var(--fs-sm); }
</style>
