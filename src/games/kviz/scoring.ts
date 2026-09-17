/**
 * Body za správnou odpověď. Tvar je převzatý z Kahootu: kdo odpoví hned,
 * bere plný počet, kdo až na konci limitu, bere pořád polovinu. Rychlost
 * tak rozhoduje, ale neznalost se za ni neschová.
 */
export const BASE_POINTS = 1000

export function pointsFor(correct: boolean, elapsedMs: number, limitMs: number): number {
  if (!correct) return 0
  if (limitMs <= 0) return BASE_POINTS
  const t = Math.min(Math.max(elapsedMs, 0), limitMs)
  return Math.round(BASE_POINTS * (1 - t / limitMs / 2))
}
