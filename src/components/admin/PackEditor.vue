<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import type { Pack, Question } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import CategoryBar from './CategoryBar.vue'
import LadderBar from './LadderBar.vue'
import BoardGrid from './BoardGrid.vue'
import QuestionEditor from './QuestionEditor.vue'
import { db } from '@/lib/db'
import { clone } from '@/lib/clone'
import { emptyCategory, emptyQuestion, isQuestionReady } from '@/stores/packs'
import { confirmAction, toast } from '@/stores/ui'
import { formatScore } from '@/lib/teams'
import { count, plural } from '@/lib/format'

const MAX_CATEGORIES = 8
const MAX_ROWS = 8

const props = defineProps<{ pack: Pack }>()
const emit = defineEmits<{ duplicate: []; remove: [] }>()

const draft = ref<Pack>(clone(toRaw(props.pack)))
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const conflict = ref(false)
const selected = ref<{ categoryId: string; value: number } | null>(null)
/** Editor otázky se otevírá přes desku, aby měla mřížka celou šířku. */
const editorOpen = ref(false)

let lastWrittenAt = props.pack.updatedAt
let timer = 0

/* --- Přepnutí na jiný balíček -------------------------------------------- */
watch(
  () => props.pack.id,
  () => {
    draft.value = clone(toRaw(props.pack))
    lastWrittenAt = props.pack.updatedAt
    conflict.value = false
    saveState.value = 'idle'
    selected.value = null
    editorOpen.value = false
    selectFirstUseful()
  },
)

/* --- Cizí úprava ---------------------------------------------------------- */
watch(
  () => props.pack.updatedAt,
  (at) => {
    if (at !== lastWrittenAt) conflict.value = true
  },
)

function reloadFromSource() {
  draft.value = clone(toRaw(props.pack))
  lastWrittenAt = props.pack.updatedAt
  conflict.value = false
  toast('Balíček načten znovu.', 'ok')
}

/* --- Automatické ukládání ------------------------------------------------- */
watch(
  draft,
  () => {
    saveState.value = 'saving'
    window.clearTimeout(timer)
    timer = window.setTimeout(flush, 600)
  },
  { deep: true },
)

async function flush() {
  const at = Date.now()
  lastWrittenAt = at
  try {
    await db().savePack({ ...clone(toRaw(draft.value)), updatedAt: at })
    saveState.value = 'saved'
  } catch (e) {
    saveState.value = 'idle'
    toast('Uložení se nepovedlo.', 'bad')
    console.error(e)
  }
}

/* --- Pohled na obsah ------------------------------------------------------ */

function questionOf(categoryId: string, value: number): Question | undefined {
  return draft.value.categories
    .find((c) => c.id === categoryId)
    ?.questions.find((q) => q.value === value)
}

function isReady(categoryId: string, value: number): boolean {
  return isQuestionReady(questionOf(categoryId, value))
}

function readyInCategory(categoryId: string): number {
  return draft.value.ladder.filter((v) => isReady(categoryId, v)).length
}

/** Políčka v pořadí, v jakém jsou na desce vidět: po řádcích zleva doprava. */
const cells = computed(() =>
  draft.value.ladder.flatMap((value) =>
    draft.value.categories.map((c) => ({ categoryId: c.id, value })),
  ),
)

const done = computed(() => cells.value.filter((c) => isReady(c.categoryId, c.value)).length)
const total = computed(() => cells.value.length)
const remaining = computed(() => total.value - done.value)
const pct = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))

const currentIndex = computed(() =>
  selected.value
    ? cells.value.findIndex(
        (c) => c.categoryId === selected.value!.categoryId && c.value === selected.value!.value,
      )
    : -1,
)

const selectedQuestion = computed<Question | undefined>(() =>
  selected.value ? questionOf(selected.value.categoryId, selected.value.value) : undefined,
)

const selectedCategoryName = computed(
  () => draft.value.categories.find((c) => c.id === selected.value?.categoryId)?.name ?? '',
)

