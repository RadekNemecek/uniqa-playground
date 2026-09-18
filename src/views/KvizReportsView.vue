<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import HostReport from '@/games/kviz/components/HostReport.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { db } from '@/lib/db'
import { sessionDb } from '@/lib/sessionDb'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'
import { downloadReport } from '@/games/kviz/report'
import type { QuizReport, QuizReportSummary } from '@/games/kviz/types'

/**
 * Výsledky odehraných kvízů.
 *
 * Vlastní obrazovka, ne oddíl pod balíčky otázek. Jsou to dvě různé
 * práce: otázky se chystají před školením, výsledky se čtou po něm,
 * a než jich pár přibylo, musela se k nim školitelka prorolovat celou
 * knihovnou balíčků.
 *
 * Heslo tu chrání totéž co ve správě: jsou v nich přezdívky účastníků
 * a seznam vyhodnocení pravidla Firestore odemčené relaci tak jako tak
 * nevydají.
 */
const unlocked = ref(db().isUnlocked())
const loaded = ref(false)
const reports = ref<QuizReportSummary[]>([])
const openReport = ref<QuizReport | null>(null)

/**
 * Vyhodnocení leží jen ve sdílené databázi, protože bez telefonů žádné
 * nevzniká. Bez ní zůstane obrazovka prázdná a řekne proč.
 */
async function loadReports(): Promise<void> {
  const conn = await sessionDb()
  if (!conn) {
    loaded.value = true
    return
  }
  try {
    reports.value = await conn.listReports()
  } catch (e) {
    console.error('Čtení vyhodnocení selhalo:', e)
  } finally {
    loaded.value = true
  }
}

async function showReport(reportId: string): Promise<void> {
  const conn = await sessionDb()
  if (!conn) return
  openReport.value = await conn.loadReport(reportId)
  if (!openReport.value) toast('Vyhodnocení se nepodařilo načíst.', 'bad')
}

async function removeReport(row: QuizReportSummary): Promise<void> {
  const ok = await confirmAction({
    title: 'Smazat vyhodnocení',
    text: 'Smaže se i s přezdívkami účastníků. Vrátit to nejde.',
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  const conn = await sessionDb()
  if (!conn) return
  await conn.deleteReport(row.id)
  reports.value = reports.value.filter((r) => r.id !== row.id)
  toast('Vyhodnocení smazáno.', 'ok')
}

function reportDate(at: number): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(at)
}

/** Po odemčení se seznam natáhne znovu: dotaz, který Firestore před
 *  chvílí zamítl, sám nic nepošle. */
async function onUnlocked(): Promise<void> {
  unlocked.value = true
  await loadReports()
}

function lock(): void {
  db().lock()
  unlocked.value = false
  openReport.value = null
}

onMounted(() => {
  if (unlocked.value) void loadReports()
})
</script>

<template>
  <div class="page-wrap">
    <template v-if="!unlocked">
      <AppHeader game="kviz" section="reports" />
      <AdminGate @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="kviz" section="reports">
        <template #tools>
          <UiMenu label="Účet správy" v-slot="{ close }">
            <button type="button" role="menuitem" @click="lock(); close()">Zamknout</button>
          </UiMenu>
        </template>
      </AppHeader>

      <main id="obsah" class="body page">
        <!-- Otevřené vyhodnocení -------------------------------------------- -->
        <div v-if="openReport" class="viewer">
          <HostReport
            :report="openReport"
            @close="openReport = null"
            @download="downloadReport(openReport)"
          />
        </div>

        <!-- Seznam ----------------------------------------------------------- -->
        <section v-else class="list">
          <header>
            <p class="eyebrow">Na kolik to dáš?</p>
            <h1 class="list__title">Výsledky odehraných kvízů</h1>
            <p class="list__lead">
              Co která skupina uměla a kde se sekla. Jsou v nich přezdívky
              účastníků, smaž je, až je nebudeš potřebovat.
            </p>
          </header>

          <!-- Dokud data nedorazila, není pravda, že tu nic není. -->
          <UiSkeleton v-if="!loaded" :lines="4" />

          <UiEmpty
            v-else-if="reports.length === 0"
            icon="info"
            title="Zatím tu nic není"
            text="Vyhodnocení vznikne po dohraném kvízu s telefony. Bez sdílené databáze se neukládá."
          />

          <ul v-else class="items">
            <li v-for="r in reports" :key="r.id">
              <button type="button" class="rrow" @click="showReport(r.id)">
                <span class="rrow__date">
                  {{ r.groupName || 'Bez názvu skupiny' }}
                </span>
                <span v-fit-text class="rrow__meta">
                  {{ reportDate(r.finishedAt) }} ·
                  {{ count(r.questionCount, 'otázka', 'otázky', 'otázek') }} ·
                  {{ count(r.playerCount, 'hráč', 'hráči', 'hráčů') }} ·
                  {{ r.packNames.join(', ') }}
                </span>
              </button>
              <button
                type="button"
                class="rrow__x"
                :aria-label="`Smazat vyhodnocení z ${reportDate(r.finishedAt)}`"
                @click="removeReport(r)"
              >
                Smazat
              </button>
            </li>
          </ul>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.page-wrap { min-height: 100dvh; }
.body { padding-block: var(--sp-5) var(--sp-8); }

.list { display: grid; gap: var(--sp-5); align-content: start; max-width: 40rem; }
.list__title { font-size: var(--fs-2xl); letter-spacing: -0.02em; }
.list__lead { margin-top: var(--sp-2); font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }

.items { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.items li { display: flex; align-items: center; gap: var(--sp-2); }
.rrow {
  flex: 1;
  display: grid;
  gap: 1px;
  min-width: 0;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  color: var(--c-text);
  text-align: left;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.rrow:hover { border-color: var(--c-surface-3); }
.rrow__date { font-weight: 700; }
.rrow__meta { font-size: calc(var(--fs-xs) * var(--fit-text, 1)); color: var(--c-text-faint); }
.rrow__x {
  flex: none;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  font-weight: 600;
}
.rrow__x:hover { color: var(--c-bad); border-color: color-mix(in oklab, var(--c-bad) 45%, transparent); }

.viewer { height: min(80vh, 50rem); }

@media (pointer: coarse) {
  .rrow__x { min-height: var(--control-touch); }
}
</style>
