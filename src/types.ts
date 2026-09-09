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
  /** Nepovinná poznámka pro moderátorku, hráčům se nikdy nezobrazí. */
  note?: string
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
  /** Počet polí Nepojištěno! na desce. */
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
  /** cellKey políček označených jako Nepojištěno! */
  wagerCells: string[]
  teams: Team[]
  activeTeamIndex: number
  rules: GameRules
  phase: GamePhase
  /** Otevřené políčko, pokud fáze není `board`. */
  openCell: string | null
  /** Sázka u pole Nepojištěno! Null znamená běžné políčko. */
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
