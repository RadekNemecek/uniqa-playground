/** České skloňování podle počtu: 1 balíček, 2 balíčky, 5 balíčků. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  if (abs === 1) return one
  if (abs >= 2 && abs <= 4) return few
  return many
}

/** Počet i s tvarem slova, například „3 týmy". */
export function count(n: number, one: string, few: string, many: string): string {
  return `${n} ${plural(n, one, few, many)}`
}
