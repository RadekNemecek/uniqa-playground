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

/**
 * Kdy se to hrálo, lidsky.
 *
 * „Rozehráno" bez data neříká, jestli je to hra z dneška, nebo zbytek
 * po minulém školení, který se omylem otevře před novou skupinou.
 */
export function whenAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return 'právě teď'
  if (min < 60) return `před ${count(min, 'minutou', 'minutami', 'minutami')}`

  const hrs = Math.round(min / 60)
  if (hrs < 24) return `před ${count(hrs, 'hodinou', 'hodinami', 'hodinami')}`

  const days = Math.round(hrs / 24)
  if (days === 1) return 'včera'
  if (days < 7) return `před ${count(days, 'dnem', 'dny', 'dny')}`

  return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}
