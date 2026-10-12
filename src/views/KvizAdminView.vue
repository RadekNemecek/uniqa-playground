<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import QuizPackEditor from '@/games/kviz/components/QuizPackEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import {
  createDemoQuizPack,
  createFamilyQuizPack,
  createGeneralQuizPack,
  createQuizPack,
  deleteQuizPack,
  duplicateQuizPack,
  initQuizPacks,
  quizPackProgress,
  reloadQuizPacks,
  quizPackReadiness,
  quizPacks,
} from '@/stores/quizPacks'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'

const route = useRoute()
const router = useRouter()

const creating = ref(false)
/** Rodinný kvíz se zakládá chvíli, kresby se převádějí na obrázky. */
const creatingFamily = ref(false)
const packEditor = ref<InstanceType<typeof QuizPackEditor> | null>(null)

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

async function onCreateGeneral(): Promise<void> {
  const pack = await createGeneralQuizPack()
  toast('Kvíz ze všeobecných znalostí založen.', 'ok')
  openPack(pack.id)
}

async function onCreateFamily(): Promise<void> {
  if (creatingFamily.value) return
  creatingFamily.value = true
  try {
    const pack = await createFamilyQuizPack()
    toast('Rodinný kvíz založen, i s obrázky.', 'ok')
    openPack(pack.id)
  } catch {
    toast('Rodinný kvíz se nepodařilo založit. Zkus to znovu.', 'bad')
  } finally {
    creatingFamily.value = false
  }
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
    <AppHeader game="kviz" section="questions" prep />

    <main id="obsah" class="admin__body page page-sheet">
      <!-- Knihovna -------------------------------------------------------- -->
      <section v-if="!current" class="library">
        <header class="library__head">
          <div>
            <p class="eyebrow">Knihovna týmu</p>
            <h1 class="library__title">Otázky do hry.</h1>
            <p class="library__lead">
              Balíčky pro kvíz Na kolik to dáš? Vyber balíček a uprav jeho otázky.
            </p>
          </div>
          <div class="library__actions">
            <UiButton size="sm" variant="brand" :loading="creating" @click="onCreate">Nový balíček</UiButton>
            <UiMenu label="Hotové balíčky" v-slot="{ close }">
              <button type="button" role="menuitem" @click="onCreateDemo(); close()">
                Ukázkový kvíz
              </button>
              <button type="button" role="menuitem" :disabled="creatingFamily" @click="onCreateFamily(); close()">
                Rodinný kvíz
              </button>
              <button type="button" role="menuitem" @click="onCreateGeneral(); close()">
                Všeobecné znalosti
              </button>
            </UiMenu>
          </div>
        </header>

        <!-- Dokud data nedorazila, není pravda, že tu nic není. -->
        <UiSkeleton v-if="!quizPacks.loaded" :lines="4" />

        <UiEmpty v-else-if="quizPacks.denied" title="Balíčky se nepodařilo načíst" text="Zkontroluj připojení a zkus to znovu.">
          <UiButton variant="brand" @click="reloadQuizPacks">Zkusit znovu</UiButton>
        </UiEmpty>

        <UiEmpty
          v-else-if="quizPacks.packs.length === 0"
          icon="info"
          title="Zatím tu není žádný balíček"
          text="Založ prázdný tlačítkem Nový balíček, nebo si napřed prohlédni některý hotový."
        >
          <UiButton size="sm" variant="ghost" @click="onCreateDemo">
            Vytvořit ukázkový kvíz
          </UiButton>
          <UiButton size="sm" variant="ghost" :loading="creatingFamily" @click="onCreateFamily">
            Vytvořit rodinný kvíz
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="onCreateGeneral">
            Vytvořit všeobecný kvíz
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
