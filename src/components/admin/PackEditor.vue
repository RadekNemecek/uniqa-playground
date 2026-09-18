<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import type { Pack, Question } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import BoardEditor from './BoardEditor.vue'
import QuestionEditor from './QuestionEditor.vue'
import { db } from '@/lib/db'
import { clone } from '@/lib/clone'
import { emptyCategory, emptyQuestion, isQuestionReady, playableCategories } from '@/stores/packs'
import { confirmAction, toast } from '@/stores/ui'
import { formatScore } from '@/lib/teams'
import { count, plural } from '@/lib/format'
import { downloadPack } from '@/lib/packIo'
import { useMediaQuery, WIDE } from '@/lib/media'
import UiIcon from '@/components/ui/UiIcon.vue'

/**
 * Kolik kategorií smí balíček mít.
 *
 * Je jich víc, než kolik se vejde na desku (šest), aby si autorka mohla
 * držet zásobu a před hrou vybírat. Editor to musí říct nahlas, jinak
 * napíše sedmou kategorii a diví se, proč se v přípravě nenabídne.
 */
const MAX_CATEGORIES = 8
/** Kolik jich projde do jedné hry. Sedí s MAX_CATEGORIES v GameSetup.vue. */
const PLAYABLE_CATEGORIES = 6
const MAX_ROWS = 8

const props = defineProps<{ pack: Pack }>()
const emit = defineEmits<{ duplicate: []; remove: []; back: [] }>()

const draft = ref<Pack>(clone(toRaw(props.pack)))
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const conflict = ref(false)
const selected = ref<{ categoryId: string; value: number } | null>(null)
const editorOpen = ref(false)

const wide = useMediaQuery(WIDE)

let lastWrittenAt = props.pack.updatedAt
let timer = 0

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

function questionOf(categoryId: string, value: number): Question | undefined {
  return draft.value.categories
    .find((c) => c.id === categoryId)
    ?.questions.find((q) => q.value === value)
}

function isReady(categoryId: string, value: number): boolean {
  return isQuestionReady(questionOf(categoryId, value))
}

const cells = computed(() =>
  draft.value.ladder.flatMap((value) =>
    draft.value.categories.map((c) => ({ categoryId: c.id, value })),
  ),
)

const done = computed(() => cells.value.filter((c) => isReady(c.categoryId, c.value)).length)
const total = computed(() => cells.value.length)
const remaining = computed(() => total.value - done.value)
const pct = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))
const playable = computed(() => playableCategories(draft.value).length)
const categoryTotal = computed(() => draft.value.categories.length)

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

/** Na široké obrazovce je panel vedle desky; jinak fullscreen / modal. */
const panelInline = computed(() => wide.value && editorOpen.value && !!selectedQuestion.value)
const panelOverlay = computed(() => !wide.value && editorOpen.value && !!selectedQuestion.value)

function select(categoryId: string, value: number) {
  selected.value = { categoryId, value }
  editorOpen.value = true
}

function step(by: number) {
  const next = cells.value[currentIndex.value + by]
  if (next) selected.value = { ...next }
}

function gotoNextEmpty() {
  const from = currentIndex.value + 1
  const order = [...cells.value.slice(from), ...cells.value.slice(0, Math.max(0, from))]
  const target = order.find((c) => !isReady(c.categoryId, c.value))
  if (!target) return
  selected.value = { ...target }
  editorOpen.value = true
}

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

function closeEditor() {
  editorOpen.value = false
}

selectFirstUseful()

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
  if (selected.value?.categoryId === categoryId) {
    selectFirstUseful()
    if (!selected.value) editorOpen.value = false
  }
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
  const stepSize = draft.value.ladder.length > 1 ? last - (draft.value.ladder.at(-2) ?? 0) : 200
  draft.value.ladder.push(last + Math.max(50, stepSize))
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

function removePack() {
  emit('remove')
}

