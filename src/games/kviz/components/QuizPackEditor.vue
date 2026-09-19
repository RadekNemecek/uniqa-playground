<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import QuizItemEditor from './QuizItemEditor.vue'
import { db } from '@/lib/db'
import { clone } from '@/lib/clone'
import { emptyQuizItem, isItemReady, quizPackProgress } from '@/stores/quizPacks'
import { removeImage } from '@/stores/quizImages'
import { confirmAction, toast } from '@/stores/ui'
import { downloadQuizPack } from '../packIo'
import { BOOLEAN_LABELS, kindOf } from '../options'
import type { QuizPack } from '../types'

const MAX_ITEMS = 100
const props = defineProps<{ pack: QuizPack }>()
const emit = defineEmits<{ duplicate: []; remove: []; back: [] }>()
const draft = ref<QuizPack>(clone(toRaw(props.pack)))
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const conflict = ref(false)
const openId = ref(props.pack.items[0]?.id ?? '')
const metadataOpen = ref(false)
const editor = ref<InstanceType<typeof QuizItemEditor> | null>(null)
const progress = computed(() => quizPackProgress(draft.value))
const canAdd = computed(() => draft.value.items.length < MAX_ITEMS)
const currentIndex = computed(() => draft.value.items.findIndex(q => q.id === openId.value))
const current = computed(() => draft.value.items[currentIndex.value])
let lastWrittenAt = props.pack.updatedAt
let timer = 0
let revision = 0
let savedRevision = 0
let inFlight: Promise<boolean> | null = null

watch(() => props.pack.updatedAt, at => {
  if (at !== lastWrittenAt) conflict.value = true
})

// Požadavky ukládáme v pořadí. Potvrzení staršího zápisu nesmí hlásit
// „Uloženo“, když už autorka píše další změnu.
watch(draft, () => {
  revision++
  saveState.value = 'saving'
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void flush(), 600)
}, { deep: true, flush: 'sync' })

async function flush(): Promise<boolean> {
  window.clearTimeout(timer)
  if (inFlight) {
    if (!await inFlight) return false
    return flush()
  }
  if (revision === savedRevision) return true
  const writingRevision = revision
  const at = Math.max(Date.now(), lastWrittenAt + 1)
  const snapshot = { ...clone(toRaw(draft.value)), updatedAt: at }
  lastWrittenAt = at
  saveState.value = 'saving'
  inFlight = db().saveQuizPack(snapshot).then(() => {
    savedRevision = writingRevision
    saveState.value = revision === writingRevision ? 'saved' : 'saving'
    return true
  }).catch(() => {
    saveState.value = 'error'
    return false
  })
  const ok = await inFlight
  inFlight = null
  if (ok && revision !== savedRevision) return flush()
  return ok
}

defineExpose({ flush })

// I odchod přes hlavní navigaci nejdřív dokončí ukládání.
onBeforeRouteLeave(() => flush())
onBeforeRouteUpdate(() => flush())

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  if (revision !== savedRevision) void flush().then(ok => {
    if (!ok) toast('Poslední změny balíčku se nepodařilo uložit.', 'bad', 8000)
  })
})

async function back(): Promise<void> {
  if (await flush()) emit('back')
}

async function reloadFromSource(): Promise<void> {
  // Rozpracovaný zápis musí doběhnout před výměnou konceptu.
  window.clearTimeout(timer)
  if (inFlight) await inFlight
  draft.value = clone(toRaw(props.pack))
  window.clearTimeout(timer)
  savedRevision = revision
  lastWrittenAt = props.pack.updatedAt
  conflict.value = false
  saveState.value = 'idle'
  if (!draft.value.items.some(q => q.id === openId.value)) openId.value = draft.value.items[0]?.id ?? ''
}

async function openItem(id: string): Promise<void> {
  openId.value = id
  await nextTick()
  editor.value?.focusPrompt()
}

async function addItem(): Promise<void> {
  if (!canAdd.value) return
  const item = emptyQuizItem()
  draft.value.items.push(item)
  await openItem(item.id)
}

async function removeItem(): Promise<void> {
  const item = current.value
  if (!item) return
  if (isItemReady(item) && !await confirmAction({ title: 'Smazat otázku', text: 'Otázka se smaže i s možnostmi. Vrátit to nejde.', confirmLabel: 'Smazat', danger: true })) return
  const at = currentIndex.value
  draft.value.items.splice(at, 1)
  openId.value = draft.value.items[Math.min(at, draft.value.items.length - 1)]?.id ?? ''
  if (item.imageId) await removeImage(item.imageId)
  await nextTick()
  editor.value?.focusPrompt()
}

function move(by: number): void {
  const at = currentIndex.value
  const to = at + by
  if (at < 0 || to < 0 || to >= draft.value.items.length) return
  const [item] = draft.value.items.splice(at, 1)
  draft.value.items.splice(to, 0, item!)
}

