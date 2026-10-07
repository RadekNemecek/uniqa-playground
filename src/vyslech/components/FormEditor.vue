<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import { clone } from '@/lib/clone'
import { count } from '@/lib/format'
import { saveForm } from '@/stores/vyslechForms'
import { confirmAction, toast } from '@/stores/ui'
import {
  KINDS,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  emptyQuestion,
  hasOptions,
  highLabel,
  isQuestionReady,
  lowLabel,
} from '../questions'
import type { VyslechForm, VyslechKind, VyslechQuestion } from '../types'

/**
 * Editor sady otázek.
 *
 * Sada má pár otázek, takže jsou všechny rozložené pod sebou, ne jedna
 * otevřená v okně. Ukládá se samo po každé pauze v psaní, stejně jako
 * balíček kvízu.
 */
const props = defineProps<{ form: VyslechForm }>()
const emit = defineEmits<{ back: []; duplicate: []; remove: [] }>()

const draft = ref<VyslechForm>(clone(toRaw(props.form)))
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const conflict = ref(false)
const canAdd = computed(() => draft.value.questions.length < MAX_QUESTIONS)
const ready = computed(() => draft.value.questions.filter(isQuestionReady).length)

let lastWrittenAt = props.form.updatedAt
let timer = 0
let revision = 0
let savedRevision = 0
let inFlight: Promise<boolean> | null = null

// Někdo jiný sadu mezitím uložil. Poslední zápis vyhrává, tak to aspoň říct.
watch(
  () => props.form.updatedAt,
  (at) => {
    if (at !== lastWrittenAt) conflict.value = true
  },
)

watch(
  draft,
  () => {
    revision++
    saveState.value = 'saving'
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void flush(), 600)
  },
  { deep: true, flush: 'sync' },
)

async function flush(): Promise<boolean> {
  window.clearTimeout(timer)
  if (inFlight) {
    if (!(await inFlight)) return false
    return flush()
  }
  if (revision === savedRevision) return true
  const writing = revision
  const at = Math.max(Date.now(), lastWrittenAt + 1)
  const snapshot = { ...clone(toRaw(draft.value)), updatedAt: at }
  lastWrittenAt = at
  inFlight = saveForm(snapshot)
    .then(() => {
      savedRevision = writing
      saveState.value = revision === writing ? 'saved' : 'saving'
      return true
    })
    .catch(() => {
      saveState.value = 'error'
      return false
    })
  const ok = await inFlight
  inFlight = null
  if (ok && revision !== savedRevision) return flush()
  return ok
}

defineExpose({ flush })

onBeforeRouteLeave(() => flush())
onBeforeRouteUpdate(() => flush())
onBeforeUnmount(() => {
  window.clearTimeout(timer)
  if (revision !== savedRevision) {
    void flush().then((ok) => {
      if (!ok) toast('Poslední změny sady se nepodařilo uložit.', 'bad', 8000)
    })
  }
})

async function back(): Promise<void> {
  if (await flush()) emit('back')
  else toast('Sadu se nepodařilo uložit. Zkontroluj připojení.', 'bad')
}

function reloadFromSource(): void {
  window.clearTimeout(timer)
  draft.value = clone(toRaw(props.form))
  savedRevision = revision
  lastWrittenAt = props.form.updatedAt
  conflict.value = false
  saveState.value = 'idle'
}

/* --- Otázky --------------------------------------------------------------- */

async function addQuestion(): Promise<void> {
  if (!canAdd.value) return
  const q = emptyQuestion('scale')
  draft.value.questions.push(q)
  await nextTick()
  document.getElementById(`prompt-${q.id}`)?.focus()
}

function move(index: number, by: number): void {
  const list = draft.value.questions
  const to = index + by
  if (to < 0 || to >= list.length) return
  const [q] = list.splice(index, 1)
  list.splice(to, 0, q!)
}

async function removeQuestion(index: number): Promise<void> {
  const q = draft.value.questions[index]
  if (!q) return
  if (q.prompt.trim()) {
    const ok = await confirmAction({
      title: 'Smazat otázku',
      text: `„${q.prompt.trim()}" zmizí ze sady. Výsledky dřívějších školení zůstanou.`,
      confirmLabel: 'Smazat',
      danger: true,
    })
    if (!ok) return
  }
  draft.value.questions.splice(index, 1)
}

