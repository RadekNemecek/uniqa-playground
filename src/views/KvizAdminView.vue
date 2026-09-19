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
const creating = ref(false)
const packEditor = ref<InstanceType<typeof QuizPackEditor> | null>(null)
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
  if (creating.value) return
  creating.value = true
  try {
    const pack = await createQuizPack()
    toast('Balíček založen. Pojmenuj ho a vyplň otázky.', 'ok')
    openPack(pack.id)
  } catch {
    toast('Balíček se nepodařilo založit. Zkus to znovu.', 'bad')
  } finally {
    creating.value = false
  }
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

async function lock(): Promise<void> {
  if (packEditor.value && !await packEditor.value.flush()) return
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
      <AppHeader game="kviz" section="questions" prep />
      <AdminGate @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="kviz" section="questions" prep>
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
              <p class="eyebrow">Tvoje knihovna</p>
              <h1 class="library__title">Otázky do hry.</h1>
              <p class="library__lead">
                Balíčky pro kvíz Na kolik to dáš? Vyber balíček a uprav jeho otázky.
              </p>
            </div>
            <div class="library__actions">
              <UiButton size="sm" variant="ghost" @click="triggerImport">Importovat</UiButton>
              <UiButton size="sm" variant="brand" :loading="creating" @click="onCreate">Nový balíček</UiButton>
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

          <UiEmpty v-else-if="quizPacks.denied" title="Balíčky se nepodařilo načíst" text="Zkontroluj připojení a zkus to znovu.">
            <UiButton variant="brand" @click="reloadQuizPacks">Zkusit znovu</UiButton>
          </UiEmpty>

          <UiEmpty
            v-else-if="quizPacks.packs.length === 0"
            icon="info"
            title="Zatím tu není žádný balíček"
            text="Založ prázdný tlačítkem Nový balíček, naimportuj JSON, nebo si napřed prohlédni ukázku."
          >
            <UiButton size="sm" variant="ghost" @click="onCreateDemo">
              Vytvořit ukázkový kvíz
            </UiButton>
          </UiEmpty>

          <ul v-else class="library__items">
            <li v-for="(p, i) in quizPacks.packs" :key="p.id" class="card">
              <span class="card__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <button type="button" class="card__main" @click="openPack(p.id)">
                <span class="card__name">{{ p.name }}</span>
                <span class="card__badge" :class="`card__badge--${badge(p.id).tone}`">
                  {{ badge(p.id).text }}
                </span>
                <span class="card__meta">
                  {{ quizPackProgress(p).done }} z {{ quizPackProgress(p).total }} otázek hotových
                </span>
                <span v-if="quizPackProgress(p).done < quizPackProgress(p).total" class="card__remaining">
                  Zbývá doplnit {{ count(quizPackProgress(p).total - quizPackProgress(p).done, 'otázku', 'otázky', 'otázek') }}
                </span>
              </button>

              <UiMenu :label="`Akce balíčku ${p.name}`" v-slot="{ close }">
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
          ref="packEditor"
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
.admin { display: flex; flex-direction: column; }
.admin__body { padding-block: var(--sp-6) var(--sp-8); }
.library { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; }
.library__head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--sp-5); }
.library__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.library__lead { margin-top: var(--sp-3); color: var(--c-text-muted); font-size: var(--fs-sm); }
.library__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; }
.library__file { display: none; }
.library__items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.card__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.card__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); padding: var(--sp-2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); text-align: left; }
.card__main:hover { background: var(--c-bg-active); }
.card__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.card__meta { grid-column: 1; font-size: var(--fs-sm); color: var(--c-text-muted); }
.card__remaining { grid-column: 1 / -1; font-size: var(--fs-sm); }
.card__badge { align-self: center; font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-muted); }
.card__badge--ok { color: var(--c-ok); }
@media (max-width: 720px) { .card { gap: var(--sp-3); } .card__main { grid-template-columns: minmax(0, 1fr); } .card__badge { grid-row: 3; } .card__name { font-size: var(--fs-lg); } }
@media (pointer: coarse) { .card__main { min-height: var(--control-touch); } }
</style>
