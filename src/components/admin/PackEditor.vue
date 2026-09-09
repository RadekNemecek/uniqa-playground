<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import type { Pack, Question } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import QuestionEditor from './QuestionEditor.vue'
import { db } from '@/lib/db'
import { clone } from '@/lib/clone'
import { emptyCategory, emptyQuestion, isQuestionReady, packProgress } from '@/stores/packs'
import { confirmAction, toast } from '@/stores/ui'
import { formatScore } from '@/lib/teams'

const props = defineProps<{ pack: Pack }>()
const emit = defineEmits<{ duplicate: []; remove: [] }>()

const draft = ref<Pack>(clone(toRaw(props.pack)))
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const conflict = ref(false)
const selected = ref<{ categoryId: string; value: number } | null>(null)

let lastWrittenAt = props.pack.updatedAt
let timer = 0

/* --- Přepnutí na jiný balíček -------------------------------------------- */
watch(
  () => props.pack.id,
  () => {
    draft.value = clone(toRaw(props.pack))
    lastWrittenAt = props.pack.updatedAt
    conflict.value = false
    selected.value = null
    saveState.value = 'idle'
  },
)

/* --- Cizí úprava ---------------------------------------------------------
   Balíček je jeden dokument, takže při souběžné editaci vyhrává poslední
   zápis. Radši o tom řekneme, než abychom potichu přepsali cizí práci. */
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

/* --- Automatické ukládání ------------------------------------------------ */
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

/* --- Odvozené ------------------------------------------------------------ */
const progress = computed(() => packProgress(draft.value))
const pct = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0,
)

function questionOf(categoryId: string, value: number): Question | undefined {
  return draft.value.categories
    .find((c) => c.id === categoryId)
    ?.questions.find((q) => q.value === value)
}

const selectedQuestion = computed<Question | undefined>(() =>
  selected.value ? questionOf(selected.value.categoryId, selected.value.value) : undefined,
)

const selectedCategoryName = computed(
  () => draft.value.categories.find((c) => c.id === selected.value?.categoryId)?.name ?? '',
)

function preview(q: Question | undefined): string {
  const text = q?.prompt.trim() ?? ''
  return text.length > 46 ? `${text.slice(0, 46)}…` : text
}

/* --- Struktura balíčku --------------------------------------------------- */

/** Otázky musí vždy odpovídat žebříčku hodnot. */
function syncLadder() {
  const ladder = draft.value.ladder
  for (const cat of draft.value.categories) {
    const kept = ladder.map(
      (v) => cat.questions.find((q) => q.value === v) ?? emptyQuestion(v),
    )
    cat.questions = kept
  }
  if (selected.value && !ladder.includes(selected.value.value)) selected.value = null
}

function addCategory() {
  if (draft.value.categories.length >= 8) return
  draft.value.categories.push(
    emptyCategory(draft.value.ladder, `Kategorie ${draft.value.categories.length + 1}`),
  )
}

