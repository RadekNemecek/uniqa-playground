import { isItemReady } from '@/stores/quizPacks'
import { BOOLEAN_LABELS, OPTION_COUNT, kindOf } from './options'
import type { QuizItem, QuizPack, QuizQuestion, QuizSetup } from './types'

/** Zamíchání na místě by měnilo předlohu, proto vždy nová kopie. */
export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Pořadí možností. Míchají se indexy, ne texty: kdyby se dvě možnosti
 * shodou okolností psaly stejně, hledání podle textu by označilo tu
 * nesprávnou.
 */
export function shuffleOptions(item: QuizItem): { options: string[]; correctIndex: number } {
  const order = shuffle(item.options.map((_, i) => i))
  return {
    options: order.map((i) => item.options[i]!),
    correctIndex: order.indexOf(item.correctIndex),
  }
}

interface Pool {
  packName: string
  items: QuizItem[]
}

/** Zásobníky otázek po balíčcích, už zamíchané uvnitř. */
function pools(packs: QuizPack[], setup: QuizSetup): Pool[] {
  return packs
    .filter((p) => setup.packIds.includes(p.id))
    .map((p) => ({ packName: p.name, items: shuffle(p.items.filter(isItemReady)) }))
    .filter((p) => p.items.length > 0)
}

/** Kolik otázek je z daného výběru vůbec k dispozici. */
export function availableCount(packs: QuizPack[], setup: QuizSetup): number {
  return pools(packs, setup).reduce((n, p) => n + p.items.length, 0)
}

/**
 * Sestaví kvíz. Losuje se po balíčcích kolem dokola, ne přes celý seznam
 * najednou: deset otázek ze tří balíčků by čistě náhodným výběrem klidně
 * vytáhlo osm z jednoho. Pořadí se zamíchá až nakonec.
 *
 * `avoidIds` jsou otázky z minulých kol. Odveta má nabídnout nové, a teprve
 * když dojdou, sáhnout po odehraných.
 */
export function buildQuestions(
  packs: QuizPack[],
  setup: QuizSetup,
  avoidIds: readonly string[] = [],
): QuizQuestion[] {
  const avoid = new Set(avoidIds)
  const ready = pools(packs, setup)

  // Dvě kola výběru: nejdřív jen nové otázky, pak teprve odehrané.
  const fresh = withItems(ready, (q) => !avoid.has(q.id))
  const used = withItems(ready, (q) => avoid.has(q.id))

  const picked = roundRobin(fresh, setup.count)
  if (picked.length < setup.count) {
    picked.push(...roundRobin(used, setup.count - picked.length))
  }

  return shuffle(picked).map(({ item, packName }) => ({
    qid: item.id,
    kind: kindOf(item),
    prompt: item.prompt,
    ...framedOptions(item),
    note: item.note,
    imageId: item.imageId,
    packName,
  }))
}

/**
 * Možnosti tak, jak půjdou na plátno. Tvrzení se nemíchá: Pravda je
 * vždycky A. Předvídatelné pořadí je u dvou možností přednost, ne
 * nedbalost, protože hráč na telefonu nevidí jejich znění.
 */
function framedOptions(item: QuizItem): { options: string[]; correctIndex: number } {
  if (kindOf(item) === 'boolean') {
    return {
      options: [...BOOLEAN_LABELS],
      correctIndex: item.correctIndex === 1 ? 1 : 0,
    }
  }
  return shuffleOptions(item)
}

function withItems(list: Pool[], keep: (item: QuizItem) => boolean): Pool[] {
  return list
    .map((p) => ({ ...p, items: p.items.filter(keep) }))
    .filter((p) => p.items.length > 0)
}

interface Picked {
  item: QuizItem
  packName: string
}

/** Bere z balíčků střídavě, dokud je z čeho brát. */
function roundRobin(list: Pool[], limit: number): Picked[] {
  const order = shuffle(list).map((p) => ({ ...p, items: [...p.items] }))
  const out: Picked[] = []
  while (out.length < limit) {
    let took = false
    for (const pool of order) {
      if (out.length >= limit) break
      const item = pool.items.shift()
      if (!item) continue
      out.push({ item, packName: pool.packName })
      took = true
    }
    if (!took) break
  }
  return out
}

/** Kolik možností otázka potřebuje. Vystaveno kvůli editoru. */
export { OPTION_COUNT }
