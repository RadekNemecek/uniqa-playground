/**
 * Co si počítač pamatuje o lidech, kteří u něj školili.
 *
 * Skupina se do přípravy nepředvyplňuje. Dřív tam z minula zůstala
 * „Obchod Morava" a archiv se zanášel chybou, kterou nikdo nezkontroloval.
 * Naposledy použité skupiny se proto jen nabízejí v poli, vybrat je musí
 * člověk sám. Seznam je společný všem hrám i Výslechu: jedna skupina
 * obvykle projde kvízem i zpětnou vazbou týž den.
 *
 * Notebook bývá sdílený, takže se při odhlášení všechno zahodí.
 */

const KEY_GROUPS = 'mucirna.groups.v1'
const MAX_GROUPS = 8

/** Klíče z doby, kdy se skupina a lektor předvyplňovali z minula. */
const LEGACY = ['playground.kviz.group.v1', 'playground.vyslech.trainer.v1']

export function recentGroups(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_GROUPS) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter((g): g is string => typeof g === 'string' && g.length > 0) : []
  } catch {
    return []
  }
}

export function rememberGroup(name: string): void {
  const clean = name.trim()
  if (!clean) return
  const next = [clean, ...recentGroups().filter((g) => g.toLocaleLowerCase('cs') !== clean.toLocaleLowerCase('cs'))]
  try {
    localStorage.setItem(KEY_GROUPS, JSON.stringify(next.slice(0, MAX_GROUPS)))
  } catch {
    /* soukromé okno */
  }
}

export function forgetPersonal(): void {
  try {
    for (const key of [KEY_GROUPS, ...LEGACY]) localStorage.removeItem(key)
  } catch {
    /* soukromé okno */
  }
}

/** Staré klíče už nic nečtou, jen by na sdíleném notebooku ležely. */
export function dropLegacyKeys(): void {
  try {
    for (const key of LEGACY) localStorage.removeItem(key)
  } catch {
    /* soukromé okno */
  }
}
