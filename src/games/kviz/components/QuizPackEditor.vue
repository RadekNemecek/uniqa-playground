<script setup lang="ts">
import { computed, nextTick, ref, toRaw, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import QuizItemEditor from './QuizItemEditor.vue'
import { db } from '@/lib/db'
import { clone } from '@/lib/clone'
import { emptyQuizItem, isItemReady, quizPackProgress } from '@/stores/quizPacks'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'
import { downloadQuizPack } from '../packIo'
import { BOOLEAN_LABELS, kindOf, quizOption } from '../options'
import type { QuizPack } from '../types'
import UiIcon from '@/components/ui/UiIcon.vue'

/** Strop je tu proto, aby se balíček vešel do jednoho dokumentu a aby se
 *  dal ještě rozumně projít očima. Sto otázek je víc než dost na školení. */
const MAX_ITEMS = 100

const props = defineProps<{ pack: QuizPack }>()
const emit = defineEmits<{ duplicate: []; remove: []; back: [] }>()

const draft = ref<QuizPack>(clone(toRaw(props.pack)))
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
const conflict = ref(false)
const openId = ref<string | null>(null)

let lastWrittenAt = props.pack.updatedAt
let timer = 0

const progress = computed(() => quizPackProgress(draft.value))
const canAdd = computed(() => draft.value.items.length < MAX_ITEMS)

watch(
  () => props.pack.id,
  () => {
    draft.value = clone(toRaw(props.pack))
    lastWrittenAt = props.pack.updatedAt
    conflict.value = false
    saveState.value = 'idle'
    openId.value = null
  },
)

// Balíček je jeden dokument, takže při souběžné editaci vyhraje poslední
// zápis. Upozornit na to je to nejmenší, co se dá udělat.
watch(
  () => props.pack.updatedAt,
  (at) => {
    if (at !== lastWrittenAt) conflict.value = true
  },
)

function reloadFromSource(): void {
  draft.value = clone(toRaw(props.pack))
  lastWrittenAt = props.pack.updatedAt
  conflict.value = false
  toast('Balíček načten znovu.', 'ok')
}

// Ukládá se samo, aby se nedalo odejít s neuloženou otázkou. Prodleva
// sráží počet zápisů při psaní.
watch(
  draft,
  () => {
    saveState.value = 'saving'
    window.clearTimeout(timer)
    timer = window.setTimeout(flush, 600)
  },
  { deep: true },
)

async function flush(): Promise<void> {
  const at = Date.now()
  lastWrittenAt = at
  try {
    await db().saveQuizPack({ ...clone(toRaw(draft.value)), updatedAt: at })
    saveState.value = 'saved'
  } catch (e) {
    saveState.value = 'idle'
    toast('Uložení se nepovedlo.', 'bad')
    console.error(e)
  }
}

async function addItem(): Promise<void> {
  if (!canAdd.value) return
  const item = emptyQuizItem()
  draft.value.items.push(item)
  openId.value = item.id
  await nextTick()
  document.getElementById(`q-${item.id}`)?.scrollIntoView({ block: 'center' })
}

async function removeItem(id: string): Promise<void> {
  const at = draft.value.items.findIndex((q) => q.id === id)
  if (at < 0) return
  const item = draft.value.items[at]!
  if (isItemReady(item)) {
    const ok = await confirmAction({
      title: 'Smazat otázku',
      text: 'Otázka se smaže i s možnostmi. Vrátit to nejde.',
      confirmLabel: 'Smazat',
      danger: true,
    })
    if (!ok) return
  }
  draft.value.items.splice(at, 1)
  if (openId.value === id) openId.value = null
}

function move(id: string, by: number): void {
  const at = draft.value.items.findIndex((q) => q.id === id)
  const to = at + by
  if (at < 0 || to < 0 || to >= draft.value.items.length) return
  const [item] = draft.value.items.splice(at, 1)
  draft.value.items.splice(to, 0, item!)
}

function toggle(id: string): void {
  openId.value = openId.value === id ? null : id
}

/** Náhled správné odpovědi do sbaleného řádku. U tvrzení je to slovo,
 *  ne text možnosti: ty se u něj nečtou. */
function correctText(id: string): string {
  const item = draft.value.items.find((q) => q.id === id)
  if (!item) return ''
  if (kindOf(item) === 'boolean') return BOOLEAN_LABELS[item.correctIndex] ?? ''
  return item.options[item.correctIndex]?.trim() ?? ''
}

function exportPack(): void {
  downloadQuizPack(clone(toRaw(draft.value)))
  toast('Balíček stažen jako JSON.', 'ok')
}
</script>

<template>
  <section class="ed">
    <header class="ed__head">
      <button type="button" class="ed__back" @click="emit('back')">
        <UiIcon name="chevron-left" size="sm" />
        Balíčky
      </button>

      <div class="ed__state" :data-state="saveState">
        <span v-if="saveState === 'saving'">Ukládám…</span>
        <span v-else-if="saveState === 'saved'" class="ed__saved">Uloženo</span>
      </div>

      <UiMenu label="Akce balíčku" v-slot="{ close }">
        <button type="button" role="menuitem" @click="exportPack(); close()">Stáhnout jako JSON</button>
        <button type="button" role="menuitem" @click="emit('duplicate'); close()">Duplikovat</button>
        <button type="button" role="menuitem" @click="emit('remove'); close()">Smazat balíček</button>
      </UiMenu>
    </header>

    <p v-if="conflict" class="conflict">
      Balíček mezitím změnil někdo jiný. Tvoje úpravy tu pořád jsou, ale při
      uložení cizí změny přepíšou.
      <button type="button" @click="reloadFromSource">Načíst znovu</button>
    </p>

    <div class="ed__id">
      <input v-model="draft.name" class="ed__name" type="text" aria-label="Název balíčku" placeholder="Název balíčku" maxlength="60" />
      <input v-model="draft.description" class="ed__desc" type="text" aria-label="Popis balíčku" placeholder="K čemu balíček slouží, pro koho je" maxlength="160" />
    </div>

    <div class="bar">
      <div class="bar__track">
        <div class="bar__fill" :style="{ transform: `scaleX(${progress.total ? progress.done / progress.total : 0})` }" />
      </div>
      <p class="bar__num">
        {{ progress.done }} z {{ progress.total }} otázek hotových
      </p>
    </div>

    <ol class="list">
      <li v-for="(item, i) in draft.items" :key="item.id" :id="`q-${item.id}`" class="qrow" :class="{ 'qrow--open': openId === item.id }">
        <div class="qrow__head">
          <button type="button" class="qrow__toggle" :aria-expanded="openId === item.id" @click="toggle(item.id)">
            <span class="qrow__num">{{ i + 1 }}</span>
            <span class="qrow__text">
              <span v-fit-text class="qrow__prompt">{{ item.prompt.trim() || 'Nová otázka' }}</span>
              <span v-if="isItemReady(item)" v-fit-text class="qrow__answer">
                <span class="qrow__letter" :style="{ color: `var(${quizOption(item.correctIndex).color.cssVar})` }">
                  {{ quizOption(item.correctIndex).letter }}
                </span>
                {{ correctText(item.id) }}
              </span>
              <span v-else class="qrow__todo">
                {{ kindOf(item) === 'boolean' ? 'Chybí znění tvrzení' : 'Chybí znění nebo možnosti' }}
              </span>
            </span>
          </button>

          <div class="qrow__tools">
            <button type="button" :disabled="i === 0" :aria-label="`Posunout otázku ${i + 1} nahoru`" @click="move(item.id, -1)">
              <UiIcon name="chevron-up" size="sm" />
            </button>
            <button type="button" :disabled="i === draft.items.length - 1" :aria-label="`Posunout otázku ${i + 1} dolů`" @click="move(item.id, 1)">
              <UiIcon name="chevron-down" size="sm" />
            </button>
          </div>
        </div>

        <QuizItemEditor
          v-if="openId === item.id"
          :item="item"
          @collapse="openId = null"
          @remove="removeItem(item.id)"
        />
      </li>
    </ol>

    <footer class="ed__foot">
      <UiButton variant="brand" :disabled="!canAdd" @click="addItem">Přidat otázku</UiButton>
      <p v-if="!canAdd" class="hint">Víc než {{ count(MAX_ITEMS, 'otázka', 'otázky', 'otázek') }} se do balíčku nevejde.</p>
    </footer>
  </section>
</template>

<style scoped>
.ed { display: grid; gap: var(--sp-4); align-content: start; }

.ed__head { display: flex; align-items: center; gap: var(--sp-3); }
.ed__back {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.ed__back:hover { color: var(--c-text); }
.ed__state { margin-left: auto; font-size: var(--fs-xs); color: var(--c-text-faint); }
.ed__saved { color: var(--c-ok); }

.conflict {
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid color-mix(in oklab, var(--c-bad) 45%, transparent);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-bad) 10%, transparent);
  font-size: var(--fs-sm);
  line-height: var(--lh-body);
}
.conflict button {
  margin-left: var(--sp-2);
  border: 0;
  background: transparent;
  color: var(--c-brand);
  font-weight: 700;
  text-decoration: underline;
}

