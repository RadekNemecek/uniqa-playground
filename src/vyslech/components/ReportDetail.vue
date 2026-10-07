<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import type { Segment } from '@/components/ui/segmented'
import { count } from '@/lib/format'
import { highLabel, lowLabel } from '../questions'
import {
  NPS_MIN,
  byMood,
  choiceStats,
  formatMean,
  formatNps,
  npsStats,
  overallQuestion,
  percent,
  scaleStats,
  textsFor,
  type Mood,
} from '../stats'
import type { VyslechReport } from '../types'

/**
 * Vyhodnocení jednoho školení.
 *
 * U škál rozložení, ne jen průměr: trojka může znamenat „všem to bylo
 * jedno", nebo „půlka nadšená, půlka zuří", a to jsou dvě různá školení.
 * U každého čísla stojí, z kolika odpovědí vzniklo.
 *
 * Filtr podle celkové známky platí na celou stránku. Nejcennější je
 * přečíst si, co napsali nespokojení, a k tomu vidět, jak hodnotili zbytek.
 */
const props = defineProps<{ report: VyslechReport }>()
const emit = defineEmits<{ back: []; download: []; remove: [] }>()

const mood = ref<Mood>('all')
const overall = computed(() => overallQuestion(props.report.questions))
const rows = computed(() => byMood(props.report, mood.value))

const moodOptions = computed<Segment<Mood>[]>(() => {
  const n = (m: Mood): number => byMood(props.report, m).length
  return [
    { value: 'all', label: `Všichni (${props.report.responses.length})` },
    { value: 'happy', label: `Spokojení (${n('happy')})` },
    { value: 'mid', label: `Napůl (${n('mid')})` },
    { value: 'unhappy', label: `Nespokojení (${n('unhappy')})` },
  ]
})

const headMean = computed(() => (overall.value ? scaleStats(overall.value, props.report.responses).mean : null))
const headNps = computed(() => {
  const q = props.report.questions.find((x) => x.kind === 'nps')
  return q ? npsStats(q, props.report.responses).score : null
})

const when = computed(() =>
  new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeStyle: 'short' }).format(props.report.finishedAt),
)

function widthOf(part: number, max: number): string {
  return `${max > 0 ? (part / max) * 100 : 0}%`
}

function print(): void {
  window.print()
}
</script>

