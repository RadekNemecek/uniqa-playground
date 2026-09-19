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
      <AppHeader game="kviz" section="reports" prep />
      <AdminGate @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="kviz" section="reports" prep>
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
          <header class="list__head">
            <p class="eyebrow">Na kolik to dáš?</p>
            <h1 class="list__title">Odehrané kvízy.</h1>
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
            <li v-for="(r, i) in reports" :key="r.id" class="card">
              <span class="card__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <button type="button" class="card__main" @click="showReport(r.id)">
                <span class="card__name">{{ r.groupName || 'Bez názvu skupiny' }}</span>
                <span class="card__when">{{ reportDate(r.finishedAt) }}</span>
                <span class="card__meta">
                  {{ count(r.questionCount, 'otázka', 'otázky', 'otázek') }} ·
                  {{ count(r.playerCount, 'hráč', 'hráči', 'hráčů') }} ·
                  {{ r.packNames.join(', ') }}
                </span>
              </button>

              <UiMenu :label="`Akce vyhodnocení ${r.groupName || reportDate(r.finishedAt)}`" v-slot="{ close }">
                <button type="button" role="menuitem" @click="void showReport(r.id); close()">Otevřít</button>
                <hr />
                <button type="button" role="menuitem" @click="void removeReport(r); close()">Smazat</button>
              </UiMenu>
            </li>
          </ul>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
/* Tvar je týž jako u knihovny balíčků: nadpis, pod ním linkovaný
   seznam a na každém řádku nabídka akcí. Otázky se chystají před
   školením a výsledky se čtou po něm, ale je to tatáž práce u téhož
   stolu, takže se nemají lišit tvarem. */
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { padding-block: var(--sp-6) var(--sp-8); }

.list { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.list__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.list__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }

.items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.card__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.card__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); padding: var(--sp-2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); text-align: left; }
.card__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.card__when { align-self: center; font-size: var(--fs-sm); color: var(--c-text-muted); font-variant-numeric: tabular-nums; }
.card__meta { grid-column: 1 / -1; font-size: var(--fs-sm); color: var(--c-text-muted); overflow-wrap: anywhere; }
.card__main:hover { background: var(--c-bg-active); }

.viewer { height: min(80vh, 50rem); }

@media (max-width: 720px) {
  .card { gap: var(--sp-3); }
  .card__main { grid-template-columns: minmax(0, 1fr); }
  .card__name { font-size: var(--fs-lg); }
}
@media (pointer: coarse) { .card__main { min-height: var(--control-touch); } }
</style>