/* --- Pohyb mezi otázkami --------------------------------------------------- */

function select(categoryId: string, value: number) {
  selected.value = { categoryId, value }
  editorOpen.value = true
}

function step(by: number) {
  const next = cells.value[currentIndex.value + by]
  if (next) selected.value = { ...next }
}

/** Skočí na první nevyplněnou otázku za tou současnou, případně od začátku. */
function gotoNextEmpty() {
  const from = currentIndex.value + 1
  const order = [...cells.value.slice(from), ...cells.value.slice(0, Math.max(0, from))]
  const target = order.find((c) => !isReady(c.categoryId, c.value))
  if (!target) return
  selected.value = { ...target }
  editorOpen.value = true
}

/** Vybere políčko, na kterém dává smysl začít. Dialog neotevírá. */
/** Otevře první nevyplněnou otázku na desce, ať je vybraná kterákoli. */
function openFirstEmpty() {
  const target = cells.value.find((c) => !isReady(c.categoryId, c.value))
  if (!target) return
  selected.value = { ...target }
  editorOpen.value = true
}

function selectFirstUseful() {
  const target = cells.value.find((c) => !isReady(c.categoryId, c.value)) ?? cells.value[0]
  selected.value = target ? { ...target } : null
}

selectFirstUseful()

/* --- Struktura balíčku ----------------------------------------------------- */

/** Otázky musí vždy odpovídat žebříčku hodnot. */
function syncLadder() {
  for (const cat of draft.value.categories) {
    cat.questions = draft.value.ladder.map(
      (v) => cat.questions.find((q) => q.value === v) ?? emptyQuestion(v),
    )
  }
  if (selected.value && !draft.value.ladder.includes(selected.value.value)) selectFirstUseful()
}

function addCategory() {
  if (draft.value.categories.length >= MAX_CATEGORIES) return
  const cat = emptyCategory(draft.value.ladder, `Kategorie ${draft.value.categories.length + 1}`)
  draft.value.categories.push(cat)
  selected.value = { categoryId: cat.id, value: draft.value.ladder[0]! }
}

