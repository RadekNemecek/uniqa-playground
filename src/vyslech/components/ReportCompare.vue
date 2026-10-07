<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiField from '@/components/ui/UiField.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import { formatMean, formatNps, npsStats, scaleStats } from '../stats'
import type { VyslechQuestion, VyslechReport } from '../types'

/**
 * Srovnání školení na téže sadě.
 *
 * Tady je to ovoce: jedna sada pořád dokola dává čísla, která jdou
 * položit vedle sebe, po skupinách, lektorech i v čase. Otázky se párují
 * podle id, takže úprava znění srovnání nerozbije. Sloupce jsou jen
 * číselné otázky, text se do tabulky nevejde a čte se v detailu.
 */
const props = defineProps<{ reports: VyslechReport[] }>()
const emit = defineEmits<{ open: [reportId: string] }>()

/** Sady, které mají aspoň dvě školení. Jedno se nemá s čím srovnat. */
const forms = computed(() => {
  const byForm = new Map<string, { id: string; name: string; n: number }>()
  for (const r of props.reports) {
    const entry = byForm.get(r.formId) ?? { id: r.formId, name: r.formName, n: 0 }
    entry.n += 1
    byForm.set(r.formId, entry)
  }
  return [...byForm.values()].filter((f) => f.n >= 2).sort((a, b) => b.n - a.n)
})

const formId = ref('')
watch(
  forms,
  (list) => {
    if (!list.some((f) => f.id === formId.value)) formId.value = list[0]?.id ?? ''
  },
  { immediate: true },
)

const rows = computed(() => props.reports.filter((r) => r.formId === formId.value))

/** Sloupce podle nejnovějšího školení, ať nesou aktuální znění. */
const columns = computed<VyslechQuestion[]>(() => {
  const latest = rows.value[0]
  return latest ? latest.questions.filter((q) => q.kind === 'scale' || q.kind === 'nps') : []
})

/** Číslo otázky v dotazníku, ne pořadí sloupce. Textové otázky
 *  v tabulce chybí a sloupce by jinak číslovaly jinak než detail. */
function numberOf(q: VyslechQuestion): number {
  return (rows.value[0]?.questions.findIndex((x) => x.id === q.id) ?? 0) + 1
}

function cell(report: VyslechReport, q: VyslechQuestion): string {
  const own = report.questions.find((x) => x.id === q.id && x.kind === q.kind)
  if (!own) return '·'
  return q.kind === 'nps' ? formatNps(npsStats(own, report.responses).score) : formatMean(scaleStats(own, report.responses).mean)
}

/** Souhrn přes všechna školení: odpovědi se sečtou, ne průměry průměrů. */
function total(q: VyslechQuestion): string {
  const all = rows.value.flatMap((r) => (r.questions.some((x) => x.id === q.id && x.kind === q.kind) ? r.responses : []))
  return q.kind === 'nps' ? formatNps(npsStats(q, all).score) : formatMean(scaleStats(q, all).mean)
}

function date(at: number): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' }).format(at)
}
</script>

<template>
  <UiEmpty
    v-if="forms.length === 0"
    icon="info"
    title="Zatím není co srovnávat"
    text="Srovnání se objeví, až budou aspoň dvě školení se stejnou sadou otázek."
  />

  <div v-else class="compare">
    <UiField v-if="forms.length > 1" label="Sada otázek">
      <select v-model="formId">
        <option v-for="f in forms" :key="f.id" :value="f.id">{{ f.name }} ({{ f.n }})</option>
      </select>
    </UiField>

    <p class="hint">
      Průměry škál od 1 do 5 a NPS od −100 do 100. Tečka znamená, že otázka v tom školení nebyla.
      Kliknutím na školení otevřeš detail.
    </p>

    <div class="scroll">
      <table class="table">
        <thead>
          <tr>
            <th scope="col" class="table__lead">Školení</th>
            <th scope="col">Odpovědí</th>
            <th v-for="q in columns" :key="q.id" scope="col" :title="q.prompt">
              <span class="table__num">{{ String(numberOf(q)).padStart(2, '0') }}</span>
              <span class="table__q">{{ q.prompt }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <th scope="row" class="table__lead">
              <button type="button" class="table__open" @click="emit('open', r.id)">
                <strong>{{ r.title }}</strong>
                <span>{{ date(r.finishedAt) }}<template v-if="r.group"> · {{ r.group }}</template><template v-if="r.trainer"> · {{ r.trainer }}</template></span>
              </button>
            </th>
            <td>{{ r.responses.length }}</td>
            <td v-for="q in columns" :key="q.id">{{ cell(r, q) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" class="table__lead">Všechna školení</th>
            <td>{{ rows.reduce((sum, r) => sum + r.responses.length, 0) }}</td>
            <td v-for="q in columns" :key="q.id">{{ total(q) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.compare { display: grid; gap: var(--sp-4); }
.hint { font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--c-text-faint); }
.compare select {
  width: min(100%, 24rem);
  min-height: var(--control-md);
  padding: var(--sp-1) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text);
  font-weight: 700;
}

/* Tabulka může být širší než stránka, roluje se jen ona. */
.scroll {
  overflow-x: auto;
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}
.table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.table th,
.table td { padding: var(--sp-3); border-bottom: var(--border-w) solid var(--c-border-soft); text-align: right; vertical-align: top; font-variant-numeric: tabular-nums; }
.table thead th { vertical-align: bottom; font-weight: 700; color: var(--c-text-muted); }
.table td { font-weight: 900; font-size: var(--fs-md); }
.table tfoot th,
.table tfoot td { border-top: var(--border-w-strong) solid var(--c-border); border-bottom: 0; }
.table .table__lead { text-align: left; min-width: 14rem; }
.table__num { display: block; color: var(--c-brand); font-weight: 900; }
/* Znění otázky v hlavičce sloupce: tři řádky a dost, celé je v nápovědě. */
.table__q {
  display: -webkit-box;
  min-width: 8rem;
  max-width: 12rem;
  margin-left: auto;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  font-size: var(--fs-xs);
  line-height: var(--lh-snug);
  text-align: right;
}
.table__open { display: grid; gap: var(--sp-1); padding: 0; border: 0; background: transparent; color: var(--c-text); text-align: left; }
.table__open strong { font-size: var(--fs-md); }
.table__open span { font-weight: 400; color: var(--c-text-muted); }
.table__open:hover strong { text-decoration: underline; }

@media (pointer: coarse) {
  .compare select,
  .table__open { min-height: var(--control-touch); }
}
</style>
