/* Datové typy celého Playgroundu. */

/* --- Balíček otázek ------------------------------------------------------ */

export interface Question {
  id: string
  /** Hodnota políčka. Musí být jedna z hodnot v `Pack.ladder`. */
  value: number
  /** Znění otázky, které uvidí hráči. */
  prompt: string
  /** Správná odpověď, odhaluje se až na povel moderátorky. */
  answer: string
}

export interface Category {
  id: string
  name: string
  questions: Question[]
}

export interface Pack {
  id: string
  name: string
  description: string
  /** Žebříček hodnot, vzestupně. Určuje počet řádků desky. */
  ladder: number[]
  categories: Category[]
  createdAt: number
  updatedAt: number
}

/* --- Hra ----------------------------------------------------------------- */

export interface Team {
  id: string
  name: string
  /** Index do palety barev týmů, 0 az 5. */
  color: number
  score: number
}

export type CellStatus = 'open' | 'won' | 'lost'

export interface CellState {
  status: CellStatus
  /** Tým, kterému se body připsaly. Jen u `won`. */
  teamId?: string
  /** Kolik bodů políčko nakonec přineslo nebo vzalo. */
  points?: number
}

export interface GameRules {
  /** Délka časomíry v sekundách. Nula znamená bez časomíry. */
  timerSeconds: number
  /** Odečítat týmu na tahu body za špatnou odpověď. */
  penalty: boolean
  /** Umožnit přiznat body jinému týmu, než je na tahu. */
  steal: boolean
  /** Skóre se při odečtu nezastaví pod nulou. */
  floorZero: boolean
  /** Počet polí Riziko! na desce. */
  wagerCells: number
  /** Zvuková odezva. */
  sound: boolean
}

export type GamePhase = 'board' | 'question' | 'reveal' | 'results'

/** Snímek kategorie zamrazený do hry, aby úpravy v administraci
 *  neměnily rozehranou desku. */
export interface BoardCategory {
  id: string
  name: string
}

export interface HistoryEntry {
  cellKey: string
  cell: CellState
  scores: Record<string, number>
  activeTeamIndex: number
  turnTeamIndex: number
  /** Kam vrátit tah po ruční změně. Null = tah nebyl přepsaný. */
  turnResumeIndex: number | null
  label: string
}

export interface GameState {
  id: string
  packId: string
  packName: string
  ladder: number[]
  categories: BoardCategory[]
  /** cellKey -> otázka, zamrazený snímek balíčku. */
  questions: Record<string, Question>
  /** cellKey -> stav políčka. */
  cells: Record<string, CellState>
  /** cellKey políček označených jako Riziko! */
  wagerCells: string[]
  teams: Team[]
  activeTeamIndex: number
  /** Aktuální pozice v pořadí tahů. Ruční klik ji posune na zvolený tým,
   *  aby další tah šel od něj a nikdo nehrál dvakrát po sobě. */
  turnTeamIndex: number
  /** Tým, který byl na tahu před ruční změnou. Null = bez přepisu. */
  turnResumeIndex: number | null
  rules: GameRules
  phase: GamePhase
  /** Otevřené políčko, pokud fáze není `board`. */
  openCell: string | null
  /** Sázka u pole Riziko! Null znamená běžné políčko. */
  wager: number | null
  startedAt: number
  history: HistoryEntry[]
}

/* --- Nastavení hry před startem ------------------------------------------ */

export interface GameSetup {
  packId: string
  categoryIds: string[]
  teams: Array<Pick<Team, 'name' | 'color'>>
  rules: GameRules
}

/** Klíč políčka v mřížce. */
export const cellKey = (categoryId: string, value: number): string =>
  `${categoryId}:${value}`
