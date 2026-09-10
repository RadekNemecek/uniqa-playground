import { computed, reactive, watch } from 'vue'
import type {
  BoardCategory,
  CellState,
  GameSetup,
  GameState,
  HistoryEntry,
  Pack,
  Question,
  Team,
} from '@/types'
import { cellKey } from '@/types'
import { id } from '@/lib/id'
import { clone } from '@/lib/clone'

const STORAGE_KEY = 'playground.game.v1'

interface Wrapper {
  current: GameState | null
  restored: boolean
}

const store = reactive<Wrapper>({ current: null, restored: false })

/* --- Obnova po zavření nebo pádu prohlížeče ------------------------------ */

export function restoreGame(): void {
  if (store.restored) return
  store.restored = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GameState
      // Starší uložené hry ještě turnTeamIndex / turnResumeIndex neměly.
      if (typeof parsed.turnTeamIndex !== 'number') {
        parsed.turnTeamIndex = parsed.activeTeamIndex
      }
      if (parsed.turnResumeIndex === undefined) {
        parsed.turnResumeIndex =
          parsed.activeTeamIndex !== parsed.turnTeamIndex ? parsed.turnTeamIndex : null
        // Po starém modelu byl turn kotva a active přepis; sjednotíme na nový.
        if (parsed.turnResumeIndex !== null) {
          parsed.turnTeamIndex = parsed.activeTeamIndex
        }
      }
      for (const entry of parsed.history ?? []) {
        if (typeof entry.turnTeamIndex !== 'number') {
          entry.turnTeamIndex = entry.activeTeamIndex
        }
        if (entry.turnResumeIndex === undefined) {
          entry.turnResumeIndex = null
        }
      }
      store.current = parsed
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

watch(
  () => store.current,
  (g) => {
    if (g) localStorage.setItem(STORAGE_KEY, JSON.stringify(g))
    else localStorage.removeItem(STORAGE_KEY)
  },
  { deep: true },
)

/* --- Zakládání hry ------------------------------------------------------- */

function pickWagerCells(keys: string[], ladder: number[], count: number): string[] {
  if (count <= 0 || keys.length === 0) return []
  // Bonus dává smysl spíš u vyšších hodnot, tam je sázka zajímavá.
  const lowest = ladder[0]
  const pool = keys.filter((k) => Number(k.split(':')[1]) > lowest)
  const source = pool.length >= count ? pool : keys
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function startGame(pack: Pack, setup: GameSetup): GameState {
  const categories: BoardCategory[] = setup.categoryIds
    .map((cid) => pack.categories.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, name: c.name }))

  const questions: Record<string, Question> = {}
  const cells: Record<string, CellState> = {}

  for (const cat of categories) {
    const source = pack.categories.find((c) => c.id === cat.id)!
    for (const value of pack.ladder) {
      const q = source.questions.find((x) => x.value === value)
      if (!q) continue
      const key = cellKey(cat.id, value)
      // Otázky se do hry zamrazí. Úprava balíčku uprostřed hry nesmí
      // změnit desku, která už běží na projektoru.
      questions[key] = clone(q)
      cells[key] = { status: 'open' }
    }
  }

  const teams: Team[] = setup.teams.map((t, i) => ({
    id: id('t'),
    name: t.name.trim() || `Tým ${i + 1}`,
    color: t.color,
    score: 0,
  }))

  const game: GameState = {
    id: id('g'),
    packId: pack.id,
    packName: pack.name,
    ladder: [...pack.ladder],
    categories,
    questions,
    cells,
    wagerCells: pickWagerCells(Object.keys(cells), pack.ladder, setup.rules.wagerCells),
    teams,
    activeTeamIndex: 0,
    turnTeamIndex: 0,
    turnResumeIndex: null,
    rules: {
      ...setup.rules,
      floorZero: setup.rules.floorZero ?? true,
    },
    phase: 'board',
    openCell: null,
    wager: null,
    startedAt: Date.now(),
    history: [],
  }

  store.current = game
  return game
}

