/** Seznam her v Mučírně. Další hra je nová položka, ne přestavba. */
export interface GameEntry {
  slug: string
  title: string
  /** Krátká věta pod názvem. Co to je, ne jak se to ovládá. */
  tagline: string
  description: string
  route: string
  /** Kde se pro hru chystají otázky. */
  editRoute: string
  /** Kde se čtou výsledky odehraných her. Chybí u her, které žádné
   *  neukládají do sdílené databáze. */
  reportsRoute?: string
  /** Co hra potřebuje, aby šla vést. Ukáže se na dlaždici. */
  needs: string
  /** Hraje se s telefony účastníků, takže bez sdílené databáze
   *  se dá jen promítat. */
  needsShared: boolean
}

export const GAMES: GameEntry[] = [
  {
    slug: 'pojistuj',
    title: 'Pojišťuj!',
    tagline: 'Vědomostní souboj týmů',
    description:
      'Klasická deska kategorií a bodových hodnot. Týmy si volí políčko, ty odkrýváš otázky a rozdáváš body. Až šest týmů, časomíra a pole Riziko!, kde tým před otázkou vsadí část svých bodů.',
    route: '/pojistuj',
    editRoute: '/admin',
    needs: 'Notebook a plátno',
    needsShared: false,
  },
  {
    slug: 'kviz',
    title: 'Na kolik to dáš?',
    tagline: 'Rychlý kvíz pro každého v místnosti',
    description:
      'Otázka se čtyřmi možnostmi, nebo tvrzení na ano a ne. Účastníci hlasují z telefonů, sbírají body za správnost i rychlost a po každém kole si společně projdete vysvětlení.',
    route: '/kviz',
    editRoute: '/kviz/otazky',
    reportsRoute: '/kviz/vysledky',
    needs: 'Plátno a telefony účastníků',
    needsShared: true,
  },
]
