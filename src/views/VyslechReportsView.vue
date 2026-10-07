<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import ReportDetail from '@/vyslech/components/ReportDetail.vue'
import ReportCompare from '@/vyslech/components/ReportCompare.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { db } from '@/lib/db'
import { vyslechDbWhenReady } from '@/lib/vyslechDb'
import { count } from '@/lib/format'
import { downloadVyslechCsv } from '@/vyslech/csv'
import { formatMean, formatNps, headline, npsStats } from '@/vyslech/stats'
import { confirmAction, toast } from '@/stores/ui'
import type { VyslechReport } from '@/vyslech/types'

/**
 * Výsledky Výslechu. Seznam školení, detail jednoho a srovnání.
 *
 * Vyhodnocení se stahují celá. Je jich desítky a srovnání z nich
 * počítá rovnou, takže zvlášť ukládaný souhrn by byl jen další věc,
 * která se může rozejít s daty.
 */
const route = useRoute()
const router = useRouter()
const unlocked = ref(db().isUnlocked())
const loaded = ref(false)
const failed = ref(false)
const reports = ref<VyslechReport[]>([])
const mode = ref<'list' | 'compare'>('list')

const openId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))
const open = computed(() => reports.value.find((r) => r.id === openId.value) ?? null)

async function load(): Promise<void> {
  loaded.value = false
  failed.value = false
  const conn = await vyslechDbWhenReady()
  try {
    reports.value = conn ? await conn.listReports() : []
  } catch (e) {
    console.error('Čtení výsledků Výslechu selhalo:', e)
    failed.value = true
  } finally {
    loaded.value = true
  }
}

async function onUnlocked(): Promise<void> {
  unlocked.value = true
  await load()
}

function lock(): void {
  db().lock()
  unlocked.value = false
}

function show(id: string): void {
  void router.push({ name: 'vyslech-vysledky', query: { id } })
}

function back(): void {
  void router.push({ name: 'vyslech-vysledky', query: {} })
}

async function remove(report: VyslechReport): Promise<void> {
  const ok = await confirmAction({
    title: 'Smazat vyhodnocení',
    text: `Výsledky školení „${report.title}" se smažou i s volnými odpověďmi. Vrátit to nejde.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  const conn = await vyslechDbWhenReady()
  try {
    await conn?.deleteReport(report.id)
    reports.value = reports.value.filter((r) => r.id !== report.id)
    toast('Vyhodnocení smazáno.', 'ok')
    if (openId.value === report.id) back()
  } catch {
    toast('Vyhodnocení se nepodařilo smazat.', 'bad')
  }
}

function date(at: number): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(at)
}

function nps(r: VyslechReport): number | null {
  const q = r.questions.find((x) => x.kind === 'nps')
  return q ? npsStats(q, r.responses).score : null
}

// Detail otevřený z odkazu, který se ještě nenačetl, počká na data.
watch([openId, loaded], () => {
  if (openId.value && loaded.value && !open.value && !failed.value) back()
})

onMounted(() => {
  if (unlocked.value) void load()
})
</script>

<template>
  <div class="page-wrap">
    <template v-if="!unlocked">
      <AppHeader game="vyslech" section="reports" prep />
      <AdminGate title="Výslech" lead="Výsledky zpětné vazby čte jen ten, kdo zná heslo do správy." @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="vyslech" section="reports" prep>
        <template #tools>
          <!-- Jediná akce účtu, proto rovnou tlačítko, ne nabídka s jednou položkou. -->
          <UiIconButton icon="lock" label="Zamknout Výslech" @click="lock" />
        </template>
      </AppHeader>

      <main id="obsah" class="body page">
        <ReportDetail
          v-if="open"
          :report="open"
          @back="back"
          @download="downloadVyslechCsv(open)"
          @remove="remove(open)"
        />

        <section v-else class="list">
          <header class="list__head">
            <div>
              <p class="eyebrow">Výslech</p>
              <h1 class="list__title">Co řekl sál.</h1>
              <p class="list__lead">
                Zpětná vazba ze školení. Odpovědi jsou anonymní, ale volný text může
                obsahovat jména. Smaž výsledky, až je nebudeš potřebovat.
              </p>
            </div>
            <UiSegmented
              v-if="reports.length > 1"
              v-model="mode"
              :options="[{ value: 'list', label: 'Školení' }, { value: 'compare', label: 'Srovnání' }]"
              aria-label="Zobrazení výsledků"
            />
          </header>

          <UiSkeleton v-if="!loaded" :lines="4" />
          <UiEmpty v-else-if="failed" icon="warning" title="Výsledky se nepodařilo načíst" text="Zkontroluj připojení a načti stránku znovu." />
          <UiEmpty
            v-else-if="reports.length === 0"
            icon="chat"
            title="Zatím tu nic není"
            text="Výsledky se uloží, jakmile ukončíš první sběr, ve kterém někdo odpověděl."
          />

          <ReportCompare v-else-if="mode === 'compare'" :reports="reports" @open="show" />

          <ul v-else class="items">
            <li v-for="(r, i) in reports" :key="r.id" class="card">
              <span class="card__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <button type="button" class="card__main" @click="show(r.id)">
                <span class="card__name">{{ r.title }}</span>
                <span class="card__when">{{ date(r.finishedAt) }}</span>
                <span class="card__meta">
                  {{ count(r.responses.length, 'odpověď', 'odpovědi', 'odpovědí') }}
                  <template v-if="r.group"> · {{ r.group }}</template>
                  <template v-if="r.trainer"> · {{ r.trainer }}</template>
                </span>
                <span class="card__scores">
                  <span v-if="headline(r) !== null">Známka <strong>{{ formatMean(headline(r)) }}</strong></span>
                  <span v-if="nps(r) !== null">NPS <strong>{{ formatNps(nps(r)) }}</strong></span>
                </span>
              </button>
              <UiMenu :label="`Akce vyhodnocení ${r.title}`" v-slot="{ close }">
                <button type="button" role="menuitem" @click="show(r.id); close()">Otevřít</button>
                <button type="button" role="menuitem" @click="downloadVyslechCsv(r); close()">Stáhnout tabulku</button>
                <hr />
                <button type="button" role="menuitem" class="danger" @click="void remove(r); close()">Smazat</button>
              </UiMenu>
            </li>
          </ul>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { padding-block: var(--sp-6) var(--sp-8); }
.list { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.list__head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--sp-5); }
.list__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.list__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }

.items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.card__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.card__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); padding: var(--sp-2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); text-align: left; }
.card__main:hover { background: var(--c-bg-active); }
.card__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.card__when { align-self: center; font-size: var(--fs-sm); color: var(--c-text-muted); font-variant-numeric: tabular-nums; }
.card__meta { font-size: var(--fs-sm); color: var(--c-text-muted); overflow-wrap: anywhere; }
.card__scores { display: flex; gap: var(--sp-4); justify-self: end; font-size: var(--fs-sm); color: var(--c-text-muted); }
.card__scores strong { color: var(--c-text); font-size: var(--fs-md); font-variant-numeric: tabular-nums; }

/* Tisk detailu: bez hlavičky aplikace, jen výsledky. */
@media print {
  .page-wrap :deep(.head) { display: none; }
  .body { padding: 0; }
}

@media (max-width: 720px) {
  .card { gap: var(--sp-3); }
  .card__main { grid-template-columns: minmax(0, 1fr); }
  .card__scores { justify-self: start; }
  .card__name { font-size: var(--fs-lg); }
}
@media (pointer: coarse) { .card__main { min-height: var(--control-touch); } }
</style>