<template>
  <article class="report">
    <header class="report__bar">
      <UiButton variant="ghost" size="sm" icon="arrow-left" @click="emit('back')">Všechna školení</UiButton>
      <div class="report__tools">
        <UiButton variant="ghost" size="sm" icon="download" @click="emit('download')">Tabulka</UiButton>
        <UiButton variant="ghost" size="sm" icon="print" @click="print">Tisk</UiButton>
        <UiMenu :label="`Akce vyhodnocení ${report.title}`" v-slot="{ close }">
          <button type="button" role="menuitem" class="danger" @click="close(); emit('remove')">Smazat vyhodnocení</button>
        </UiMenu>
      </div>
    </header>

    <header class="report__head">
      <p class="eyebrow">Výslech · {{ report.formName }}</p>
      <h1 class="report__title">{{ report.title }}</h1>
      <p class="report__meta">
        {{ when }}
        <template v-if="report.group"> · {{ report.group }}</template>
        <template v-if="report.trainer"> · {{ report.trainer }}</template>
      </p>
    </header>

    <dl class="kpis">
      <div class="kpi">
        <dt>Odpovědí</dt>
        <dd>{{ report.responses.length }}</dd>
      </div>
      <div v-if="overall" class="kpi">
        <dt>Celková známka</dt>
        <dd>{{ formatMean(headMean) }}<small> z 5</small></dd>
      </div>
      <div v-if="report.questions.some((q) => q.kind === 'nps')" class="kpi">
        <dt>NPS</dt>
        <dd>{{ formatNps(headNps) }}</dd>
      </div>
    </dl>

    <div v-if="overall && report.responses.length > 1" class="filter">
      <p class="filter__label">Podle celkové známky</p>
      <UiSegmented v-model="mood" :options="moodOptions" aria-label="Filtr podle celkové známky" />
      <p class="hint">Filtr platí na celou stránku. Spokojení dali 4 nebo 5, nespokojení 1 nebo 2.</p>
    </div>

    <p v-if="rows.length === 0" class="hint">V téhle skupině nikdo není.</p>

    <ol v-else class="blocks">
      <li v-for="(q, i) in report.questions" :key="q.id" class="block">
        <h2 class="block__title">
          <span class="block__num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          {{ q.prompt }}
        </h2>

        <!-- Škála ---------------------------------------------------------- -->
        <template v-if="q.kind === 'scale'">
          <template v-for="s in [scaleStats(q, rows)]" :key="'s'">
            <p class="block__big">
              <strong>{{ formatMean(s.mean) }}</strong>
              <span>průměr z {{ count(s.n, 'odpovědi', 'odpovědí', 'odpovědí') }}</span>
            </p>
            <ul class="bars">
              <li v-for="(v, vi) in [...s.values].reverse()" :key="v" class="bar">
                <span class="bar__label">{{ v }}<template v-if="v === 5"> · {{ highLabel(q) }}</template><template v-if="v === 1"> · {{ lowLabel(q) }}</template></span>
                <span class="bar__track"><span class="bar__fill" :style="{ width: widthOf(s.dist[s.values.length - 1 - vi]!, Math.max(...s.dist)) }"></span></span>
                <span class="bar__count">{{ s.dist[s.values.length - 1 - vi] }}</span>
              </li>
            </ul>
          </template>
        </template>

        <!-- Doporučení ------------------------------------------------------ -->
        <template v-else-if="q.kind === 'nps'">
          <template v-for="s in [npsStats(q, rows)]" :key="'n'">
            <p class="block__big">
              <strong>{{ formatNps(s.score) }}</strong>
              <span v-if="s.score !== null">NPS z {{ count(s.n, 'odpovědi', 'odpovědí', 'odpovědí') }}, průměr {{ formatMean(s.mean) }}</span>
              <span v-else>NPS se počítá od {{ NPS_MIN }} odpovědí, teď jich je {{ s.n }}. Průměr {{ formatMean(s.mean) }}.</span>
            </p>
            <div v-if="s.n" class="split" aria-hidden="true">
              <span class="split__part split__part--bad" :style="{ flexGrow: s.detractors }"></span>
              <span class="split__part split__part--mid" :style="{ flexGrow: s.passives }"></span>
              <span class="split__part split__part--ok" :style="{ flexGrow: s.promoters }"></span>
            </div>
            <ul class="legend">
              <li><span class="legend__swatch split__part--bad"></span>Kritici 0 až 6: <strong>{{ s.detractors }}</strong> ({{ percent(s.detractors, s.n) }} %)</li>
              <li><span class="legend__swatch split__part--mid"></span>Neutrální 7 až 8: <strong>{{ s.passives }}</strong> ({{ percent(s.passives, s.n) }} %)</li>
              <li><span class="legend__swatch split__part--ok"></span>Propagátoři 9 až 10: <strong>{{ s.promoters }}</strong> ({{ percent(s.promoters, s.n) }} %)</li>
            </ul>
          </template>
        </template>

        <!-- Volby ------------------------------------------------------------ -->
        <template v-else-if="q.kind === 'single' || q.kind === 'multi'">
          <template v-for="s in [choiceStats(q, rows)]" :key="'c'">
            <p class="hint">
              {{ count(s.n, 'odpověď', 'odpovědi', 'odpovědí') }}<template v-if="q.kind === 'multi'">, šlo zaškrtnout víc možností</template>
            </p>
            <ul class="bars">
              <li v-for="(o, oi) in q.options" :key="oi" class="bar bar--wide">
                <span class="bar__label">{{ o }}</span>
                <span class="bar__track"><span class="bar__fill" :style="{ width: widthOf(s.counts[oi]!, Math.max(...s.counts)) }"></span></span>
                <span class="bar__count">{{ s.counts[oi] }} <small>{{ percent(s.counts[oi]!, s.n) }} %</small></span>
              </li>
            </ul>
          </template>
        </template>

        <!-- Text ------------------------------------------------------------- -->
        <template v-else>
          <template v-for="texts in [textsFor(q, rows)]" :key="'t'">
            <p class="hint">{{ count(texts.length, 'odpověď', 'odpovědi', 'odpovědí') }}</p>
            <ul v-if="texts.length" class="quotes">
              <li v-for="(t, ti) in texts" :key="ti" class="quote">{{ t }}</li>
            </ul>
          </template>
        </template>
      </li>
    </ol>
  </article>