/**
 * Změna tvaru zachová id otázky, ale zahodí, co k novému tvaru nepatří.
 * Možnosti se nechají, když se přechází mezi jednou a víc volbami.
 */
function setKind(q: VyslechQuestion, kind: VyslechKind): void {
  if (q.kind === kind) return
  const keepOptions = hasOptions(q.kind) && hasOptions(kind)
  q.kind = kind
  if (!keepOptions) q.options = hasOptions(kind) ? ['', ''] : []
  if (kind === 'text') q.required = false
  q.low = ''
  q.high = ''
}

function addOption(q: VyslechQuestion): void {
  if (q.options.length < MAX_OPTIONS) q.options.push('')
}

function removeOption(q: VyslechQuestion, i: number): void {
  q.options.splice(i, 1)
}

const saveLabel = computed(() => {
  switch (saveState.value) {
    case 'saving':
      return 'Ukládám…'
    case 'saved':
      return 'Uloženo'
    case 'error':
      return 'Neuloženo'
    default:
      return ''
  }
})
</script>

<template>
  <section class="editor">
    <header class="editor__head">
      <UiButton variant="ghost" size="sm" icon="arrow-left" @click="back">Všechny sady</UiButton>
      <p class="editor__save" :class="{ 'editor__save--bad': saveState === 'error' }" aria-live="polite">{{ saveLabel }}</p>
      <UiMenu :label="`Akce sady ${draft.name}`" v-slot="{ close }">
        <button type="button" role="menuitem" @click="close(); emit('duplicate')">Duplikovat</button>
        <hr />
        <button type="button" role="menuitem" class="danger" @click="close(); emit('remove')">Smazat sadu</button>
      </UiMenu>
    </header>

    <p v-if="conflict" class="conflict" role="alert">
      Sadu mezitím upravil někdo jiný. Když budeš pokračovat, jeho změny přepíšeš.
      <button type="button" @click="reloadFromSource">Načíst jeho verzi</button>
    </p>

    <UiField label="Název sady">
      <input v-model="draft.name" type="text" maxlength="60" class="editor__name" />
    </UiField>
    <p class="hint">
      {{ count(ready, 'otázka je hotová', 'otázky jsou hotové', 'otázek je hotových') }} z {{ draft.questions.length }}.
      Rozepsané se do dotazníku nedostanou. Celkovou známku ve výsledcích nese první škála.
    </p>

    <ol class="questions">
      <li v-for="(q, i) in draft.questions" :key="q.id" class="q" :class="{ 'q--draft': !isQuestionReady(q) }">
        <div class="q__head">
          <span class="q__num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <label class="q__kind">
            <span class="vh">Tvar otázky {{ i + 1 }}</span>
            <select :value="q.kind" @change="setKind(q, ($event.target as HTMLSelectElement).value as VyslechKind)">
              <option v-for="k in KINDS" :key="k.kind" :value="k.kind">{{ k.label }}</option>
            </select>
          </label>
          <div class="q__tools">
            <UiIconButton icon="chevron-up" size="sm" :label="`Posunout otázku ${i + 1} výš`" :disabled="i === 0" @click="move(i, -1)" />
            <UiIconButton icon="chevron-down" size="sm" :label="`Posunout otázku ${i + 1} níž`" :disabled="i === draft.questions.length - 1" @click="move(i, 1)" />
            <UiIconButton icon="trash" size="sm" variant="danger" :label="`Smazat otázku ${i + 1}`" @click="removeQuestion(i)" />
          </div>
        </div>

        <p class="hint">{{ KINDS.find((k) => k.kind === q.kind)?.hint }}</p>

        <UiField :id="`prompt-${q.id}`" label="Znění" label-hidden>
          <textarea :id="`prompt-${q.id}`" v-model="q.prompt" rows="2" maxlength="200" placeholder="Na co se ptáš?"></textarea>
        </UiField>

        <div v-if="q.kind === 'scale' || q.kind === 'nps'" class="pair">
          <UiField :label="`Popisek u ${q.kind === 'nps' ? '0' : '1'}`">
            <input v-model="q.low" type="text" maxlength="30" :placeholder="lowLabel({ ...q, low: '' })" />
          </UiField>
          <UiField :label="`Popisek u ${q.kind === 'nps' ? '10' : '5'}`">
            <input v-model="q.high" type="text" maxlength="30" :placeholder="highLabel({ ...q, high: '' })" />
          </UiField>
        </div>

        <div v-if="hasOptions(q.kind)" class="options">
          <p class="options__label">Možnosti</p>
          <div v-for="(_, oi) in q.options" :key="oi" class="option">
            <input
              v-model="q.options[oi]"
              type="text"
              maxlength="80"
              :aria-label="`Možnost ${oi + 1}`"
              :placeholder="`Možnost ${oi + 1}`"
            />
            <UiIconButton
              icon="close"
              size="sm"
              :label="`Odebrat možnost ${oi + 1}`"
              :disabled="q.options.length <= 2"
              @click="removeOption(q, oi)"
            />
          </div>
          <UiButton v-if="q.options.length < MAX_OPTIONS" variant="quiet" size="sm" icon="plus" @click="addOption(q)">
            Přidat možnost
          </UiButton>
        </div>

        <UiSwitch
          v-model="q.required"
          label="Povinná"
          :hint="q.kind === 'text' ? 'Text obvykle nechej nepovinný. Kdo nemá co říct, napíše vatu.' : ''"
        />
      </li>
    </ol>

    <UiButton v-if="canAdd" variant="brand" icon="plus" @click="addQuestion">Přidat otázku</UiButton>
    <p v-else class="hint">Víc než {{ MAX_QUESTIONS }} otázek lidi na telefonu nedočtou.</p>
  </section>
