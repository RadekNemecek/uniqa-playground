import { reactive } from 'vue'
import { db } from '@/lib/db'
import { id } from '@/lib/id'
import { clone } from '@/lib/clone'
import { OPTION_COUNT } from '@/games/kviz/options'
import type { QuizItem, QuizPack } from '@/games/kviz/types'
import { demoQuizPack } from '@/games/kviz/demoPack'

interface QuizPacksState {
  packs: QuizPack[]
  loaded: boolean
  /** Čtení odmítla databáze, typicky kvůli starým pravidlům Firestore. */
  denied: boolean
}

const state = reactive<QuizPacksState>({ packs: [], loaded: false, denied: false })

let stop: (() => void) | null = null

export async function initQuizPacks(): Promise<void> {
  if (stop) return
  await db().ready()

  // Na první snímek se musí počkat. U Firestore přijde asynchronně a bez
  // čekání bychom se rozhodovali podle prázdného seznamu.
  await new Promise<void>((resolve) => {
    let settled = false
    const done = (): void => {
      if (settled) return
      settled = true
      resolve()
    }
    stop = db().watchQuizPacks(
      (list) => {
        state.packs = [...list].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
        state.loaded = true
        state.denied = false
        done()
      },
      () => {
        state.denied = true
        state.loaded = true
        done()
      },
    )
    window.setTimeout(done, 4000)
  })
}

/**
 * Nasadí sledování znovu. Firestore listener po chybě umře a sám se
 * nezotaví, proto jej správa po odemčení obnoví.
 */
export async function reloadQuizPacks(): Promise<void> {
  stop?.()
  stop = null
  state.denied = false
  await initQuizPacks()
}

/** Čtený stav. Zapisuje se výhradně přes funkce níže, aby změna vždy
 *  prošla úložištěm. */
export const quizPacks = state

/* --- Tovární funkce ------------------------------------------------------ */

export function emptyQuizItem(): QuizItem {
  return {
    id: id('i'),
    prompt: '',
    options: Array.from({ length: OPTION_COUNT }, () => ''),
    correctIndex: 0,
    note: '',
  }
}

export function emptyQuizPack(name = 'Nový balíček'): QuizPack {
  const now = Date.now()
  return {
    id: id('kp'),
    name,
    description: '',
    items: [emptyQuizItem()],
    createdAt: now,
    updatedAt: now,
  }
}

/* --- Operace ------------------------------------------------------------- */

export async function saveQuizPack(pack: QuizPack): Promise<void> {
  await db().saveQuizPack({ ...pack, updatedAt: Date.now() })
}

export async function createQuizPack(name?: string): Promise<QuizPack> {
  const pack = emptyQuizPack(name)
  await db().saveQuizPack(pack)
  return pack
}

export async function createDemoQuizPack(): Promise<QuizPack> {
  const pack = demoQuizPack()
  await db().saveQuizPack(pack)
  return pack
}

export async function duplicateQuizPack(source: QuizPack): Promise<QuizPack> {
  const now = Date.now()
  const copy: QuizPack = {
    ...clone(source),
    id: id('kp'),
    name: `${source.name} (kopie)`,
    createdAt: now,
    updatedAt: now,
  }
  // Nové identifikátory, aby se kopie nepletla s originálem.
  copy.items = copy.items.map((q) => ({ ...q, id: id('i') }))
  await db().saveQuizPack(copy)
  return copy
}

export async function deleteQuizPack(packId: string): Promise<void> {
  await db().deleteQuizPack(packId)
}

/* --- Odvozené údaje ------------------------------------------------------ */

/** Otázka je hotová, když má znění i všechny čtyři možnosti. Poučka je
 *  ozdoba pro školení, ne podmínka. */
export function isItemReady(item: QuizItem | undefined): boolean {
  if (!item) return false
  if (item.prompt.trim().length === 0) return false
  if (item.options.length !== OPTION_COUNT) return false
  if (!item.options.every((o) => o.trim().length > 0)) return false
  return item.correctIndex >= 0 && item.correctIndex < OPTION_COUNT
}

export function readyItems(pack: QuizPack): QuizItem[] {
  return pack.items.filter(isItemReady)
}

export function quizPackProgress(pack: QuizPack): { done: number; total: number } {
  return { done: readyItems(pack).length, total: pack.items.length }
}

export type QuizPackReadiness = 'empty' | 'draft' | 'ready'

export function quizPackReadiness(pack: QuizPack): QuizPackReadiness {
  const { done, total } = quizPackProgress(pack)
  if (done === 0) return 'empty'
  return done === total ? 'ready' : 'draft'
}
