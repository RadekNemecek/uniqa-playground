<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import QuizPackEditor from '@/games/kviz/components/QuizPackEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import { db } from '@/lib/db'
import { downloadQuizPack, readQuizPackFile } from '@/games/kviz/packIo'
import {
  createDemoQuizPack,
  createQuizPack,
  deleteQuizPack,
  duplicateQuizPack,
  initQuizPacks,
  quizPackProgress,
  reloadQuizPacks,
  quizPackReadiness,
  quizPacks,
  saveQuizPack,
} from '@/stores/quizPacks'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'

const route = useRoute()
const router = useRouter()

const unlocked = ref(db().isUnlocked())
const fileInput = ref<HTMLInputElement | null>(null)

/** Po odemčení se musí sledování nasadit znovu: listener, který
 *  Firestore zamítl, už nic nepošle. */
async function onUnlocked(): Promise<void> {
  unlocked.value = true
  await reloadQuizPacks()
}

onMounted(() => {
  void initQuizPacks()
})

const currentId = computed(() => {
  const raw = route.query.pack
  return typeof raw === 'string' ? raw : ''
})

const current = computed(() => quizPacks.packs.find((p) => p.id === currentId.value))

// Smazaný balíček nesmí nechat viset otevřený editor.
watch([() => quizPacks.packs, currentId], () => {
  if (!currentId.value) return
  if (!quizPacks.packs.some((p) => p.id === currentId.value)) {
    void router.replace({ name: 'kviz-otazky', query: {} })
  }
})

function openPack(id: string): void {
  void router.push({ name: 'kviz-otazky', query: { pack: id } })
}

function closePack(): void {
  void router.push({ name: 'kviz-otazky', query: {} })
}

async function onCreate(): Promise<void> {
  const pack = await createQuizPack()
  toast('Balíček založen. Pojmenuj ho a vyplň otázky.', 'ok')
  openPack(pack.id)
}

async function onCreateDemo(): Promise<void> {
  const pack = await createDemoQuizPack()
  toast('Ukázkový kvíz založen. Klidně ho přepiš vlastními otázkami.', 'ok')
  openPack(pack.id)
}

async function onDuplicate(id?: string): Promise<void> {
  const source = id ? quizPacks.packs.find((p) => p.id === id) : current.value
  if (!source) return
  const copy = await duplicateQuizPack(source)
  toast('Kopie vytvořena.', 'ok')
  openPack(copy.id)
}

async function onRemove(id?: string): Promise<void> {
  const target = id ? quizPacks.packs.find((p) => p.id === id) : current.value
  if (!target) return
  const ok = await confirmAction({
    title: 'Smazat balíček',
    text: `Balíček „${target.name}" se smaže i se všemi otázkami. Vrátit to nejde.`,
    confirmLabel: 'Smazat balíček',
    danger: true,
  })
  if (!ok) return
  const name = target.name
  await deleteQuizPack(target.id)
  toast(`Balíček „${name}" smazán.`, 'ok')
  if (currentId.value === target.id) closePack()
}

async function onExport(id: string): Promise<void> {
  const pack = quizPacks.packs.find((p) => p.id === id)
  if (!pack) return
  await downloadQuizPack(pack)
  toast('Balíček stažen jako JSON.', 'ok')
}

function triggerImport(): void {
  fileInput.value?.click()
}

/**
 * Balíčky se dovážejí po dávkách, typicky celá převedená sada naráz.
 * Do editoru se otevře jen jediný importovaný balíček: po dávce se jde
 * zpátky do knihovny, kde je vidět, co všechno dorazilo.
 */
async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  const added: string[] = []
  const failed: string[] = []
  for (const file of files) {
    try {
      const pack = await readQuizPackFile(file)
      await saveQuizPack(pack)
      added.push(pack.id)
    } catch (e) {
      failed.push(e instanceof Error ? e.message : file.name)
    }
  }

  if (added.length === 1 && failed.length === 0) {
    const pack = quizPacks.packs.find((p) => p.id === added[0])
    toast(`Balíček „${pack?.name ?? ''}" importován.`, 'ok')
    openPack(added[0]!)
    return
  }
  if (added.length > 0) toast(`Importováno ${count(added.length, 'balíček', 'balíčky', 'balíčků')}.`, 'ok')
  if (failed.length > 0) {
    toast(
      failed.length === 1
        ? failed[0]!
        : `${count(failed.length, 'balíček', 'balíčky', 'balíčků')} se nepovedlo načíst.`,
      'bad',
    )
  }
}

function lock(): void {
  db().lock()
  unlocked.value = false
  closePack()
}

function badge(id: string): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  const pack = quizPacks.packs.find((p) => p.id === id)
  if (!pack) return { text: '', tone: 'muted' }
  const readiness = quizPackReadiness(pack)
  if (readiness === 'ready') return { text: 'Připravený', tone: 'ok' }
  if (readiness === 'draft') return { text: 'Doplnit', tone: 'warn' }
  return { text: 'Prázdný', tone: 'muted' }
}
</script>

