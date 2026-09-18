import type { Pack } from '@/types'
import type { QuizPack } from '@/games/kviz/types'
import { hashSecret } from '@/lib/hash'

/**
 * Datová vrstva Mučírny.
 *
 * Aplikace nikdy nemluví s konkrétním úložištěm přímo. Díky tomu běží
 * i bez nakonfigurovaného Firestore (režim `local`) a Firestore jde
 * kdykoli vyměnit bez zásahu do hry nebo administrace.
 */
export interface MucirnaDb {
  readonly kind: 'local' | 'firestore'
  /** Připraví spojení. U Firestore i anonymní přihlášení. */
  ready(): Promise<void>

  /** Sleduje seznam balíčků. Vrací funkci pro odhlášení. */
  watchPacks(onChange: (packs: Pack[]) => void): () => void

  savePack(pack: Pack): Promise<void>
  deletePack(packId: string): Promise<void>

  /**
   * Balíčky kvízu. Vlastní sada, oddělená od desky: každá hra spravuje
   * své otázky sama, protože se ptají na jiný tvar odpovědi.
   *
   * `onDenied` se ozve při chybně publikovaných pravidlech Firestore.
   * Čtení připravených balíčků je veřejné, heslo chrání jen zápisy.
   */
  watchQuizPacks(onChange: (packs: QuizPack[]) => void, onDenied?: () => void): () => void
  saveQuizPack(pack: QuizPack): Promise<void>
  deleteQuizPack(packId: string): Promise<void>

  /** Je už heslo do administrace vůbec nastavené? */
  hasPassword(): Promise<boolean>
  /** Nastaví heslo. Pokud už existuje, vyžaduje znalost toho starého. */
  setPassword(next: string, current?: string): Promise<void>
  /** Ověří heslo a odemkne zápis. Vrací úspěch. */
  unlock(password: string): Promise<boolean>
  /** Je aktuální relace odemčená? */
  isUnlocked(): boolean
  lock(): void
}

/* ------------------------------------------------------------------------ */
/* Implementace nad localStorage                                            */
/* ------------------------------------------------------------------------ */

const KEY_PACKS = 'playground.packs.v1'
const KEY_QUIZ_PACKS = 'playground.kviz.packs.v1'
const KEY_SECRET = 'playground.secret.v1'
const KEY_UNLOCK = 'playground.unlocked.v1'

function readPacks(): Pack[] {
  try {
    const raw = localStorage.getItem(KEY_PACKS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Pack[]) : []
  } catch {
    return []
  }
}

function writePacks(packs: Pack[]): void {
  localStorage.setItem(KEY_PACKS, JSON.stringify(packs))
}

function readQuizPacks(): QuizPack[] {
  try {
    const raw = localStorage.getItem(KEY_QUIZ_PACKS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QuizPack[]) : []
  } catch {
    return []
  }
}

function writeQuizPacks(packs: QuizPack[]): void {
  localStorage.setItem(KEY_QUIZ_PACKS, JSON.stringify(packs))
}

class LocalDb implements MucirnaDb {
  readonly kind = 'local' as const
  private listeners = new Set<(packs: Pack[]) => void>()
  private quizListeners = new Set<(packs: QuizPack[]) => void>()
  private unlocked = false

  async ready(): Promise<void> {
    this.unlocked = sessionStorage.getItem(KEY_UNLOCK) === '1'
    // Změna z jiné záložky se musí propsat i sem.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY_PACKS) this.emit()
      if (e.key === KEY_QUIZ_PACKS) this.emitQuiz()
    })
  }

  private emit(): void {
    const packs = readPacks()
    for (const fn of this.listeners) fn(packs)
  }

  watchPacks(onChange: (packs: Pack[]) => void): () => void {
    this.listeners.add(onChange)
    onChange(readPacks())
    return () => {
      this.listeners.delete(onChange)
    }
  }

  async savePack(pack: Pack): Promise<void> {
    const packs = readPacks()
    const at = packs.findIndex((p) => p.id === pack.id)
    if (at >= 0) packs[at] = pack
    else packs.push(pack)
    writePacks(packs)
    this.emit()
  }

  async deletePack(packId: string): Promise<void> {
    writePacks(readPacks().filter((p) => p.id !== packId))
    this.emit()
  }

  private emitQuiz(): void {
    const packs = readQuizPacks()
    for (const fn of this.quizListeners) fn(packs)
  }

  watchQuizPacks(onChange: (packs: QuizPack[]) => void): () => void {
    this.quizListeners.add(onChange)
    onChange(readQuizPacks())
    return () => {
      this.quizListeners.delete(onChange)
    }
  }

  async saveQuizPack(pack: QuizPack): Promise<void> {
    const packs = readQuizPacks()
    const at = packs.findIndex((p) => p.id === pack.id)
    if (at >= 0) packs[at] = pack
    else packs.push(pack)
    writeQuizPacks(packs)
    this.emitQuiz()
  }

  async deleteQuizPack(packId: string): Promise<void> {
    writeQuizPacks(readQuizPacks().filter((p) => p.id !== packId))
    this.emitQuiz()
  }

  async hasPassword(): Promise<boolean> {
    return localStorage.getItem(KEY_SECRET) !== null
  }

  async setPassword(next: string, current?: string): Promise<void> {
    const stored = localStorage.getItem(KEY_SECRET)
    if (stored !== null) {
      if (current === undefined || (await hashSecret(current)) !== stored) {
        throw new Error('Stávající heslo nesouhlasí.')
      }
    }
    localStorage.setItem(KEY_SECRET, await hashSecret(next))
    this.unlocked = true
    sessionStorage.setItem(KEY_UNLOCK, '1')
  }

  async unlock(password: string): Promise<boolean> {
    const stored = localStorage.getItem(KEY_SECRET)
    if (stored === null) return false
    const ok = (await hashSecret(password)) === stored
    if (ok) {
      this.unlocked = true
      sessionStorage.setItem(KEY_UNLOCK, '1')
    }
    return ok
  }

  isUnlocked(): boolean {
    return this.unlocked
  }

  lock(): void {
    this.unlocked = false
    sessionStorage.removeItem(KEY_UNLOCK)
  }
}

/* ------------------------------------------------------------------------ */
/* Hlášení chyb úložiště                                                     */
/* ------------------------------------------------------------------------ */

type DbErrorHandler = (message: string) => void

let onError: DbErrorHandler | null = null

/** Aplikace si sem zaregistruje, jak má chybu úložiště ukázat uživateli. */
export function setDbErrorHandler(handler: DbErrorHandler): void {
  onError = handler
}

/** Volá úložiště, když zápis odmítne server. */
export function reportDbError(message: string): void {
  onError?.(message)
}

/* ------------------------------------------------------------------------ */

let instance: MucirnaDb | null = null

/** Vrací aktivní úložiště. Firestore se připojí v kroku nasazení,
 *  do té doby a při jeho výpadku jede lokální režim. */
export function db(): MucirnaDb {
  if (!instance) instance = new LocalDb()
  return instance
}

export function setDb(next: MucirnaDb): void {
  instance = next
}