export function endGame(): void {
  store.current = null
}

/* --- Přístup ------------------------------------------------------------- */

export const game = computed(() => store.current)

export const hasGame = computed(() => store.current !== null)

export const activeTeam = computed<Team | null>(() => {
  const g = store.current
  return g ? (g.teams[g.activeTeamIndex] ?? null) : null
})

export const openQuestion = computed<Question | null>(() => {
  const g = store.current
  return g && g.openCell ? (g.questions[g.openCell] ?? null) : null
})

export const remainingCells = computed(() => {
  const g = store.current
  if (!g) return 0
  return Object.values(g.cells).filter((c) => c.status === 'open').length
})

export const ranking = computed<Team[]>(() => {
  const g = store.current
  if (!g) return []
  return [...g.teams].sort((a, b) => b.score - a.score)
})

export function teamById(teamId: string | undefined): Team | undefined {
  if (!teamId) return undefined
  return store.current?.teams.find((t) => t.id === teamId)
}

export function isWagerCell(key: string): boolean {
  return store.current?.wagerCells.includes(key) ?? false
}

/** Nejvyšší možná sázka: co má tým na kontě, nejméně však nejvyšší
 *  hodnota na desce, aby šlo vsadit i při nule. */
export function maxWager(): number {
  const g = store.current
  if (!g) return 0
  const top = Math.max(...g.ladder)
  return Math.max(top, activeTeam.value?.score ?? 0)
}

/* --- Průběh -------------------------------------------------------------- */

export function selectCell(key: string): void {
  const g = store.current
  if (!g || g.phase !== 'board') return
  if (g.cells[key]?.status !== 'open') return
  g.openCell = key
  g.wager = null
  g.phase = 'question'
}

/** Potvrzení sázky u pole Riziko! */
export function setWager(amount: number): void {
  const g = store.current
  if (!g) return
  g.wager = Math.max(0, Math.round(amount))
}

export function revealAnswer(): void {
  const g = store.current
  if (!g || g.phase !== 'question') return
  g.phase = 'reveal'
}

/** Zavře otázku bez bodování. Políčko zůstane otevřené. */
export function cancelQuestion(): void {
  const g = store.current
  if (!g || g.phase === 'board' || g.phase === 'results') return
  g.openCell = null
  g.wager = null
  g.phase = 'board'
}

function pointsForOpenCell(g: GameState): number {
  if (g.wager !== null) return g.wager
  const key = g.openCell
  return key ? Number(key.split(':')[1]) : 0
}

/** Odečte body. Při floorZero nesmí skóre klesnout pod nulu. */
function deduct(team: Team, amount: number, floorZero: boolean): number {
  const take = floorZero ? Math.min(amount, Math.max(0, team.score)) : amount
  team.score -= take
  return take
}

/**
 * Vyhodnotí otevřenou otázku.
 * @param winnerId tým, kterému se body připíšou, nebo null, když neuhodl nikdo.
 */
