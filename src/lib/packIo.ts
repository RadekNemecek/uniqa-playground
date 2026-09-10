import type { Pack } from '@/types'
import { id } from '@/lib/id'
import { clone } from '@/lib/clone'

/** Stáhne balíček jako JSON soubor. */
export function downloadPack(pack: Pack): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = (pack.name || 'balicek')
    .trim()
    .toLowerCase()
    .replace(/[^a-zá-ž0-9]+/gi, '-')
    .replace(/^-|-$/g, '') || 'balicek'
  a.href = url
  a.download = `${safe}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Načte balíček ze souboru. Vrací novou kopii s novými id, aby se
 * nesrazila s existujícím záznamem v úložišti.
 */
export async function readPackFile(file: File): Promise<Pack> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  return importPack(raw)
}

export function importPack(raw: unknown): Pack {
  if (!raw || typeof raw !== 'object') throw new Error('Balíček má neplatný tvar.')
  const o = raw as Record<string, unknown>

  if (!Array.isArray(o.ladder) || o.ladder.length < 2) {
    throw new Error('Balíček musí mít aspoň dvě bodové hodnoty.')
  }
  if (!Array.isArray(o.categories) || o.categories.length < 1) {
    throw new Error('Balíček musí mít aspoň jednu kategorii.')
  }

  const ladder = o.ladder.map((v) => {
    const n = Math.round(Number(v))
    if (!Number.isFinite(n) || n < 10) throw new Error('Bodová hodnota musí být číslo aspoň 10.')
    return n
  })
  if (new Set(ladder).size !== ladder.length) {
    throw new Error('Bodové hodnoty se nesmí opakovat.')
  }

  const categories = o.categories.map((c, i) => {
    if (!c || typeof c !== 'object') throw new Error(`Kategorie ${i + 1} je poškozená.`)
    const cat = c as Record<string, unknown>
    const questionsRaw = Array.isArray(cat.questions) ? cat.questions : []
    const byValue = new Map<number, { prompt: string; answer: string }>()
    for (const q of questionsRaw) {
      if (!q || typeof q !== 'object') continue
      const qq = q as Record<string, unknown>
      const value = Math.round(Number(qq.value))
      if (!Number.isFinite(value)) continue
      byValue.set(value, {
        prompt: String(qq.prompt ?? ''),
        answer: String(qq.answer ?? ''),
      })
    }
    return {
      id: id('c'),
      name: String(cat.name ?? `Kategorie ${i + 1}`).slice(0, 30),
      questions: ladder.map((value) => {
        const found = byValue.get(value)
        return {
          id: id('q'),
          value,
          prompt: found?.prompt ?? '',
          answer: found?.answer ?? '',
        }
      }),
    }
  })

  const now = Date.now()
  const pack: Pack = {
    id: id('p'),
    name: String(o.name ?? 'Importovaný balíček').slice(0, 60) || 'Importovaný balíček',
    description: String(o.description ?? '').slice(0, 160),
    ladder: [...ladder].sort((a, b) => a - b),
    categories,
    createdAt: now,
    updatedAt: now,
  }
  return clone(pack)
}
