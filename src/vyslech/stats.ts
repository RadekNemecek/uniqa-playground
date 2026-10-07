import { rangeOf } from './questions'
import type { VyslechAnswers, VyslechQuestion, VyslechReport } from './types'

/**
 * Pod tolika odpověďmi se NPS nepočítá. Ze tří lidí vyjde číslo, které
 * vypadá jako měření a je to náhoda: jeden člověk pohne výsledkem
 * o třicet bodů.
 */
export const NPS_MIN = 5

export interface ScaleStats {
  n: number
  mean: number | null
  /** Počet odpovědí na každou hodnotu, ve stejném pořadí jako `values`. */
  dist: number[]
  values: number[]
}

export interface NpsStats extends ScaleStats {
  /** NPS od −100 do 100. Null pod `NPS_MIN` odpověďmi. */
  score: number | null
  promoters: number
  passives: number
  detractors: number
}

export interface ChoiceStats {
  /** Kolik lidí na otázku odpovědělo. */
  n: number
  counts: number[]
}

export function numbersFor(responses: VyslechAnswers[], qid: string): number[] {
  return responses
    .map((r) => r[qid])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

export function scaleStats(q: VyslechQuestion, responses: VyslechAnswers[]): ScaleStats {
  const values = rangeOf(q.kind)
  const nums = numbersFor(responses, q.id).filter((v) => values.includes(v))
  const dist = values.map((v) => nums.filter((x) => x === v).length)
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  return { n: nums.length, mean, dist, values }
}

export function npsStats(q: VyslechQuestion, responses: VyslechAnswers[]): NpsStats {
  const base = scaleStats(q, responses)
  const nums = numbersFor(responses, q.id)
  const promoters = nums.filter((v) => v >= 9).length
  const detractors = nums.filter((v) => v <= 6).length
  const passives = nums.length - promoters - detractors
  const score = nums.length >= NPS_MIN ? Math.round(((promoters - detractors) / nums.length) * 100) : null
  return { ...base, score, promoters, passives, detractors }
}

export function choiceStats(q: VyslechQuestion, responses: VyslechAnswers[]): ChoiceStats {
  const counts = q.options.map(() => 0)
  let n = 0
  for (const r of responses) {
    const v = r[q.id]
    const picked = Array.isArray(v) ? v : typeof v === 'number' ? [v] : []
    if (picked.length === 0) continue
    n += 1
    for (const i of picked) if (i >= 0 && i < counts.length) counts[i]! += 1
  }
  return { n, counts }
}

export function textsFor(q: VyslechQuestion, responses: VyslechAnswers[]): string[] {
  return responses
    .map((r) => r[q.id])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
}

/**
 * Celková známka. Je to první škála sady: výchozí sada se ptá na celkový
 * dojem hned na začátku a výsledky podle ní třídí volné odpovědi.
 */
export function overallQuestion(questions: VyslechQuestion[]): VyslechQuestion | null {
  return questions.find((q) => q.kind === 'scale') ?? null
}

export function headline(report: VyslechReport): number | null {
  const q = overallQuestion(report.questions)
  return q ? scaleStats(q, report.responses).mean : null
}

export type Mood = 'all' | 'happy' | 'mid' | 'unhappy'

/** Filtr odpovědí podle celkové známky. */
export function byMood(report: VyslechReport, mood: Mood): VyslechAnswers[] {
  if (mood === 'all') return report.responses
  const q = overallQuestion(report.questions)
  if (!q) return report.responses
  return report.responses.filter((r) => {
    const v = r[q.id]
    if (typeof v !== 'number') return false
    if (mood === 'happy') return v >= 4
    if (mood === 'unhappy') return v <= 2
    return v === 3
  })
}

/** Průměr na jedno desetinné místo, česky. */
export function formatMean(value: number | null): string {
  if (value === null) return '·'
  return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

/** Znaménko u NPS. Kladné číslo bez plusu se čte jako průměr. */
export function formatNps(score: number | null): string {
  if (score === null) return '·'
  return score > 0 ? `+${score}` : String(score)
}