async function removeCategory(categoryId: string) {
  const cat = draft.value.categories.find((c) => c.id === categoryId)
  if (!cat) return
  const ok = await confirmAction({
    title: 'Smazat kategorii',
    text: `Kategorie „${cat.name}" i všechny její otázky se smažou.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  draft.value.categories = draft.value.categories.filter((c) => c.id !== categoryId)
  if (selected.value?.categoryId === categoryId) selected.value = null
}

function moveCategory(index: number, by: number) {
  const to = index + by
  const list = draft.value.categories
  if (to < 0 || to >= list.length) return
  const [item] = list.splice(index, 1)
  if (item) list.splice(to, 0, item)
}

function addRow() {
  if (draft.value.ladder.length >= 8) return
  const last = draft.value.ladder.at(-1) ?? 0
  const step = draft.value.ladder.length > 1
    ? last - (draft.value.ladder.at(-2) ?? 0)
    : 200
  draft.value.ladder.push(last + Math.max(50, step))
  syncLadder()
}

async function removeRow(value: number) {
  if (draft.value.ladder.length <= 2) return
  const ok = await confirmAction({
    title: 'Smazat řádek',
    text: `Otázky za ${formatScore(value)} bodů se ve všech kategoriích smažou.`,
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
  if (ladder.includes(n) && ladder[index] !== n) return
  const old = ladder[index]
  if (old === undefined) return
  ladder[index] = n
  for (const cat of draft.value.categories) {
    const q = cat.questions.find((x) => x.value === old)
    if (q) q.value = n
  }
  if (selected.value?.value === old) selected.value = { ...selected.value, value: n }
}

async function remove() {
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
    <!-- Hlavička balíčku ------------------------------------------------- -->
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
          placeholder="Krátký popis, k čemu balíček slouží"
        />
      </div>

      <div class="ed__meta">
        <div class="ed__progress" :title="`Vyplněno ${progress.done} z ${progress.total} otázek`">
          <svg viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--c-surface-2)" stroke-width="4" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke="var(--c-gold)" stroke-width="4" stroke-linecap="round"
              :stroke-dasharray="`${(pct / 100) * 97.4} 97.4`"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span>
            <strong>{{ progress.done }} z {{ progress.total }}</strong>
            <em>otázek hotových</em>
          </span>
        </div>

        <p class="ed__save" :data-state="saveState">
          <template v-if="saveState === 'saving'">Ukládám…</template>
          <template v-else-if="saveState === 'saved'">Uloženo</template>
          <template v-else>Automatické ukládání</template>
        </p>

        <div class="ed__actions">
          <UiButton size="sm" variant="ghost" @click="emit('duplicate')">Duplikovat</UiButton>
          <UiButton size="sm" variant="danger" @click="remove">Smazat</UiButton>
        </div>
      </div>
    </header>

    <p v-if="conflict" class="ed__conflict" role="alert">
      Balíček mezitím upravil někdo jiný.
      <button type="button" @click="reloadFromSource">Načíst znovu</button>
      Když budeš pokračovat, tvoje verze cizí změny přepíše.
    </p>

    <!-- Mřížka a editor otázky ------------------------------------------- -->
    <div class="ed__main">
      <div class="grid" :style="{ '--cols': draft.categories.length }">
        <!-- roh -->
        <div class="grid__corner"></div>

        <!-- hlavičky kategorií -->
        <div v-for="(cat, ci) in draft.categories" :key="cat.id" class="grid__cat">
          <input
            v-model="cat.name"
            type="text"
            maxlength="30"
            :title="cat.name"
            :aria-label="`Název kategorie ${ci + 1}`"
            placeholder="Kategorie"
          />
          <div class="grid__catTools">
            <button type="button" :disabled="ci === 0" aria-label="Posunout doleva" @click="moveCategory(ci, -1)">&#8249;</button>
            <button type="button" :disabled="ci === draft.categories.length - 1" aria-label="Posunout doprava" @click="moveCategory(ci, 1)">&#8250;</button>
            <button type="button" aria-label="Smazat kategorii" @click="removeCategory(cat.id)">&#215;</button>
          </div>
        </div>

        <!-- řádky hodnot -->
        <template v-for="(value, ri) in draft.ladder" :key="value">
          <div class="grid__row">
            <input
              class="grid__value"
              type="number"
              :value="value"
              step="50"
              min="10"
              :aria-label="`Hodnota řádku ${ri + 1}`"
              @change="editRow(ri, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="grid__rowX"
              :disabled="draft.ladder.length <= 2"
              aria-label="Smazat řádek"
              @click="removeRow(value)"
            >
              &#215;
            </button>
          </div>

          <button
            v-for="cat in draft.categories"
            :key="cat.id + value"
            type="button"
            class="grid__cell"
            :class="{
              'grid__cell--ready': isQuestionReady(questionOf(cat.id, value)),
              'grid__cell--on': selected?.categoryId === cat.id && selected?.value === value,
            }"
            :aria-label="`${cat.name}, ${value} bodů, ${isQuestionReady(questionOf(cat.id, value)) ? 'vyplněno' : 'prázdné'}`"
            @click="selected = { categoryId: cat.id, value }"
          >
            <span v-if="preview(questionOf(cat.id, value))" class="grid__preview">
              {{ preview(questionOf(cat.id, value)) }}
            </span>
            <span v-else class="grid__empty">prázdné</span>
          </button>
        </template>
      </div>

      <aside class="side">
        <QuestionEditor
          v-if="selectedQuestion"
          :key="selectedQuestion.id"
          :question="selectedQuestion"
          :category-name="selectedCategoryName"
        />
        <div v-else class="side__empty">
          <p class="side__emptyTitle">Klikni na políčko</p>
          <p class="side__emptyText">
            Mřížka odpovídá desce, kterou uvidí hráči. Vybrané políčko se otevře tady k úpravě.
          </p>
        </div>
      </aside>
    </div>

    <footer class="ed__foot">
      <UiButton size="sm" variant="ghost" :disabled="draft.categories.length >= 8" @click="addCategory">
        Přidat kategorii
      </UiButton>
      <UiButton size="sm" variant="ghost" :disabled="draft.ladder.length >= 8" @click="addRow">
        Přidat řádek hodnot
      </UiButton>
      <p class="ed__footNote">
        Do hry jde jen kategorie, která má vyplněné všechny otázky i odpovědi.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.ed { display: grid; gap: var(--sp-4); align-content: start; min-width: 0; }

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
.ed__name:focus, .ed__desc:focus { border-color: var(--c-gold); outline: none; background: var(--c-abyss); }

.ed__meta { display: flex; align-items: center; gap: var(--sp-5); flex-wrap: wrap; }
.ed__progress { display: flex; align-items: center; gap: var(--sp-3); }
.ed__progress strong { display: block; font-size: var(--fs-sm); font-weight: 700; }
.ed__progress em { display: block; font-style: normal; font-size: var(--fs-xs); color: var(--c-text-faint); }

.ed__save {
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  transition: color var(--dur-base) var(--ease-out);
}
.ed__save[data-state='saved'] { color: var(--c-ok); }

.ed__actions { display: flex; gap: var(--sp-2); }

.ed__conflict {
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid color-mix(in oklab, var(--c-gold) 45%, transparent);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-gold) 9%, transparent);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
}
.ed__conflict button {
  border: 0; background: transparent; color: var(--c-gold);
  font-weight: 700; text-decoration: underline; text-underline-offset: 0.2em;
  padding: 0 var(--sp-1);
}

/* Mřížka ------------------------------------------------------------------ */
.ed__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
  gap: var(--sp-4);
  align-items: start;
}

.grid {
  display: grid;
  grid-template-columns: 6rem repeat(var(--cols), minmax(6.5rem, 1fr));
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
}

.grid__corner { }

.grid__cat {
  display: grid;
  gap: 2px;
  padding: var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
}
.grid__cat input {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  padding: 2px var(--sp-2);
  font-family: var(--font-display);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--c-text);
  text-align: center;
}
.grid__cat input:hover { border-color: var(--c-line); }
.grid__cat input:focus { border-color: var(--c-gold); outline: none; background: var(--c-abyss); }
.grid__catTools { display: flex; justify-content: center; gap: 2px; }
.grid__catTools button {
  width: 1.4rem; height: 1.4rem;
  border: 0; border-radius: var(--r-sm);
  background: transparent; color: var(--c-text-faint);
  font-size: 0.9rem; line-height: 1;
}
.grid__catTools button:hover:not(:disabled) { background: var(--c-surface-3); color: var(--c-text); }
.grid__catTools button:disabled { opacity: 0.25; }

.grid__row { display: flex; align-items: center; gap: 2px; }
.grid__value {
  flex: 1;
  min-width: 0;
  padding: var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
  color: var(--c-gold);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: var(--fs-md);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.grid__value:focus { border-color: var(--c-gold); outline: none; }
.grid__rowX {
  width: 1.4rem; height: 1.4rem; flex: none;
  border: 0; border-radius: var(--r-sm);
  background: transparent; color: var(--c-text-faint); font-size: 0.9rem; line-height: 1;
}
.grid__rowX:hover:not(:disabled) { color: var(--c-bad); }
.grid__rowX:disabled { opacity: 0.2; }

.grid__cell {
  display: grid;
  place-items: center;
  min-height: 3.5rem;
  padding: var(--sp-2);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  line-height: 1.35;
  text-align: center;
  transition: all var(--dur-fast) var(--ease-out);
}
.grid__cell:hover { border-color: var(--c-surface-3); color: var(--c-text-muted); }
.grid__cell--ready {
  border-style: solid;
  border-color: color-mix(in oklab, var(--c-ok) 32%, var(--c-line));
  background: color-mix(in oklab, var(--c-ok) 7%, var(--c-abyss));
  color: var(--c-text-muted);
}
.grid__cell--on {
  border-color: var(--c-gold);
  background: color-mix(in oklab, var(--c-gold) 12%, var(--c-abyss));
  color: var(--c-text);
}
.grid__preview { display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.grid__empty { font-style: italic; opacity: 0.6; }

/* Boční editor ------------------------------------------------------------ */
.side {
  position: sticky;
  top: var(--sp-4);
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
}
.side__empty { display: grid; gap: var(--sp-2); text-align: center; padding: var(--sp-6) var(--sp-2); }
.side__emptyTitle { font-weight: 600; }
.side__emptyText { font-size: var(--fs-sm); color: var(--c-text-faint); line-height: var(--lh-body); }

/* Patička ----------------------------------------------------------------- */
.ed__foot { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }
.ed__footNote { font-size: var(--fs-xs); color: var(--c-text-faint); }

@media (max-width: 1100px) {
  .ed__main { grid-template-columns: minmax(0, 1fr); }
  .side { position: static; }
}
</style>