function correctText(id: string): string {
  const item = draft.value.items.find(q => q.id === id)
  if (!item) return ''
  if (kindOf(item) === 'boolean') return BOOLEAN_LABELS[item.correctIndex] ?? ''
  return item.options[item.correctIndex]?.trim() ?? ''
}

async function exportPack(): Promise<void> {
  await downloadQuizPack(clone(toRaw(draft.value)))
  toast('Balíček stažen jako JSON.', 'ok')
}
async function removePack(): Promise<void> {
  if (await flush()) emit('remove')
}
async function duplicate(): Promise<void> {
  if (await flush()) emit('duplicate')
}
</script>

<template>
  <section class="ed">
    <header class="ed__toolbar">
      <UiButton variant="quiet" size="sm" icon="chevron-left" @click="back">Všechny balíčky</UiButton>
      <div class="ed__state" role="status" :data-state="saveState">
        {{ saveState === 'saving' ? 'Ukládám…' : saveState === 'saved' ? 'Uloženo' : saveState === 'error' ? 'Změny nejsou uložené' : 'Ukládá se automaticky' }}
      </div>
      <UiButton v-if="saveState === 'error'" size="sm" variant="brand" @click="flush">Zkusit uložit znovu</UiButton>
      <UiMenu label="Akce otevřeného balíčku" v-slot="{ close }">
        <button type="button" role="menuitem" @click="void exportPack(); close()">Stáhnout jako JSON</button>
        <button type="button" role="menuitem" @click="void duplicate(); close()">Duplikovat</button>
        <button type="button" role="menuitem" class="danger" @click="void removePack(); close()">Smazat balíček</button>
      </UiMenu>
    </header>
    <div v-if="conflict" class="conflict" role="alert">
      <p>Balíček mezitím změnil někdo jiný. Další úpravou jeho změny přepíšeš.</p>
      <UiButton size="sm" variant="ghost" @click="reloadFromSource">Načíst znovu</UiButton>
    </div>
    <header class="ed__identity">
      <div>
        <p class="eyebrow">Úprava balíčku</p>
        <h1>{{ draft.name || 'Nepojmenovaný balíček' }}</h1>
        <p v-if="draft.description" class="ed__description">{{ draft.description }}</p>
        <p class="ed__progress">{{ progress.done }} z {{ progress.total }} otázek hotových</p>
      </div>
      <UiButton size="sm" variant="ghost" icon="edit" @click="metadataOpen = true">Název a popis</UiButton>
    </header>

    <div v-if="draft.items.length" class="ed__layout">
      <aside class="ed__sidebar" aria-label="Otázky balíčku">
        <UiField class="ed__mobile-select" label="Vybraná otázka">
          <select :value="openId" @change="openItem(($event.target as HTMLSelectElement).value)">
            <option v-for="(item, i) in draft.items" :key="item.id" :value="item.id">{{ i + 1 }}. {{ item.prompt.trim() || 'Nová otázka' }}</option>
          </select>
        </UiField>
        <ol class="questions">
          <li v-for="(item, i) in draft.items" :key="item.id">
            <button type="button" class="question" :aria-current="openId === item.id ? 'true' : undefined" @click="openItem(item.id)">
              <span class="question__num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="question__copy">
                <span class="question__prompt">{{ item.prompt.trim() || 'Nová otázka' }}</span>
                <span v-if="isItemReady(item)" class="question__answer">{{ correctText(item.id) }}</span>
                <span v-else class="question__todo">{{ kindOf(item) === 'boolean' ? 'Chybí znění tvrzení' : 'Chybí znění nebo možnosti' }}</span>
                <span v-if="item.imageId" class="question__image"><UiIcon name="image" size="sm" /> S obrázkem</span>
              </span>
            </button>
          </li>
        </ol>
        <UiButton icon="plus" variant="brand" :disabled="!canAdd" @click="addItem">Přidat otázku</UiButton>
        <p v-if="!canAdd" class="hint">Nejvýše {{ MAX_ITEMS }} otázek v balíčku.</p>
      </aside>
      <section v-if="current" class="sheet" aria-labelledby="editor-question-title">
        <header class="sheet__head">
          <h2 id="editor-question-title">Otázka {{ currentIndex + 1 }} <span>z {{ draft.items.length }}</span></h2>
          <div class="sheet__tools">
            <UiIconButton icon="chevron-up" label="Posunout otázku nahoru" :disabled="currentIndex === 0" @click="move(-1)" />
            <UiIconButton icon="chevron-down" label="Posunout otázku dolů" :disabled="currentIndex === draft.items.length - 1" @click="move(1)" />
            <UiButton variant="danger" size="sm" icon="trash" @click="removeItem">Smazat</UiButton>
          </div>
        </header>
        <QuizItemEditor :key="current.id" ref="editor" :item="current" />
      </section>
    </div>
    <UiEmpty v-else title="První otázka čeká na tebe" text="Přidej otázku se čtyřmi možnostmi nebo tvrzení na pravda a nepravda.">
      <UiButton icon="plus" variant="brand" @click="addItem">Přidat otázku</UiButton>
    </UiEmpty>

    <UiModal :open="metadataOpen" title="Název a popis balíčku" size="md" @close="metadataOpen = false">
      <div class="stack">
        <UiField label="Název balíčku"><input v-model="draft.name" maxlength="60" placeholder="Název balíčku" /></UiField>
        <UiField label="Popis (nepovinné)"><textarea v-model="draft.description" maxlength="160" rows="3" placeholder="Pro koho balíček je a co si v něm procvičí" /></UiField>
      </div>
      <template #footer><UiButton variant="brand" @click="metadataOpen = false">Hotovo</UiButton></template>
    </UiModal>
  </section>
