import { reactive } from 'vue'
import type { Category, Pack, Question } from '@/types'
import { db } from '@/lib/db'
import { id } from '@/lib/id'
import { clone } from '@/lib/clone'
import { demoPack } from '@/games/riskuj/demoPack'

const DEFAULT_LADDER = [200, 400, 600, 800, 1000]

interface PacksState {
  packs: Pack[]
  loaded: boolean
}

const state = reactive<PacksState>({ packs: [], loaded: false })

let stop: (() => void) | null = null

export async function initPacks(): Promise<void> {
  if (stop) return
  await db().ready()
  stop = db().watchPacks((packs) => {
    state.packs = [...packs].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
    state.loaded = true
  })
  // Při úplně prvním spuštění dáme uživatelce něco, co si může prohlédnout.
  if (state.packs.length === 0) {
    await db().savePack(demoPack())
  }
}

/** Čtený stav balíčků. Zapisuje se výhradně přes funkce níže,
 *  aby změna vždy prošla úložištěm. */
export const packs = state

export function findPack(packId: string): Pack | undefined {
  return state.packs.find((p) => p.id === packId)
}

/* --- Tovární funkce ------------------------------------------------------ */

export function emptyQuestion(value: number): Question {
  return { id: id('q'), value, prompt: '', answer: '' }
}

export function emptyCategory(ladder: number[], name = ''): Category {
  return {
    id: id('c'),
    name,
    questions: ladder.map((v) => emptyQuestion(v)),
  }
}

export function emptyPack(name = 'Nový balíček'): Pack {
  const ladder = [...DEFAULT_LADDER]
  const now = Date.now()
  return {
    id: id('p'),
    name,
    description: '',
    ladder,
    categories: [
      emptyCategory(ladder, 'Kategorie 1'),
      emptyCategory(ladder, 'Kategorie 2'),
      emptyCategory(ladder, 'Kategorie 3'),
      emptyCategory(ladder, 'Kategorie 4'),
      emptyCategory(ladder, 'Kategorie 5'),
    ],
    createdAt: now,
    updatedAt: now,
  }
}

/* --- Operace ------------------------------------------------------------- */

export async function savePack(pack: Pack): Promise<void> {
  await db().savePack({ ...pack, updatedAt: Date.now() })
}

export async function createPack(name?: string): Promise<Pack> {
  const pack = emptyPack(name)
  await db().savePack(pack)
  return pack
}

export async function duplicatePack(source: Pack): Promise<Pack> {
  const now = Date.now()
  const copy: Pack = {
    ...clone(source),
    id: id('p'),
    name: `${source.name} (kopie)`,
    createdAt: now,
    updatedAt: now,
  }
  // Nové identifikátory, aby se kopie nepletla s originálem.
  copy.categories = copy.categories.map((c) => ({
    ...c,
    id: id('c'),
    questions: c.questions.map((q) => ({ ...q, id: id('q') })),
  }))
  await db().savePack(copy)
  return copy
}

export async function deletePack(packId: string): Promise<void> {
  await db().deletePack(packId)
}

/* --- Odvozené údaje ------------------------------------------------------ */

export function isQuestionReady(q: Question | undefined): boolean {
  return !!q && q.prompt.trim().length > 0 && q.answer.trim().length > 0
}

export function questionAt(
  pack: Pack,
  categoryId: string,
  value: number,
): Question | undefined {
  return pack.categories
    .find((c) => c.id === categoryId)
    ?.questions.find((q) => q.value === value)
}

/** Kolik otázek je hotových a kolik jich deska potřebuje. */
export function packProgress(pack: Pack): { done: number; total: number } {
  let done = 0
  for (const c of pack.categories) {
    for (const v of pack.ladder) {
      if (isQuestionReady(c.questions.find((q) => q.value === v))) done++
    }
  }
  return { done, total: pack.categories.length * pack.ladder.length }
}

/** Kategorie, které jsou vyplněné celé a smějí do hry. */
export function playableCategories(pack: Pack): Category[] {
  return pack.categories.filter((c) =>
    pack.ladder.every((v) => isQuestionReady(c.questions.find((q) => q.value === v))),
  )
}

export { DEFAULT_LADDER }
