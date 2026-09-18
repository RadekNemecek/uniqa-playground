<script setup lang="ts">
import { computed, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { quizOption } from '../options'
import { byDifficulty, successRate } from '../report'
import { count } from '@/lib/format'
import { formatScore } from '@/lib/teams'
import type { QuizReport, QuizReportQuestion } from '../types'

const props = defineProps<{ report: QuizReport }>()
const emit = defineEmits<{ close: []; download: [] }>()

type Tab = 'otazky' | 'lide'
const tab = ref<Tab>('otazky')

/** Otázky od nejhůř zvládnuté. To je to, co školitelka hledá. */
const questions = computed(() => byDifficulty(props.report))

/** Sloupce matice jsou hráči v pořadí výsledkové listiny. */
const players = computed(() => props.report.players)

function cellOf(qIndex: number, playerAt: number): string {
  const p = players.value[playerAt]
  const q = props.report.questions[qIndex]
  if (!p || !q) return ''
  if (p.joinIndex > q.index) return 'nebyl'
  const cell = props.report.matrix[qIndex]?.[playerAt]
  if (!cell) return 'nic'
  return cell.c === q.correctIndex ? 'ano' : 'ne'
}

const label: Record<string, string> = { ano: '✓', ne: '×', nic: '–', nebyl: '' }

/**
 * Past: špatná možnost, po které sáhla aspoň třetina odpovídajících.
 * Tohle je ten řádek, kvůli kterému se vyhodnocení čte, takže se
 * zvýrazní.
 */
function isTrap(q: QuizReportQuestion, at: number): boolean {
  if (at === q.correctIndex || q.answered === 0) return false
  return (q.byChoice[at] ?? 0) / q.answered >= 1 / 3
}
</script>

<template>
  <section class="rep">
    <header class="rep__head">
      <div>
        <p class="eyebrow">Vyhodnocení</p>
        <h1 class="rep__title">Jak to dopadlo</h1>
        <p class="rep__meta">
          {{ count(report.questions.length, 'otázka', 'otázky', 'otázek') }} ·
          {{ count(report.players.length, 'hráč', 'hráči', 'hráčů') }} ·
          {{ report.packNames.join(', ') }}
        </p>
      </div>
      <div class="rep__tools">
        <UiButton size="sm" variant="ghost" @click="emit('download')">Stáhnout tabulku</UiButton>
        <UiButton size="sm" variant="quiet" @click="emit('close')">Zpět</UiButton>
      </div>
    </header>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'otazky'" :class="{ 'tabs--on': tab === 'otazky' }" @click="tab = 'otazky'">
        Otázky
      </button>
      <button type="button" role="tab" :aria-selected="tab === 'lide'" :class="{ 'tabs--on': tab === 'lide' }" @click="tab = 'lide'">
        Kdo co škrtl
      </button>
    </div>

    <!-- Úspěšnost otázek ------------------------------------------------- -->
    <ol v-if="tab === 'otazky'" class="qs">
      <li v-for="q in questions" :key="q.qid" class="q">
        <div class="q__bar" :style="{ '--rate': `${successRate(q)}%` }" aria-hidden="true">
          <span :class="successRate(q) < 50 ? 'q__fill q__fill--weak' : 'q__fill'"></span>
        </div>
        <p class="q__rate">
          <strong>{{ successRate(q) }} %</strong>
          <span>{{ q.correct }} z {{ q.present }}</span>
        </p>
        <div class="q__text">
          <p v-fit-text class="q__prompt">{{ q.index + 1 }}. {{ q.prompt }}</p>
          <p class="q__answer">
            <span class="q__letter" :style="{ color: `var(${quizOption(q.correctIndex).color.cssVar})` }">
              {{ quizOption(q.correctIndex).letter }}
            </span>
            {{ q.options[q.correctIndex] }}
            <span v-if="q.avgMs > 0" class="q__time">průměrně za {{ (q.avgMs / 1000).toFixed(1) }} s</span>
          </p>
          <p v-if="q.answered < q.present" class="q__miss">
            {{ q.present - q.answered }} bez odpovědi
          </p>

          <!-- Kam lidé sáhli. Počítalo se to od začátku, ukládalo se to
               a nikde se to nezobrazilo. Přitom „většina si vybrala tuhle
               jednu špatnou možnost" je to nejužitečnější, co z kvízu
               vypadne: neříká jen že to neumí, ale co si myslí místo toho. -->
          <ul v-if="q.answered > 0" class="picks">
            <li
              v-for="(n, at) in q.byChoice"
              :key="at"
              class="pick"
              :class="{ 'pick--right': at === q.correctIndex, 'pick--trap': isTrap(q, at) }"
            >
              <span class="pick__letter" :style="{ color: `var(${quizOption(at).color.cssVar})` }">
                <!-- Tvrzení má dvě možnosti a jejich znění se ukládá,
                     takže se pozná podle délky pole; písmeno by u Pravda
                     a Nepravda nic neřeklo. -->
                {{ q.options.length === 2 ? q.options[at] : quizOption(at).letter }}
              </span>
              <span class="pick__bar" aria-hidden="true">
                <span class="pick__fill" :style="{ width: `${Math.round((n / q.answered) * 100)}%` }"></span>
              </span>
              <span class="pick__n">{{ n }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ol>

    <!-- Matice hráč krát otázka ------------------------------------------ -->
    <div v-else class="grid">
      <table>
        <caption class="vh">Kdo jak odpověděl na jednotlivé otázky</caption>
        <thead>
          <tr>
            <th scope="col" class="grid__who">Hráč</th>
            <th scope="col" class="grid__num">Body</th>
            <th v-for="q in report.questions" :key="q.qid" scope="col" class="grid__q" :title="q.prompt">
              {{ q.index + 1 }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, at) in players" :key="p.uid">
            <th scope="row" class="grid__who">{{ p.nick }}</th>
            <td class="grid__num">{{ formatScore(p.score) }}</td>
            <td
              v-for="(q, qi) in report.questions"
              :key="q.qid"
              class="cell"
              :class="`cell--${cellOf(qi, at)}`"
            >
              <span :aria-label="cellOf(qi, at)">{{ label[cellOf(qi, at)] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="grid__legend">
        ✓ správně · × vedle · – bez odpovědi · prázdné pole znamená, že hráč
        u té otázky ještě nebyl
      </p>
    </div>
  </section>
</template>

<style scoped>
.rep {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: var(--sp-4);
  height: 100%;
  min-height: 0;
  padding: var(--sp-4) var(--sp-6) var(--sp-5);
}

.rep__head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; }
.rep__title { font-size: var(--fs-2xl); font-weight: 900; }
.rep__meta { margin-top: var(--sp-1); font-size: var(--fs-sm); color: var(--c-text-faint); }
.rep__tools { display: flex; gap: var(--sp-2); }

.tabs { display: flex; gap: var(--sp-1); padding: var(--sp-1); border: 1px solid var(--c-line); border-radius: var(--r-md); background: var(--c-sunken); justify-self: start; }
.tabs button {
  padding: var(--sp-2) var(--sp-4);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.tabs button:hover { color: var(--c-text); }
/* Selektor je schválně stejně hluboký jako `.tabs button`, jinak by ho
   obecnější pravidlo přebilo a zbyl by tmavý text na tmavém pozadí. */
.tabs button.tabs--on { background: var(--c-brand); color: var(--c-on-accent); }

/* Otázky ------------------------------------------------------------------- */
.qs { list-style: none; padding: 0; display: grid; gap: var(--sp-2); min-height: 0; overflow-y: auto; }
.q {
  display: grid;
  grid-template-columns: 6rem 7rem minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border: 1px solid var(--c-line-soft);
  border-radius: var(--r-lg);
  background: var(--c-surface);
}
.q__bar { height: 0.5rem; border-radius: var(--r-full); background: var(--c-sunken); overflow: hidden; }
.q__fill { display: block; height: 100%; width: var(--rate); background: var(--c-ok); }
/* Pod polovinou se pruh obarví, ale číslo vedle nese tutéž informaci. */
.q__fill--weak { background: var(--c-bad); }
.q__rate { display: grid; }
.q__rate strong { font-family: var(--font-display); font-size: var(--fs-lg); font-variant-numeric: tabular-nums; }
.q__rate span { font-size: var(--fs-xs); color: var(--c-text-faint); }
.q__text { min-width: 0; }
.q__prompt { font-weight: 600; line-height: var(--lh-snug); font-size: calc(1em * var(--fit-text, 1)); }
.q__answer { margin-top: var(--sp-1); font-size: var(--fs-sm); color: var(--c-text-muted); }
.q__letter { font-family: var(--font-display); font-weight: 900; margin-right: var(--sp-1); }
.q__time { margin-left: var(--sp-2); color: var(--c-text-faint); }
.picks { display: grid; gap: var(--sp-1); margin-top: var(--sp-2); list-style: none; padding: 0; }
.pick {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) 2rem;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
}
.pick__letter { font-weight: 900; }
.pick__bar {
  height: var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-bg-field);
  overflow: hidden;
}
.pick__fill { display: block; height: 100%; background: var(--c-text-faint); border-radius: var(--r-full); }
.pick--right .pick__fill { background: var(--c-ok); }
.pick--trap .pick__fill { background: var(--c-bad); }
.pick--trap .pick__n { color: var(--c-bad); font-weight: 700; }
.pick__n { text-align: right; color: var(--c-text-muted); font-variant-numeric: tabular-nums; }

.q__miss { margin-top: var(--sp-1); font-size: var(--fs-xs); color: var(--c-text-faint); }

/* Matice ------------------------------------------------------------------- */
.grid { min-height: 0; overflow: auto; display: grid; gap: var(--sp-3); align-content: start; }
.grid table { border-collapse: collapse; font-size: var(--fs-sm); }
.grid th, .grid td { padding: var(--sp-2); border-bottom: 1px solid var(--c-line-soft); text-align: center; }
.grid__who { text-align: left; white-space: nowrap; position: sticky; left: 0; background: var(--c-base); }
.grid__num { font-variant-numeric: tabular-nums; text-align: right; }
.grid__q { color: var(--c-text-faint); font-weight: 600; }
/* Buňka nese znak, ne jen barvu: tabulka se tiskne i černobíle. */
.cell span { font-weight: 800; }
.cell--ano { color: var(--c-ok); }
.cell--ne { color: var(--c-bad); }
.cell--nic { color: var(--c-text-faint); }
.cell--nebyl { background: color-mix(in oklab, var(--c-abyss) 40%, transparent); }
.grid__legend { font-size: var(--fs-xs); color: var(--c-text-faint); }

@media (max-width: 720px) {
  .q { grid-template-columns: minmax(0, 1fr); }
}

@media (pointer: coarse) {
  .tabs button { min-height: var(--control-touch); }
}
</style>
