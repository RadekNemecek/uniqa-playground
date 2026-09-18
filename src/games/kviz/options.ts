import { TEAM_COLORS, type TeamColor } from '@/lib/teams'
import type { QuizItem, QuizKind } from './types'

/**
 * Čtveřice možností. Každá nese barvu i písmeno, takže se volba nikdy
 * nerozlišuje jen odstínem a dá se snadno pojmenovat nahlas.
 *
 * Odstíny jsou z palety týmů. Vybrané jsou čtyři nejdál od sebe, tedy
 * bez tyrkysu, který je na azur moc blízko, a bez písku, který je jediná
 * teplá barva palety. Teplá v systému smí být jen `--c-spark` u Riziko!.
 */
export interface QuizOption {
  letter: string
  color: TeamColor
}

const PICK = [0, 2, 3, 4] as const // azur, limeta, levandule, růžová

export const QUIZ_OPTIONS: QuizOption[] = PICK.map((teamIndex, i) => ({
  letter: String.fromCharCode(65 + i),
  color: TEAM_COLORS[teamIndex]!,
}))

export const OPTION_COUNT = QUIZ_OPTIONS.length

/**
 * Znění obou možností u tvrzení. Nepíše je autorka a nemíchají se:
 * Pravda je vždycky A, Nepravda vždycky B. Hráč tak po druhém tvrzení
 * ví, kam sáhnout, aniž by musel číst. Barvy zůstávají z palety možností,
 * ne zelená a červená, ty v kvízu znamenají správně a vedle.
 */
export const BOOLEAN_LABELS = ['Pravda', 'Nepravda'] as const

export const BOOLEAN_COUNT = BOOLEAN_LABELS.length

/** Kolik tlačítek otázka nabízí. */
export function optionCountFor(kind: QuizKind): number {
  return kind === 'boolean' ? BOOLEAN_COUNT : OPTION_COUNT
}

/** Tvar otázky. Balíčky z doby před tvrzeními pole nemají a jsou `choice`. */
export function kindOf(item: QuizItem): QuizKind {
  return item.kind === 'boolean' ? 'boolean' : 'choice'
}

export function quizOption(index: number): QuizOption {
  return QUIZ_OPTIONS[index % OPTION_COUNT]!
}

/** Popis možnosti pro čtečku obrazovky a pro hlasový povel. */
export function optionLabel(index: number, kind: QuizKind = 'choice'): string {
  const o = quizOption(index)
  const word = kind === 'boolean' ? BOOLEAN_LABELS[index] : undefined
  return word ? `${word}, ${o.letter}` : `${o.letter}, ${o.color.label.toLowerCase()}`
}