async function removeCategory(categoryId: string) {
  const cat = draft.value.categories.find((c) => c.id === categoryId)
  if (!cat) return
  if (draft.value.categories.length <= 1) {
    toast('Balíček musí mít aspoň jednu kategorii.', 'bad')
    return
  }
  const ok = await confirmAction({
    title: 'Smazat kategorii',
    text: `Smaže se kategorie „${cat.name || 'bez názvu'}" i ${count(draft.value.ladder.length, 'otázka', 'otázky', 'otázek')}, které obsahuje.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  draft.value.categories = draft.value.categories.filter((c) => c.id !== categoryId)
  if (selected.value?.categoryId === categoryId) selectFirstUseful()
}

function moveCategory(index: number, by: number) {
  const to = index + by
  const list = draft.value.categories
  if (to < 0 || to >= list.length) return
  const [item] = list.splice(index, 1)
  if (item) list.splice(to, 0, item)
}

function addRow() {
  if (draft.value.ladder.length >= MAX_ROWS) return
  const last = draft.value.ladder.at(-1) ?? 0
  const step = draft.value.ladder.length > 1 ? last - (draft.value.ladder.at(-2) ?? 0) : 200
  draft.value.ladder.push(last + Math.max(50, step))
  syncLadder()
}

async function removeRow(value: number) {
  if (draft.value.ladder.length <= 2) return
  const ok = await confirmAction({
    title: 'Smazat řádek',
    text: `Otázky za ${formatScore(value)} bodů se smažou ve všech kategoriích.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  draft.value.ladder = draft.value.ladder.filter((v) => v !== value)
  syncLadder()
}

function editRow(index: number, raw: string) {
  const n = Math.max(10, Math.min(100000, Math.round(Number(raw) || 0)))
  const ladder = draft.value.ladder
  const old = ladder[index]
  if (old === undefined || old === n) return
  if (ladder.includes(n)) {
    toast('Tuhle hodnotu už balíček má.', 'bad')
    return
  }
  ladder[index] = n
  for (const cat of draft.value.categories) {
    const q = cat.questions.find((x) => x.value === old)
    if (q) q.value = n
  }
  if (selected.value?.value === old) selected.value = { ...selected.value, value: n }
  draft.value.ladder = [...ladder].sort((a, b) => a - b)
  syncLadder()
}

async function removePack() {
  const ok = await confirmAction({
    title: 'Smazat balíček',
    text: `Balíček „${draft.value.name}" se smaže i se všemi otázkami. Vrátit to nejde.`,
    confirmLabel: 'Smazat balíček',
    danger: true,
  })
  if (ok) emit('remove')
}
</script>

<template>
  <div class="ed">
    <!-- Hlavička balíčku -------------------------------------------------- -->
    <header class="ed__head">
      <div class="ed__ident">
        <input
          v-model="draft.name"
          class="ed__name"
          type="text"
          maxlength="60"
          aria-label="Název balíčku"
          placeholder="Název balíčku"
        />
        <input
          v-model="draft.description"
          class="ed__desc"
          type="text"
          maxlength="160"
          aria-label="Popis balíčku"
          placeholder="K čemu balíček slouží, pro koho je"
        />
      </div>

      <div class="ed__actions">
        <RouterLink to="/pojistuj" class="ed__play">Vyzkoušet v hře</RouterLink>
        <UiButton size="sm" variant="ghost" @click="emit('duplicate')">Duplikovat</UiButton>
        <UiButton size="sm" variant="danger" @click="removePack">Smazat</UiButton>
      </div>
    </header>

    <!-- Postup ------------------------------------------------------------ -->
    <div class="ed__progress">
      <div class="ed__bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${pct}%` }" />
      </div>
      <p class="ed__count">
        <strong>{{ done }} z {{ total }}</strong>
        <span v-if="remaining > 0">{{ plural(total, 'otázky', 'otázek', 'otázek') }} hotových</span>
        <span v-else class="ed__complete">Balíček je hotový</span>
      </p>
      <UiButton v-if="remaining > 0" size="sm" variant="ghost" @click="openFirstEmpty">
        Doplnit chybějící
      </UiButton>
    </div>

    <p v-if="conflict" class="ed__conflict" role="alert">
      Balíček mezitím upravil někdo jiný.
      <button type="button" @click="reloadFromSource">Načíst znovu</button>
      Pokud budeš pokračovat, tvoje verze cizí změny přepíše.
    </p>

    <!-- Struktura desky ---------------------------------------------------- -->
    <div class="ed__structure">
      <CategoryBar
        :categories="draft.categories"
        :ready-count="readyInCategory"
        :total="draft.ladder.length"
        :max="MAX_CATEGORIES"
        @move="moveCategory"
        @remove="removeCategory"
        @add="addCategory"
      />
      <LadderBar
        :ladder="draft.ladder"
        :max="MAX_ROWS"
        @edit="editRow"
        @remove="removeRow"
        @add="addRow"
      />
    </div>

    <!-- Deska ---------------------------------------------------------------- -->
    <div class="ed__board">
      <BoardGrid
        :categories="draft.categories"
        :ladder="draft.ladder"
        :question-of="questionOf"
        :is-ready="isReady"
        :selected="selected"
        @select="select"
      />
      <p class="ed__hint">Klikni na políčko a napiš k němu otázku s odpovědí.</p>
    </div>

    <!-- Editor otázky ---------------------------------------------------------- -->
    <Teleport to="body">
      <Transition name="dialog">
        <div v-if="editorOpen && selectedQuestion" class="dialog" role="dialog" aria-modal="true" aria-label="Úprava otázky">
          <div class="dialog__scrim" @click="editorOpen = false" />
          <div class="dialog__panel">
            <QuestionEditor
              :key="selectedQuestion.id"
              :question="selectedQuestion"
              :category-name="selectedCategoryName"
              :position="currentIndex + 1"
              :total="total"
              :has-prev="currentIndex > 0"
              :has-next="currentIndex < total - 1"
              :remaining="remaining"
              :save-state="saveState"
              @prev="step(-1)"
              @next="step(1)"
              @next-empty="gotoNextEmpty"
              @close="editorOpen = false"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ed { display: grid; gap: var(--sp-5); align-content: start; min-width: 0; }

/* Hlavička ---------------------------------------------------------------- */
.ed__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
}
.ed__ident { display: grid; gap: var(--sp-1); flex: 1; min-width: 14rem; }
.ed__name {
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  padding: var(--sp-1) var(--sp-2);
  margin-left: calc(var(--sp-2) * -1);
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--c-text);
}
.ed__desc {
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  padding: var(--sp-1) var(--sp-2);
  margin-left: calc(var(--sp-2) * -1);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.ed__name:hover, .ed__desc:hover { border-color: var(--c-line); }
.ed__name:focus, .ed__desc:focus { border-color: var(--c-brand); outline: none; background: var(--c-sunken-focus); }

.ed__actions { display: flex; align-items: center; gap: var(--sp-2); }
.ed__play {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-brand);
  text-decoration: none;
  border-radius: var(--r-md);
}
.ed__play:hover { background: color-mix(in oklab, var(--c-brand) 12%, transparent); }

