import type { GameState } from '@/types'

/**
 * Archiv odehraných her Pojišťuj!
 *
 * Z kvízu zůstane po hře vyhodnocení, z desky dosud nezůstalo nic: hra
 * skončila, moderátorka klikla na Konec a půlhodina školení se ztratila.
 * Přitom právě tohle je to, co se ukazuje managementu, ne že se hrálo,
 * ale co z toho vyšlo a která kategorie týmu nesedla.
 *
 * Ukládá se jako vyhodnocení kvízu do sdílené databáze týmu, přes
 * `db().saveRun()`. Dřív ležel archiv jen v prohlížeči notebooku, ze
 * kterého se hrálo, takže kolegyně ho neviděla a s jiným počítačem
 * zmizel. Tady jsou jen tvar záznamu a lokální úložiště pro režim bez
 * Firestore; odtud se po připojení záznamy jednou přestěhují nahoru.
 */

const KEY = 'playground.runs.pojistuj.v1'
/** Kolik her si pamatuje lokální režim. Starší se odsouvají, ať
 *  localStorage neroste. */
const KEEP = 50

export interface CategoryScore {
  name: string
  /** Kolik políček kategorie někdo uhodl. */
  won: number
  /** Kolik jich zůstalo nepojištěných. */
  lost: number
}

export interface TeamScore {
  name: string
  color: number
  score: number
}

export interface PojistujRun {
  schema: 1
  id: string
  /** Koho se to týkalo. Prázdné, když se skupina nepojmenovala. */
  groupName: string
  /** Kdo školil. Starší záznamy ho nemají. */
  trainer?: string
  packName: string
  startedAt: number
  finishedAt: number
  teams: TeamScore[]
  categories: CategoryScore[]
}

export function readLocalRuns(): PojistujRun[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PojistujRun[]) : []
  } catch {
    return []
  }
}

export function deleteLocalRun(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(readLocalRuns().filter((r) => r.id !== id)))
  } catch {
    /* soukromé okno */
  }
}

/** Po přestěhování do sdílené databáze. */
export function clearLocalRuns(ids: string[]): void {
  const gone = new Set(ids)
  try {
    const rest = readLocalRuns().filter((r) => !gone.has(r.id))
    if (rest.length) localStorage.setItem(KEY, JSON.stringify(rest))
    else localStorage.removeItem(KEY)
  } catch {
    /* soukromé okno */
  }
}

/** Sestaví záznam ze stavu hry. Čte jen to, co je v něm zamrazené. */
export function buildRun(game: GameState, groupName: string): PojistujRun {
  const teams: TeamScore[] = [...game.teams]
    .sort((a, b) => b.score - a.score)
    .map((t) => ({ name: t.name, color: t.color, score: t.score }))

  const categories: CategoryScore[] = game.categories.map((cat) => {
    let won = 0
    let lost = 0
    for (const value of game.ladder) {
      const state = game.cells[`${cat.id}:${value}`]
      if (state?.status === 'won') won += 1
      else if (state?.status === 'lost') lost += 1
    }
    return { name: cat.name, won, lost }
  })

  return {
    schema: 1,
    id: game.id,
    groupName,
    trainer: game.trainer ?? '',
    packName: game.packName,
    startedAt: game.startedAt,
    finishedAt: Date.now(),
    teams,
    categories,
  }
}

/**
 * Zapíše odehranou hru do prohlížeče.
 *
 * Klíčem je id hry, takže opakovaný zápis (obnovení stránky na
 * výsledcích, návrat na desku a zpět) záznam přepíše místo aby ho
 * zdvojil.
 */
export function saveLocalRun(run: PojistujRun): void {
  try {
    const runs = readLocalRuns().filter((r) => r.id !== run.id)
    runs.push(run)
    runs.sort((a, b) => b.finishedAt - a.finishedAt)
    localStorage.setItem(KEY, JSON.stringify(runs.slice(0, KEEP)))
  } catch {
    /* soukromé okno nebo plné úložiště: archiv je bonus, ne podmínka hry */
  }
}

/** Nejhůř zvládnutá kategorie. Null, když se ještě nic nehrálo. */
export function weakest(run: PojistujRun): CategoryScore | null {
  const played = run.categories.filter((c) => c.won + c.lost > 0)
  if (played.length === 0) return null
  return played.reduce((worst, c) =>
    c.lost / (c.won + c.lost) > worst.lost / (worst.won + worst.lost) ? c : worst,
  )
}