<template>
  <div class="admin">
    <template v-if="!unlocked">
      <AppHeader game="kviz" section="questions" />
      <AdminGate @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="kviz" section="questions">
        <template #tools>
          <UiMenu label="Účet správy" v-slot="{ close }">
            <button type="button" role="menuitem" @click="lock(); close()">Zamknout</button>
          </UiMenu>
        </template>
      </AppHeader>

      <main id="obsah" class="admin__body page">
        <!-- Knihovna -------------------------------------------------------- -->
        <section v-if="!current" class="library">
          <header class="library__head">
            <div>
              <p class="eyebrow">Na kolik to dáš?</p>
              <h1 class="library__title">Balíčky otázek</h1>
              <p class="library__lead">
                Otázka se čtyřmi možnostmi, nebo tvrzení na pravda a nepravda.
                Kvíz má vlastní balíčky, s deskou Pojišťuj! se nemíchají.
              </p>
            </div>
            <div class="library__actions">
              <UiButton size="sm" variant="ghost" @click="triggerImport">Importovat</UiButton>
              <UiButton size="sm" variant="brand" @click="onCreate">Nový</UiButton>
            </div>
          </header>

          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            multiple
            class="library__file"
            @change="onImportFile"
          />

          <!-- Dokud data nedorazila, není pravda, že tu nic není. -->
          <UiSkeleton v-if="!quizPacks.loaded" :lines="4" />

          <UiEmpty
            v-else-if="quizPacks.packs.length === 0"
            icon="info"
            title="Zatím tu není žádný balíček"
            text="Založ prázdný tlačítkem Nový, naimportuj JSON, nebo si napřed prohlédni ukázku."
          >
            <UiButton size="sm" variant="ghost" @click="onCreateDemo">
              Vytvořit ukázkový kvíz
            </UiButton>
          </UiEmpty>

          <ul v-else class="library__items">
            <li v-for="p in quizPacks.packs" :key="p.id" class="card">
              <button type="button" class="card__main" @click="openPack(p.id)">
                <span class="card__name">{{ p.name }}</span>
                <span class="card__badge" :class="`card__badge--${badge(p.id).tone}`">
                  {{ badge(p.id).text }}
                </span>
                <span class="card__meta">
                  {{ quizPackProgress(p).done }} z {{ quizPackProgress(p).total }} otázek hotových
                </span>
                <span class="card__bar" aria-hidden="true">
                  <span
                    :style="{
                      width: `${quizPackProgress(p).total ? (quizPackProgress(p).done / quizPackProgress(p).total) * 100 : 0}%`,
                    }"
                  />
                </span>
              </button>

              <UiMenu label="Akce balíčku" v-slot="{ close }">
                <button type="button" role="menuitem" @click="openPack(p.id); close()">Otevřít</button>
                <button type="button" role="menuitem" @click="onDuplicate(p.id); close()">Duplikovat</button>
                <button type="button" role="menuitem" @click="void onExport(p.id); close()">Exportovat JSON</button>
                <hr />
                <button type="button" role="menuitem" class="danger" @click="onRemove(p.id); close()">Smazat</button>
              </UiMenu>
            </li>
          </ul>
        </section>

        <!-- Editor ---------------------------------------------------------- -->
        <QuizPackEditor
          v-else-if="current"
          :key="current.id"
          :pack="current"
          @back="closePack"
          @duplicate="onDuplicate()"
          @remove="onRemove()"
        />
      </main>
    </template>
  </div>
</template>

<style scoped>
.admin { min-height: 100dvh; }
.admin__body { padding-block: var(--sp-5) var(--sp-8); }

.library { display: grid; gap: var(--sp-5); align-content: start; max-width: 40rem; }
.library__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
}
.library__title { font-size: var(--fs-2xl); margin-top: var(--sp-1); }
.library__lead {
  margin-top: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
  line-height: var(--lh-body);
  max-width: 28rem;
}
.library__actions { display: flex; gap: var(--sp-2); }
.library__file { display: none; }
.library__blank { display: grid; gap: var(--sp-3); max-width: 28rem; }
.library__empty { font-size: var(--fs-sm); color: var(--c-text-faint); line-height: var(--lh-body); }

.library__items { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }

.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sp-2);
  align-items: stretch;
  padding: var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.card:hover { border-color: var(--c-surface-3); }

.card__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name badge'
    'meta meta'
    'bar bar';
  gap: var(--sp-1) var(--sp-3);
  text-align: left;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text);
}
.card__main:hover { background: color-mix(in oklab, var(--c-brand) 7%, transparent); }
.card__name { grid-area: name; font-weight: 700; font-size: var(--fs-md); }
.card__badge {
  grid-area: badge;
  align-self: start;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-full);
  font-size: var(--fs-xs);
  font-weight: 700;
  background: var(--c-surface-2);
  color: var(--c-text-faint);
}
.card__badge--ok { background: color-mix(in oklab, var(--c-ok) 22%, transparent); color: var(--c-ok); }
.card__badge--warn { background: color-mix(in oklab, var(--c-brand) 18%, transparent); color: var(--c-brand); }
.card__meta { grid-area: meta; font-size: var(--fs-xs); color: var(--c-text-faint); }
.card__bar {
  grid-area: bar;
  display: block;
  height: 3px;
  border-radius: var(--r-full);
  background: var(--c-sunken);
  overflow: hidden;
  margin-top: var(--sp-1);
}
.card__bar span {
  display: block;
  height: 100%;
  background: var(--c-brand);
  transition: width var(--dur-base) var(--ease-out);
}

</style>