function onExport() {
  downloadPack(draft.value)
  toast('Balíček stažen jako JSON.', 'ok')
}
</script>

<template>
  <div class="ed" :class="{ 'ed--split': panelInline }">
    <header class="ed__bar">
      <button type="button" class="ed__back" @click="emit('back')">
        <UiIcon name="chevron-left" size="sm" />
        Balíčky
      </button>

      <p class="ed__save" :data-state="saveState">
        <span v-if="saveState === 'saving'">Ukládám…</span>
        <span v-else-if="saveState === 'saved'" class="ed__saved">
          <UiIcon name="check" size="sm" />
          Uloženo
        </span>
      </p>

    </header>

    <div class="ed__ident">
      <!-- Duplikovat, exportovat a smazat se týká tohohle balíčku, tak
           stojí u jeho názvu. V horní liště visely nad ním vedle tlačítka
           Zpět, kde vypadaly jako ovládání celé stránky. -->
      <div class="ed__ident-row">
        <input
          v-model="draft.name"
          class="ed__name"
          type="text"
          maxlength="60"
          aria-label="Název balíčku"
          placeholder="Název balíčku"
        />
        <UiMenu label="Akce balíčku" v-slot="{ close }">
          <!-- S balíčkem v adrese. Bez něj odkaz otevřel přípravu s tím
               balíčkem, se kterým se hrálo naposled, ne s tímhle. -->
          <RouterLink
            role="menuitem"
            :to="{ path: '/pojistuj', query: { pack: draft.id } }"
            @click="close"
          >Vyzkoušet v hře</RouterLink>
          <button type="button" role="menuitem" @click="emit('duplicate'); close()">Duplikovat</button>
          <button type="button" role="menuitem" @click="onExport(); close()">Exportovat JSON</button>
          <hr />
          <button type="button" role="menuitem" class="danger" @click="removePack(); close()">Smazat</button>
        </UiMenu>
      </div>
      <input
        v-model="draft.description"
        class="ed__desc"
        type="text"
        maxlength="160"
        aria-label="Popis balíčku"
        placeholder="K čemu balíček slouží, pro koho je"
      />
    </div>

    <div class="ed__progress">
      <div class="ed__bar-track" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${pct}%` }" />
      </div>
      <div class="ed__stats">
        <p class="ed__count">
          <strong>{{ done }} z {{ total }}</strong>
          <span>{{ plural(total, 'otázka', 'otázky', 'otázek') }}</span>
        </p>
        <p class="ed__playable" :class="{ 'ed__playable--ok': playable > 0 }">
          <template v-if="playable === categoryTotal && categoryTotal > 0">Všechny kategorie jsou hratelné</template>
          <template v-else-if="playable > 0">
            {{ playable }} z {{ categoryTotal }} kategorií hratelných
          </template>
          <template v-else>Žádná kategorie ještě není celá</template>
        </p>
      </div>
      <UiButton v-if="remaining > 0" size="sm" variant="brand" @click="openFirstEmpty">
        Doplnit chybějící
      </UiButton>
    </div>

    <p v-if="conflict" class="ed__conflict" role="alert">
      Balíček mezitím upravil někdo jiný.
      <button type="button" @click="reloadFromSource">Načíst znovu</button>
      Pokud budeš pokračovat, tvoje verze cizí změny přepíše.
    </p>

    <div class="ed__workspace">
      <div class="ed__board">
        <!-- Deska na plátně unese šest sloupců. Balíček jich smí mít víc
             jako zásobu, ale autorka to musí vědět tady, kde kategorie
             vznikají, ne až v přípravě hry. -->
        <p v-if="draft.categories.length > PLAYABLE_CATEGORIES" class="ed__overflow">
          Do jedné hry jde nejvýš {{ PLAYABLE_CATEGORIES }} kategorií. Zbytek zůstane
          v balíčku jako zásoba a vybereš si v přípravě.
        </p>

        <BoardEditor
          :categories="draft.categories"
          :ladder="draft.ladder"
          :question-of="questionOf"
          :is-ready="isReady"
          :selected="editorOpen ? selected : null"
          :max-categories="MAX_CATEGORIES"
          :max-rows="MAX_ROWS"
          :can-remove-category="draft.categories.length > 1"
          :can-remove-row="draft.ladder.length > 2"
          @select="select"
          @move-category="moveCategory"
          @remove-category="removeCategory"
          @add-category="addCategory"
          @edit-row="editRow"
          @remove-row="removeRow"
          @add-row="addRow"
        />
        <p class="ed__hint">
          Uprav názvy a hodnoty přímo na desce. Klikni na políčko a napiš otázku s odpovědí.
        </p>
      </div>

      <aside v-if="panelInline" class="ed__panel" aria-label="Úprava otázky">
        <QuestionEditor
          :key="selectedQuestion!.id"
          :question="selectedQuestion!"
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
          @close="closeEditor"
        />
      </aside>
    </div>

    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="panelOverlay"
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Úprava otázky"
        >
          <div class="dialog__scrim" @click="closeEditor" />
          <div class="dialog__panel">
            <QuestionEditor
              :key="selectedQuestion!.id"
              :question="selectedQuestion!"
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
              @close="closeEditor"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ed { display: grid; gap: var(--sp-4); align-content: start; min-width: 0; }

.ed__bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.ed__back {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.ed__back:hover { color: var(--c-text); background: var(--c-surface-2); }
.ed__save {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  min-height: 1.25rem;
}
.ed__saved { display: inline-flex; align-items: center; gap: var(--sp-1); color: var(--c-ok); }

.ed__ident { display: grid; gap: var(--sp-1); }
.ed__ident-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.ed__ident-row .ed__name { flex: 1 1 auto; min-width: 0; }
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
  text-overflow: ellipsis;
}
.ed__desc:focus { text-overflow: clip; }
.ed__name:hover, .ed__desc:hover { border-color: var(--c-line); }
.ed__name:focus, .ed__desc:focus { border-color: var(--c-brand); background: var(--c-sunken-focus); }

.ed__progress {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.ed__bar-track {
  flex: 1;
  min-width: 8rem;
  height: 6px;
  border-radius: var(--r-full);
  background: var(--c-surface-2);
  overflow: hidden;
}
.ed__bar-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--c-brand-deep), var(--c-brand));
  transition: width var(--dur-slow) var(--ease-out);
}
.ed__stats { display: grid; gap: 2px; }
.ed__count { display: flex; gap: var(--sp-2); align-items: baseline; font-size: var(--fs-sm); color: var(--c-text-faint); }
.ed__count strong { color: var(--c-text); font-variant-numeric: tabular-nums; }
.ed__playable { font-size: var(--fs-xs); color: var(--c-text-faint); }
.ed__playable--ok { color: var(--c-ok); font-weight: 600; }

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

.ed__workspace { display: grid; gap: var(--sp-4); min-width: 0; }
.ed--split .ed__workspace {
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
  align-items: start;
}
.ed__overflow {
  margin-bottom: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w) solid color-mix(in oklab, var(--c-brand) 40%, transparent);
  border-radius: var(--r-md);
  background: var(--c-brand-wash);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  line-height: 1.4;
}

.ed__board { display: grid; gap: var(--sp-3); min-width: 0; }
.ed__hint { font-size: var(--fs-xs); color: var(--c-text-faint); }

.ed__panel {
  position: sticky;
  top: var(--sp-4);
  max-height: calc(100dvh - 4rem);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.ed__panel > * { min-height: 0; flex: 1; }

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

@media (pointer: coarse) {
  .ed__name { padding-block: var(--sp-2); }
  .ed__desc { padding-block: var(--sp-3); font-size: var(--fs-md); }
  .ed__back { min-height: 2.75rem; }
}

@media (max-width: 720px) {
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