export function resolveQuestion(winnerId: string | null): void {
  const g = store.current
  if (!g || g.phase !== 'reveal' || !g.openCell) return

  const key = g.openCell
  const points = pointsForOpenCell(g)
  const active = g.teams[g.activeTeamIndex]
  const wagered = g.wager !== null
  const floorZero = g.rules.floorZero !== false

  // Snímek pro tlačítko Zpět, ještě před jakoukoli změnou.
  const entry: HistoryEntry = {
    cellKey: key,
    cell: { ...g.cells[key] },
    scores: Object.fromEntries(g.teams.map((t) => [t.id, t.score])),
    activeTeamIndex: g.activeTeamIndex,
    turnTeamIndex: g.turnTeamIndex,
    turnResumeIndex: g.turnResumeIndex,
    label: '',
  }

  const winner = winnerId ? g.teams.find((t) => t.id === winnerId) : undefined
  const activeFailed = !winner || winner.id !== active?.id

  if (winner) {
    winner.score += points
    g.cells[key] = { status: 'won', teamId: winner.id, points }
    entry.label = `${winner.name} +${points}`
  } else {
    g.cells[key] = { status: 'lost', points: 0 }
    entry.label = 'Nikdo neuhodl'
  }

  // Sázka se týmu na tahu odečte vždy, to je podstata pole Riziko!.
  // Minusové body mimo sázku se uplatní jen podle nastavení.
  if (activeFailed && active && (wagered || g.rules.penalty)) {
    const taken = deduct(active, points, floorZero)
    g.cells[key] = { ...g.cells[key], points: winner ? points : -taken }
    if (taken > 0) entry.label += `, ${active.name} -${taken}`
  }

  g.history.push(entry)
  if (g.history.length > 50) g.history.shift()

  g.openCell = null
  g.wager = null
  // Další tah jde od týmu, který teď doopravdy hrál (včetně ruční změny).
  const next = g.teams.length ? (g.turnTeamIndex + 1) % g.teams.length : 0
  g.turnTeamIndex = next
  g.activeTeamIndex = next
  g.turnResumeIndex = null

  const open = Object.values(g.cells).some((c) => c.status === 'open')
  g.phase = open ? 'board' : 'results'
}

export const canUndo = computed(() => (store.current?.history.length ?? 0) > 0)

export function undo(): void {
  const g = store.current
  if (!g) return
  const entry = g.history.pop()
  if (!entry) return
  g.cells[entry.cellKey] = { ...entry.cell }
  for (const team of g.teams) {
    if (entry.scores[team.id] !== undefined) team.score = entry.scores[team.id]!
  }
  g.activeTeamIndex = entry.activeTeamIndex
  g.turnTeamIndex = entry.turnTeamIndex
  g.turnResumeIndex = entry.turnResumeIndex
  g.openCell = null
  g.wager = null
  g.phase = 'board'
}

export function setActiveTeam(index: number): void {
  const g = store.current
  if (!g || index < 0 || index >= g.teams.length) return
  if (index === g.activeTeamIndex) return

  // První odbočení z pořadí si pamatujeme, kam se vrátit.
  if (g.turnResumeIndex === null) {
    g.turnResumeIndex = g.turnTeamIndex
  }
  g.activeTeamIndex = index
  g.turnTeamIndex = index
  // Klik zpět na původní tým přepis zruší.
  if (g.turnResumeIndex === index) {
    g.turnResumeIndex = null
  }
}

/** Vrátí tah na tým, který byl na řadě před ruční změnou. */
export function restoreTurnOrder(): void {
  const g = store.current
  if (!g || g.turnResumeIndex === null) return
  g.activeTeamIndex = g.turnResumeIndex
  g.turnTeamIndex = g.turnResumeIndex
  g.turnResumeIndex = null
}

export const turnOverridden = computed(() => {
  const g = store.current
  return !!g && g.turnResumeIndex !== null
})

export const turnTeam = computed<Team | null>(() => {
  const g = store.current
  if (!g || g.turnResumeIndex === null) return null
  return g.teams[g.turnResumeIndex] ?? null
})

export function showResults(): void {
  const g = store.current
  if (!g) return
  g.phase = 'results'
}

export function backToBoard(): void {
  const g = store.current
  if (!g) return
  g.phase = 'board'
}

/** Stejné týmy, kategorie a pravidla, nová deska od začátku. */
export function rematch(): void {
  const g = store.current
  if (!g) return
  for (const team of g.teams) team.score = 0
  for (const key of Object.keys(g.cells)) {
    g.cells[key] = { status: 'open' }
  }
  g.wagerCells = pickWagerCells(Object.keys(g.cells), g.ladder, g.rules.wagerCells)
  g.history = []
  g.activeTeamIndex = 0
  g.turnTeamIndex = 0
  g.turnResumeIndex = null
  g.openCell = null
  g.wager = null
  g.phase = 'board'
  g.startedAt = Date.now()
}