</template>

<style scoped>
/* Editor je práce, ne hra: obrys a tvrdý stín ano, natočení a nálepky ne.
   Výjimka je pořadové číslo, to má stejnou podobu jako v přípravě. */
.editor { display: grid; gap: var(--sp-5); max-width: var(--content-reading); margin-inline: auto; }
.editor__head { display: flex; align-items: center; gap: var(--sp-3); }
.editor__save { flex: 1; text-align: right; font-size: var(--fs-sm); color: var(--c-text-muted); }
.editor__save--bad { color: var(--c-bad); font-weight: 700; }
.editor__name { font-size: var(--fs-xl); font-weight: 900; }
.hint { font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--c-text-faint); }

.conflict {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
  font-size: var(--fs-sm);
}
.conflict button { border: 0; background: transparent; color: inherit; font-weight: 900; text-decoration: underline; }

.questions { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-4); }
.q {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}
/* Rozepsaná otázka se do dotazníku nedostane. Pozná se podle čárkované
   hrany, ne jen podle odstínu. */
.q--draft { border-style: dashed; box-shadow: var(--shadow-none); }
.q__head { display: flex; align-items: center; gap: var(--sp-3); }
.q__num {
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  background: var(--c-ink);
  color: var(--c-on-ink);
  font-size: var(--fs-sm);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.q__kind { flex: 1; min-width: 0; }
.q__kind select {
  width: min(100%, 16rem);
  min-height: var(--control-md);
  padding: var(--sp-1) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
  font-weight: 700;
}
.q__tools { display: flex; gap: var(--sp-1); }

.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sp-3); }

.options { display: grid; gap: var(--sp-2); justify-items: start; }
.options__label { font-size: var(--fs-sm); font-weight: 900; }
.option { display: flex; align-items: center; gap: var(--sp-2); width: 100%; }
.option input {
  flex: 1;
  min-width: 0;
  min-height: var(--control-md);
  padding: var(--sp-1) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
}
.option input:focus-visible,
.q__kind select:focus-visible { background: var(--c-bg-field-focus); }

@media (max-width: 720px) {
  .pair { grid-template-columns: minmax(0, 1fr); }
  .q__head { flex-wrap: wrap; }
}
@media (pointer: coarse) {
  .q__kind select,
  .option input { min-height: var(--control-touch); }
}
</style>