/* Postup ------------------------------------------------------------------ */
.ed__progress { display: flex; align-items: center; gap: var(--sp-4); flex-wrap: wrap; }
.ed__bar {
  flex: 1;
  min-width: 8rem;
  height: 6px;
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  overflow: hidden;
}
.ed__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--c-brand-deep), var(--c-brand));
  transition: width var(--dur-slow) var(--ease-out);
}
.ed__count { display: flex; gap: var(--sp-2); align-items: baseline; font-size: var(--fs-sm); color: var(--c-text-faint); }
.ed__count strong { color: var(--c-text); font-variant-numeric: tabular-nums; }
.ed__complete { color: var(--c-ok); font-weight: 600; }

.ed__conflict {
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid color-mix(in oklab, var(--c-brand) 45%, transparent);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-brand) 9%, transparent);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.ed__conflict button {
  border: 0; background: transparent; color: var(--c-brand);
  font-weight: 700; text-decoration: underline; text-underline-offset: 0.2em;
  padding: 0 var(--sp-1);
}

/* Struktura --------------------------------------------------------------- */
.ed__structure {
  display: grid;
  gap: var(--sp-5);
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: color-mix(in oklab, var(--c-surface) 55%, transparent);
}

/* Deska -------------------------------------------------------------------- */
.ed__board { display: grid; gap: var(--sp-3); }
.ed__hint { font-size: var(--fs-xs); color: var(--c-text-faint); }

/* Editor otázky ------------------------------------------------------------ */
.dialog {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-5);
}
.dialog__scrim {
  position: absolute;
  inset: 0;
  background: var(--c-scrim);
  backdrop-filter: blur(6px);
}
.dialog__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(100%, 40rem);
  max-height: min(90dvh, 56rem);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.dialog__panel > * { min-height: 0; }

/* Na telefonu je editor otázky celá obrazovka. Vystředěné okno s okraji
   by ubralo místo právě tam, kde se píše nejvíc textu. */
@media (pointer: coarse) {
  .ed__name { padding-block: var(--sp-2); }
  .ed__desc { padding-block: var(--sp-3); font-size: var(--fs-md); }
  .ed__play { min-height: 2.75rem; display: inline-flex; align-items: center; }
}

@media (max-width: 640px) {
  .dialog { padding: 0; place-items: stretch; }
  .dialog__panel {
    width: 100%;
    max-width: none;
    max-height: none;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }
  .dialog__scrim { display: none; }
}

.dialog-enter-active, .dialog-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.dialog-enter-active .dialog__panel { transition: transform var(--dur-base) var(--ease-back); }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
.dialog-enter-from .dialog__panel { transform: translateY(14px) scale(0.97); }
</style>
