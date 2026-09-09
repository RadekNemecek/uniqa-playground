import type { Pack } from '@/types'
import { hashSecret } from '@/lib/hash'

/**
 * Datová vrstva Playgroundu.
 *
 * Aplikace nikdy nemluví s konkrétním úložištěm přímo. Díky tomu běží
 * i bez nakonfigurovaného Firestore (režim `local`) a Firestore jde
 * kdykoli vyměnit bez zásahu do hry nebo administrace.
 */
export interface PlaygroundDb {
  readonly kind: 'local' | 'firestore'
  /** Připraví spojení. U Firestore i anonymní přihlášení. */
  ready(): Promise<void>

  /** Sleduje seznam balíčků. Vrací funkci pro odhlášení. */
  watchPacks(onChange: (packs: Pack[]) => void): () => void

  savePack(pack: Pack): Promise<void>
  deletePack(packId: string): Promise<void>

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

class LocalDb implements PlaygroundDb {
  readonly kind = 'local' as const
  private listeners = new Set<(packs: Pack[]) => void>()
  private unlocked = false

  async ready(): Promise<void> {
    this.unlocked = sessionStorage.getItem(KEY_UNLOCK) === '1'
    // Změna z jiné záložky se musí propsat i sem.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY_PACKS) this.emit()
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

let instance: PlaygroundDb | null = null

/** Vrací aktivní úložiště. Firestore se připojí v kroku nasazení,
 *  do té doby a při jeho výpadku jede lokální režim. */
export function db(): PlaygroundDb {
  if (!instance) instance = new LocalDb()
  return instance
}

export function setDb(next: PlaygroundDb): void {
  instance = next
}