.ed__id { display: grid; gap: var(--sp-2); }
.ed__name,
.ed__desc {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text);
  transition: var(--tr-surface);
}
.ed__name { font-size: var(--fs-2xl); font-weight: 800; letter-spacing: -0.02em; }
.ed__desc { font-size: var(--fs-sm); color: var(--c-text-muted); }
.ed__name:hover, .ed__desc:hover { border-color: var(--c-line-soft); }
.ed__name:focus, .ed__desc:focus { border-color: var(--c-brand); background: var(--c-sunken); }
.ed__name::placeholder, .ed__desc::placeholder { color: var(--c-text-faint); }

.bar { display: flex; align-items: center; gap: var(--sp-3); }
.bar__track {
  flex: 1;
  height: 0.4rem;
  border-radius: var(--r-full);
  background: var(--c-sunken);
  overflow: hidden;
}
.bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-brand-deep), var(--c-brand));
  transform-origin: left center;
  transition: transform var(--dur-base) var(--ease-out);
}
.bar__num { flex: none; font-size: var(--fs-xs); color: var(--c-text-faint); font-variant-numeric: tabular-nums; }

/* Seznam otázek ------------------------------------------------------------ */
.list { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.qrow {
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.qrow:hover { border-color: var(--c-surface-3); }
.qrow--open { border-color: var(--c-brand); }

.qrow__head { display: flex; align-items: stretch; gap: var(--sp-2); }
.qrow__toggle {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-3) var(--sp-4);
  border: 0;
  background: transparent;
  color: var(--c-text);
  text-align: left;
}
.qrow__num {
  flex: none;
  min-width: 1.5rem;
  font-weight: 800;
  color: var(--c-text-faint);
  font-variant-numeric: tabular-nums;
}
.qrow__text { display: grid; gap: var(--sp-1); min-width: 0; }
.qrow__prompt {
  font-weight: 600;
  line-height: var(--lh-snug);
  font-size: calc(1em * var(--fit-text, 1));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.qrow__answer { font-size: calc(var(--fs-xs) * var(--fit-text, 1)); color: var(--c-text-muted); }
.qrow__letter { font-family: var(--font-display); font-weight: 900; margin-right: var(--sp-1); }
.qrow__todo { font-size: var(--fs-xs); color: var(--c-text-faint); }

.qrow__tools { display: flex; flex-direction: column; justify-content: center; gap: var(--sp-1); padding-right: var(--sp-3); }
.qrow__tools button {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.6rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
}
.qrow__tools button:hover:not(:disabled) { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface-2); }
.qrow__tools button:disabled { opacity: 0.3; cursor: not-allowed; }

.ed__foot { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }
.hint { font-size: var(--fs-xs); color: var(--c-text-faint); }

@media (pointer: coarse) {
  .ed__back { min-height: var(--control-touch); }
  .qrow__tools button { width: var(--control-touch); height: 32px; }
}
</style>
