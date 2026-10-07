import { id } from '@/lib/id'
import type { VyslechAnswer, VyslechForm, VyslechKind, VyslechQuestion } from './types'

/** Nejvíc otázek v sadě. Víc než dvě minuty na telefonu lidi nedočtou. */
export const MAX_QUESTIONS = 20

/** Nejvíc možností u volby. Na telefonu se musí vejít pod sebe. */
export const MAX_OPTIONS = 8

/** Délka volné odpovědi. Hlídá ji pole na telefonu, ne pravidla. */
export const MAX_TEXT = 500

export interface KindInfo {
  kind: VyslechKind
  label: string
  /** Co tvar dělá, jednou větou pro editor. */
  hint: string
}

export const KINDS: KindInfo[] = [
  { kind: 'scale', label: 'Škála 1 až 5', hint: 'Spokojenost nebo souhlas s tvrzením.' },
  { kind: 'nps', label: 'Doporučení 0 až 10', hint: 'Doporučil/a bys to kolegovi? Z odpovědí se počítá NPS.' },
  { kind: 'single', label: 'Jedna volba', hint: 'Vybírá se právě jedna z možností.' },
  { kind: 'multi', label: 'Víc voleb', hint: 'Zaškrtnout jde kolik možností chce.' },
  { kind: 'text', label: 'Text', hint: 'Volná odpověď, nejvýš 500 znaků.' },
]

export function kindLabel(kind: VyslechKind): string {
  return KINDS.find((k) => k.kind === kind)?.label ?? kind
}

/** Popisky krajů, když je autorka nevyplní. */
export function lowLabel(q: VyslechQuestion): string {
  if (q.low.trim()) return q.low.trim()
  return q.kind === 'nps' ? 'Určitě ne' : 'Vůbec'
}

export function highLabel(q: VyslechQuestion): string {
  if (q.high.trim()) return q.high.trim()
  return q.kind === 'nps' ? 'Určitě ano' : 'Naprosto'
}

/** Rozsah hodnot škály. */
export function rangeOf(kind: VyslechKind): number[] {
  if (kind === 'nps') return Array.from({ length: 11 }, (_, i) => i)
  if (kind === 'scale') return [1, 2, 3, 4, 5]
  return []
}

export function hasOptions(kind: VyslechKind): boolean {
  return kind === 'single' || kind === 'multi'
}

export function emptyQuestion(kind: VyslechKind = 'scale'): VyslechQuestion {
  return {
    id: id('q'),
    kind,
    prompt: '',
    required: kind !== 'text',
    options: hasOptions(kind) ? ['', ''] : [],
    low: '',
    high: '',
  }
}

/** Otázka je hotová, když má znění a u voleb aspoň dvě vyplněné možnosti. */
export function isQuestionReady(q: VyslechQuestion): boolean {
  if (!q.prompt.trim()) return false
  if (hasOptions(q.kind)) return q.options.filter((o) => o.trim()).length >= 2
  return true
}

/**
 * Otázky do běžícího sběru. Rozepsané se nepustí: telefon by ukázal
 * prázdnou otázku nebo volbu bez možností. Prázdné možnosti se zahodí.
 */
export function freezeQuestions(form: VyslechForm): VyslechQuestion[] {
  return form.questions.filter(isQuestionReady).map((q) => ({
    ...q,
    prompt: q.prompt.trim(),
    options: hasOptions(q.kind) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
    low: q.low.trim(),
    high: q.high.trim(),
  }))
}

/** Je na otázku odpovězeno? Prázdný text a prázdný výběr se nepočítají. */
export function isAnswered(value: VyslechAnswer | undefined): boolean {
  if (value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return Number.isFinite(value)
}

/** Odhad doby vyplnění, ať příprava i telefon řeknou poctivé číslo. */
export function minutesFor(questions: VyslechQuestion[]): number {
  const seconds = questions.reduce((sum, q) => sum + (q.kind === 'text' ? 40 : 10), 0)
  return Math.max(1, Math.round(seconds / 60))
}
