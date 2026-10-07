<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import PresentationBar from '@/components/PresentationBar.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import VyslechSetup from '@/vyslech/components/VyslechSetup.vue'
import VyslechStage from '@/vyslech/components/VyslechStage.vue'
import { db } from '@/lib/db'
import { vyslechDbWhenReady } from '@/lib/vyslechDb'
import { downloadVyslechCsv } from '@/vyslech/csv'
import { initVyslechForms, reloadVyslechForms, vyslechForms } from '@/stores/vyslechForms'
import {
  attachRun,
  closeRun,
  closing,
  detachRun,
  discardRun,
  hasRun,
  responseCount,
  run,
  saveReport,
  startRun,
} from '@/stores/vyslechHost'
import { settings } from '@/stores/settings'
import { confirmAction, toast } from '@/stores/ui'
import type { VyslechForm, VyslechRunMeta } from '@/vyslech/types'

/**
 * Výslech: příprava a plátno.
 *
 * Celé je za heslem. Sady otázek i výsledky čte jen správa a sběr se
 * otevírá z téže relace, takže heslo chrání všechno najednou.
 */
const router = useRouter()
const unlocked = ref(db().isUnlocked())
const starting = ref(false)
/** Dostanou se ke sběru telefony v sále? Bez sdílené databáze ne. */
const shared = ref(true)
const ready = ref(false)

async function onUnlocked(): Promise<void> {
  unlocked.value = true
  await reloadVyslechForms()
}

function lock(): void {
  db().lock()
  unlocked.value = false
}

async function onStart(form: VyslechForm, meta: VyslechRunMeta): Promise<void> {
  if (starting.value) return
  starting.value = true
  try {
    await startRun(form, meta)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Sběr se nepodařilo otevřít.', 'bad')
  } finally {
    starting.value = false
  }
}

async function onClose(): Promise<void> {
  const n = responseCount.value
  const ok = await confirmAction({
    title: 'Ukončit sběr',
    text: n
      ? 'Telefony přestanou přijímat odpovědi a výsledky se uloží. Kdo ještě vyplňuje, už neodešle.'
      : 'Zatím nikdo neodpověděl. Sběr se zavře a nic se neuloží.',
    confirmLabel: 'Ukončit sběr',
    danger: true,
  })
  if (!ok) return
  try {
    await closeRun()
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Sběr se nepodařilo ukončit.', 'bad')
  }
}

/** Zrušit otevřený sběr bez vyhodnocení. Tudy se odchází po omylu. */
async function onDiscard(): Promise<void> {
  const open = run.value?.phase === 'open'
  const unsaved = run.value?.phase === 'closed' && run.value.report && !run.value.reportSaved
  if (open || unsaved) {
    const ok = await confirmAction({
      title: open ? 'Zrušit sběr' : 'Zahodit neuložené výsledky',
      text: open
        ? 'Sběr se zavře a odpovědi se smažou bez uložení. Vrátit to nejde.'
        : 'Výsledky se neuložily. Když teď odejdeš, ztratí se. Stáhni si napřed tabulku.',
      confirmLabel: open ? 'Zrušit sběr' : 'Zahodit',
      danger: true,
    })
    if (!ok) return
  }
  await discardRun()
}

async function onRetrySave(): Promise<void> {
  const ok = await saveReport()
  toast(ok ? 'Výsledky jsou uložené.' : 'Pořád se to nepovedlo. Stáhni si tabulku.', ok ? 'ok' : 'bad')
}

function onDownload(): void {
  if (run.value?.report) downloadVyslechCsv(run.value.report)
}

async function onResults(): Promise<void> {
  const reportId = run.value?.report?.id
  await discardRun()
  void router.push({ name: 'vyslech-vysledky', query: reportId ? { id: reportId } : {} })
}

/** Mezerník ukončí sběr, s potvrzením. Omylem ukončený sběr nejde vrátit. */
function onKey(e: KeyboardEvent): void {
  if (run.value?.phase !== 'open') return
  const target = e.target as HTMLElement | null
  if (target && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    void onClose()
  }
}

const barHint = computed(() => {
  if (run.value?.phase !== 'open') return ''
  return 'Mezerník ukončí sběr'
})

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  const conn = await vyslechDbWhenReady()
  shared.value = conn?.shared ?? false
  ready.value = true
  if (!conn) return
  if (unlocked.value) void initVyslechForms()
  // Po obnovení stránky se listener odpovědí musí nasadit znovu.
  void attachRun()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  detachRun()
})
</script>

<template>
  <div class="vyslech" :class="{ 'vyslech--live': hasRun }">
    <template v-if="!unlocked">
      <AppHeader game="vyslech" section="play" prep />
      <AdminGate
        title="Výslech"
        lead="Zpětná vazba je za heslem do správy. Jsou v ní hodnocení školení a lektorů."
        @unlocked="onUnlocked"
      />
    </template>

    <template v-else-if="!hasRun || !run">
      <AppHeader game="vyslech" section="play" prep>
        <template #tools>
          <!-- Jediná akce účtu, proto rovnou tlačítko, ne nabídka s jednou položkou. -->
          <UiIconButton icon="lock" label="Zamknout Výslech" @click="lock" />
        </template>
      </AppHeader>

      <main v-if="!ready" id="obsah" class="page wait"><UiSkeleton :lines="5" /></main>
      <main v-else-if="vyslechForms.unavailable" id="obsah" class="page wait">
        <UiEmpty
          icon="warning"
          title="Výslech teď nepojede"
          text="Nepodařilo se spojit se sdílenou databází, a bez ní se telefony nemají kam připojit. Zkontroluj připojení a načti stránku znovu."
        />
      </main>
      <VyslechSetup v-else :busy="starting" :shared="shared" @start="onStart" />
    </template>

    <template v-else>
      <PresentationBar
        title="Výslech"
        :hint="barHint"
        :end-label="run.phase === 'open' ? 'Zrušit sběr bez uložení' : 'Zavřít'"
        @end="onDiscard"
      >
        <template v-if="run.phase === 'open'" #menu="{ close }">
          <button type="button" role="menuitem" @click="close(); onClose()">Ukončit sběr a uložit</button>
        </template>
      </PresentationBar>

      <!-- Herní plocha: tady platí nastavení velikosti písma, promítá se. -->
      <main id="obsah" class="surface game-surface" :style="{ '--scale': String(settings.scale) }">
        <VyslechStage
          :code="run.code"
          :title="run.meta.title"
          :questions="run.questions"
          :count="responseCount"
          :phase="run.phase"
          :closing="closing"
          :has-report="run.report !== null"
          :report-saved="run.reportSaved"
          @close="onClose"
          @results="onResults"
          @again="onDiscard"
          @retry-save="onRetrySave"
          @download="onDownload"
        />
      </main>
    </template>
  </div>
</template>

<style scoped>
.vyslech { min-height: 100dvh; display: flex; flex-direction: column; }
/* Běžící sběr drží všechno na jedné obrazovce, na projektoru se nescrolluje. */
.vyslech--live { height: 100dvh; overflow: hidden; }
.surface { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.surface > * { flex: 1; min-height: 0; }
.wait { max-width: var(--content-reading); padding-block: var(--sp-6) var(--sp-8); }

@media (max-height: 560px), (max-width: 560px) {
  .vyslech--live { height: auto; overflow: visible; }
}
</style>
