import { id } from '@/lib/id'
import { clone } from '@/lib/clone'
import { OPTION_COUNT } from './options'
import type { QuizItem, QuizPack } from './types'

/** Stáhne balíček kvízu jako JSON soubor. */
export function downloadQuizPack(pack: QuizPack): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
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

export function importQuizPack(raw: unknown): QuizPack {
  if (!raw || typeof raw !== 'object') throw new Error('Balíček má neplatný tvar.')
  const o = raw as Record<string, unknown>

  if (!Array.isArray(o.items) || o.items.length === 0) {
    throw new Error('Balíček musí mít aspoň jednu otázku.')
  }

  const items = o.items.map((raw, i) => readItem(raw, i))

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

function readItem(raw: unknown, index: number): QuizItem {
  if (!raw || typeof raw !== 'object') throw new Error(`Otázka ${index + 1} je poškozená.`)
  const o = raw as Record<string, unknown>

  // Chybějící možnosti se dopisují prázdné, ať se dá balíček dodělat
  // ve správě místo toho, aby ho import odmítl celý.
  const given = Array.isArray(o.options) ? o.options : []
  const options = Array.from({ length: OPTION_COUNT }, (_, i) => String(given[i] ?? '').trim())

  const correct = Math.round(Number(o.correctIndex))
  return {
    id: id('i'),
    prompt: String(o.prompt ?? '').trim(),
    options,
    correctIndex: Number.isFinite(correct) && correct >= 0 && correct < OPTION_COUNT ? correct : 0,
    note: String(o.note ?? '').trim().slice(0, 400),
  }
}