</template>

<style scoped>
/* Výsledky jsou práce: obrys a tvrdý stín, žádné nálepky ani natočení. */
.report { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.report__bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.report__tools { display: flex; align-items: center; gap: var(--sp-2); }
.report__title { margin-top: var(--sp-2); font-size: var(--fs-work-title); overflow-wrap: anywhere; }
.report__meta { margin-top: var(--sp-2); color: var(--c-text-muted); font-size: var(--fs-sm); }
.hint { font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--c-text-faint); }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: var(--sp-3); margin: 0; }
.kpi {
  padding: var(--sp-4);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
}
.kpi dt { font-size: var(--fs-xs); font-weight: 900; letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--c-text-muted); }
.kpi dd { margin: var(--sp-1) 0 0; font-size: var(--fs-work-number); font-weight: 900; line-height: var(--lh-tight); font-variant-numeric: tabular-nums; }
.kpi small { font-size: var(--fs-sm); color: var(--c-text-muted); }

.filter { display: grid; gap: var(--sp-2); justify-items: start; }
.filter__label { font-size: var(--fs-sm); font-weight: 900; }

.blocks { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-6); border-top: var(--border-w-strong) solid var(--c-text); padding-top: var(--sp-6); }
.block { display: grid; gap: var(--sp-3); break-inside: avoid; }
.block__title { display: flex; gap: var(--sp-3); font-size: var(--fs-lg); line-height: var(--lh-snug); }
.block__num {
  flex: none;
  align-self: start;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  background: var(--c-ink);
  color: var(--c-on-ink);
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
}
.block__big { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--sp-3); }
.block__big strong { font-size: var(--fs-3xl); font-weight: 900; font-variant-numeric: tabular-nums; line-height: 1; }
.block__big span { font-size: var(--fs-sm); color: var(--c-text-muted); }

.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-2); }
.bar { display: grid; grid-template-columns: minmax(8rem, 12rem) minmax(0, 1fr) 4.5rem; align-items: center; gap: var(--sp-3); font-size: var(--fs-sm); }
.bar--wide { grid-template-columns: minmax(8rem, 16rem) minmax(0, 1fr) 4.5rem; }
.bar__label { font-weight: 700; line-height: var(--lh-snug); }
.bar__track {
  height: var(--sp-5);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--c-surface);
  overflow: hidden;
}
.bar__fill { display: block; height: 100%; background: var(--c-brand); }
.bar__count { font-weight: 900; font-variant-numeric: tabular-nums; text-align: right; }
.bar__count small { font-weight: 400; color: var(--c-text-muted); }

/* NPS: tři díly vedle sebe. Barva se tu opírá o slovo v legendě pod ním. */
.split {
  display: flex;
  height: var(--sp-6);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.split__part + .split__part { border-left: var(--border-w-strong) solid var(--c-border); }
.split__part--bad { background: var(--c-bad-fill); }
.split__part--mid { background: var(--c-surface-2); }
.split__part--ok { background: var(--c-ok-fill); }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-5); font-size: var(--fs-sm); }
.legend li { display: inline-flex; align-items: center; gap: var(--sp-2); }
.legend__swatch { width: var(--sp-3); height: var(--sp-3); border: var(--border-w) solid var(--c-border); border-radius: var(--r-xs); }

.quotes { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-2); }
.quote {
  padding: var(--sp-3) var(--sp-4);
  border-left: var(--border-w-heavy) solid var(--c-brand);
  background: var(--c-surface);
  line-height: var(--lh-body);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .bar,
  .bar--wide { grid-template-columns: minmax(0, 1fr) 4.5rem; }
  .bar__track { grid-column: 1 / -1; grid-row: 2; }
}

@media print {
  .report__bar,
  .filter { display: none; }
  .kpi { box-shadow: var(--shadow-none); }
}
</style>
