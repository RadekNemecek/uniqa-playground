import { TEAM_COLORS, type TeamColor } from '@/lib/teams'

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

export function quizOption(index: number): QuizOption {
  return QUIZ_OPTIONS[index % OPTION_COUNT]!
}

/** Popis možnosti pro čtečku obrazovky a pro hlasový povel. */
export function optionLabel(index: number): string {
  const o = quizOption(index)
  return `${o.letter}, ${o.color.label.toLowerCase()}`
}
