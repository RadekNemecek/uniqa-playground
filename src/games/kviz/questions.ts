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
 * Sestaví kvíz.
 *
 * Bez stropu (`count` je nula) se hraje všechno, co ve vybraných
 * balíčcích je, jen zamíchané dohromady. Se stropem se losuje po
 * balíčcích kolem dokola, ne přes celý seznam najednou: dvacet otázek
 * ze čtyř balíčků by čistě náhodným výběrem klidně vytáhlo dvanáct
 * z jednoho, kdežto takhle vyjde z každého stejný díl a zbytek se dobere
 * z těch, kde ještě je z čeho brát. Pořadí se zamíchá až nakonec.
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

  // Nula je „všechny", takže stropem je celá zásoba.
  const total = ready.reduce((n, p) => n + p.items.length, 0)
  const limit = setup.count > 0 ? Math.min(setup.count, total) : total

  // Dvě kola výběru: nejdřív jen nové otázky, pak teprve odehrané.
  const fresh = withItems(ready, (q) => !avoid.has(q.id))
  const used = withItems(ready, (q) => avoid.has(q.id))

  const picked = roundRobin(fresh, limit)
  if (picked.length < limit) {
    picked.push(...roundRobin(used, limit - picked.length))
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
