import { id } from '@/lib/id'
import { clone } from '@/lib/clone'
import { loadImage, putImage } from '@/stores/quizImages'
import { IMAGE_MAX_CHARS } from './image'
import { BOOLEAN_COUNT, OPTION_COUNT } from './options'
import type { QuizImage, QuizItem, QuizKind, QuizPack } from './types'

/**
 * Vyvezený balíček nese obrázky s sebou.
 *
 * Bez nich by byl soubor na jiné instalaci rozbitý: odkazoval by na
 * dokumenty, které tam nejsou. Cenou je, že se JSON s obrázky počítá na
 * megabajty místo na kilobajty, což u souboru ke stažení nikomu nevadí.
 */
interface QuizPackFile extends QuizPack {
  images?: QuizImage[]
}

/** Stáhne balíček kvízu jako JSON soubor, i s obrázky otázek. */
export async function downloadQuizPack(pack: QuizPack): Promise<void> {
  const images: QuizImage[] = []
  for (const imageId of [...new Set(pack.items.map((i) => i.imageId).filter(Boolean))]) {
    const image = await loadImage(imageId as string)
    if (image) images.push(image)
  }

  const file: QuizPackFile = images.length > 0 ? { ...pack, images } : pack
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe =
    (pack.name || 'kviz')
      .trim()
      .toLowerCase()
      .replace(/[^a-zá-ž0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'kviz'
  a.href = url
  a.download = `${safe}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Načte balíček ze souboru. Vrací novou kopii s novými id, aby se nesrazila
 * s existujícím záznamem v úložišti.
 */
export async function readQuizPackFile(file: File): Promise<QuizPack> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  return importQuizPack(raw)
}

export async function importQuizPack(raw: unknown): Promise<QuizPack> {
  if (!raw || typeof raw !== 'object') throw new Error('Balíček má neplatný tvar.')
  const o = raw as Record<string, unknown>

  if (!Array.isArray(o.items) || o.items.length === 0) {
    throw new Error('Balíček musí mít aspoň jednu otázku.')
  }

  // Obrázky se zakládají znovu a pod novými id. Balíčky si obrázky
  // nesdílejí, jinak by smazání importovaného balíčku vzalo obrázek
  // tomu, ze kterého vznikl.
  const remap = await readImages(o.images)

  const items = o.items.map((raw, i) => readItem(raw, i, remap))

  const now = Date.now()
  const pack: QuizPack = {
    id: id('kp'),
    name: String(o.name ?? 'Importovaný balíček').slice(0, 60) || 'Importovaný balíček',
    description: String(o.description ?? '').slice(0, 160),
    items,
    createdAt: now,
    updatedAt: now,
  }
  return clone(pack)
}

/**
 * Uloží obrázky z importovaného souboru a vrátí převod starého id na
 * nové. Vadný obrázek import nezastaví: otázka se založí bez něj, aby
 * se kvůli jednomu souboru neztratila celá sada.
 */
async function readImages(raw: unknown): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!Array.isArray(raw)) return out

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = entry as Record<string, unknown>
    const source = String(o.id ?? '')
    const data = String(o.data ?? '')
    // Do `<img>` půjde jen to, co je opravdu obrázek a co by se sem
    // vešlo i přes rozhraní. Cizí soubor se nesmí stát cestou, jak do
    // aplikace dostat cokoli jiného.
    if (!source || !/^data:image\/[a-z+]+;base64,/i.test(data)) continue
    if (data.length > IMAGE_MAX_CHARS) continue

    const image: QuizImage = {
      id: id('ki'),
      mime: data.slice(5, data.indexOf(';')),
      w: Math.max(1, Math.round(Number(o.w) || 0)) || 1,
      h: Math.max(1, Math.round(Number(o.h) || 0)) || 1,
      data,
      bytes: Math.round(Number(o.bytes) || data.length * 0.75),
      createdAt: Date.now(),
    }
    try {
      await putImage(image)
      out.set(source, image.id)
    } catch (e) {
      console.error('Uložení obrázku z importu selhalo:', e)
    }
  }
  return out
}

function readItem(raw: unknown, index: number, images: Map<string, string>): QuizItem {
  if (!raw || typeof raw !== 'object') throw new Error(`Otázka ${index + 1} je poškozená.`)
  const o = raw as Record<string, unknown>

  // Chybějící možnosti se dopisují prázdné, ať se dá balíček dodělat
  // ve správě místo toho, aby ho import odmítl celý.
  const given = Array.isArray(o.options) ? o.options : []
  const options = Array.from({ length: OPTION_COUNT }, (_, i) => String(given[i] ?? '').trim())

  // Neznámý tvar je čtveřice možností. Starší soubory pole nemají vůbec.
  const kind: QuizKind = o.kind === 'boolean' ? 'boolean' : 'choice'
  const max = kind === 'boolean' ? BOOLEAN_COUNT : OPTION_COUNT
  const correct = Math.round(Number(o.correctIndex))
  return {
    id: id('i'),
    kind,
    prompt: String(o.prompt ?? '').trim(),
    options,
    correctIndex: Number.isFinite(correct) && correct >= 0 && correct < max ? correct : 0,
    note: String(o.note ?? '').trim().slice(0, 400),
    imageId: images.get(String(o.imageId ?? '')),
  }
}