</template>

<style scoped>
/* Táž sazba jako knihovna, příprava i výsledky. Editor se dřív roztáhl
   do celé šířky stránky, takže otevření balíčku odskočilo obsah o čtvrt
   obrazovky doleva. */
.ed { display: grid; gap: var(--sp-5); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.ed__toolbar { display: flex; gap: var(--sp-3); align-items: center; flex-wrap: wrap; }
.ed__state { margin-left: auto; color: var(--c-text-faint); font-size: var(--fs-sm); }
.ed__state[data-state='saved'] { color: var(--c-ok); }
.ed__state[data-state='error'] { color: var(--c-bad); font-weight: 700; }
.conflict { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-4); padding: var(--sp-4); border: var(--border-w) solid var(--c-bad); background: var(--c-surface); color: var(--c-bad); font-size: var(--fs-sm); }
.ed__identity { display: flex; align-items: start; justify-content: space-between; gap: var(--sp-5); }
.ed__identity h1 { font-size: var(--fs-work-title); margin-top: var(--sp-2); overflow-wrap: anywhere; }
.ed__description { margin-top: var(--sp-3); max-width: var(--content-narrow); font-size: var(--fs-sm); color: var(--c-text-muted); overflow-wrap: anywhere; }
.ed__progress { margin-top: var(--sp-3); font-size: var(--fs-sm); color: var(--c-text-muted); }
.ed__layout { display: grid; grid-template-columns: minmax(0, .4fr) minmax(0, 1fr); gap: var(--sp-6); align-items: start; }
.ed__sidebar { position: sticky; top: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-4); max-height: calc(100dvh - var(--sp-7)); min-width: 0; }
.ed__mobile-select { display: none; }
/* Linka nad seznamem je táž jako nad knihovnou a nad výsledky. Sedí na
   okraji rolovacího boxu, takže se neodroluje pryč. */
.questions { list-style: none; padding: var(--sp-1); margin: calc(-1 * var(--sp-1)); overflow-y: auto; min-height: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.questions li:first-child .question { border-top: 0; }
.question { display: flex; gap: var(--sp-3); width: 100%; padding: var(--sp-4) var(--sp-3); border: 0; border-top: var(--border-w) solid var(--c-border-soft); border-left: var(--border-w-strong) solid transparent; background: transparent; color: var(--c-text); text-align: left; }
.question:hover { background: var(--c-bg-active); }
.question[aria-current] { border-left-color: var(--c-brand); background: var(--c-bg-active); }
.question__num { font-weight: 900; font-size: var(--fs-sm); color: var(--c-brand); font-variant-numeric: tabular-nums; }
.question__copy { display: grid; gap: var(--sp-2); min-width: 0; overflow-wrap: anywhere; }
.question__prompt { font-size: var(--fs-sm); font-weight: 700; line-height: var(--lh-snug); }
.question__answer, .question__todo, .question__image { font-size: var(--fs-xs); color: var(--c-text-muted); }
.question__todo { color: var(--c-bad); }
.question__image { display: flex; gap: var(--sp-2); align-items: center; }
.sheet { min-width: 0; padding: var(--sp-5); background: var(--c-surface); border-top: var(--border-w-strong) solid var(--c-brand); }
.sheet__head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); flex-wrap: wrap; margin-bottom: var(--sp-5); }
.sheet__head h2 { font-size: var(--fs-xl); }
.sheet__head h2 span { color: var(--c-text-muted); font-size: var(--fs-sm); font-weight: 400; }
.sheet__tools { display: flex; gap: var(--sp-2); align-items: center; }
.hint { font-size: var(--fs-sm); color: var(--c-text-muted); }
@media (max-width: 960px) { .ed__layout { gap: var(--sp-4); grid-template-columns: minmax(0, .5fr) minmax(0, 1fr); } }
@media (max-width: 720px) { .ed__identity { flex-direction: column; } .ed__layout { grid-template-columns: minmax(0, 1fr); } .ed__sidebar { position: static; max-height: none; } .ed__mobile-select { display: grid; } .questions { display: none; } .sheet { padding: var(--sp-4); } }
@media (pointer: coarse) { .question { min-height: var(--control-touch); } }
</style>
