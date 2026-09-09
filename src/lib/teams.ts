/** Paleta týmů. Hex je tu proto, že plátno konfet a letící hodnota
 *  neumí číst CSS proměnné. Musí zůstat v souladu s tokens.css. */
export interface TeamColor {
  /** Jméno barvy, aby se tým nerozlišoval jen odstínem. */
  label: string
  hex: string
  cssVar: string
}

export const TEAM_COLORS: TeamColor[] = [
  { label: 'Azur', hex: '#7CC0F0', cssVar: '--c-team-1' },
  { label: 'Tyrkys', hex: '#55D6CE', cssVar: '--c-team-2' },
  { label: 'Limeta', hex: '#ABDD6B', cssVar: '--c-team-3' },
  { label: 'Levandule', hex: '#B7A6F2', cssVar: '--c-team-4' },
  { label: 'Růžová', hex: '#F79DC6', cssVar: '--c-team-5' },
  { label: 'Písek', hex: '#EFC08D', cssVar: '--c-team-6' },
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
