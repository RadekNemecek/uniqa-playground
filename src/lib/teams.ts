/** Paleta týmů. Hex je tu proto, že plátno konfet a letící hodnota
 *  neumí číst CSS proměnné. Musí zůstat v souladu s tokens.css. */
export interface TeamColor {
  /** Jméno barvy, aby se tým nerozlišoval jen odstínem. */
  label: string
  hex: string
  cssVar: string
}

export const TEAM_COLORS: TeamColor[] = [
  { label: 'Ametyst', hex: '#A78BFA', cssVar: '--c-team-1' },
  { label: 'Tyrkys', hex: '#22D3EE', cssVar: '--c-team-2' },
  { label: 'Korál', hex: '#FB7185', cssVar: '--c-team-3' },
  { label: 'Limeta', hex: '#A3E635', cssVar: '--c-team-4' },
  { label: 'Jantar', hex: '#FBBF24', cssVar: '--c-team-5' },
  { label: 'Azur', hex: '#60A5FA', cssVar: '--c-team-6' },
]

export function teamColor(index: number): TeamColor {
  return TEAM_COLORS[index % TEAM_COLORS.length]!
}

/** Písmeno týmu. Slouží jako druhý rozlišovací znak vedle barvy. */
export function teamBadge(index: number): string {
  return String.fromCharCode(65 + (index % 26))
}

/** Formátování skóre, včetně znaménka u záporných hodnot. */
export function formatScore(n: number): string {
  return new Intl.NumberFormat('cs-CZ').format(n)
}
