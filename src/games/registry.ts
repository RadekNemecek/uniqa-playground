/** Seznam her v Playgroundu. Další hra je nová položka, ne přestavba. */
export interface GameEntry {
  slug: string
  title: string
  tagline: string
  description: string
  route: string
}

export const GAMES: GameEntry[] = [
  {
    slug: 'pojistuj',
    title: 'Pojišťuj!',
    tagline: 'Vědomostní souboj týmů',
    description:
      'Klasická deska kategorií a bodových hodnot. Jeden až šest týmů, vlastní otázky, časomíra a bonusová pole.',
    route: '/pojistuj',
  },
]
