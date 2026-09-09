import type { Pack } from '@/types'
import { id } from '@/lib/id'

type Row = [value: number, prompt: string, answer: string]

const CONTENT: Array<[string, Row[]]> = [
  [
    'Pojmy z pojištění',
    [
      [200, 'Jak se odborně říká částce, kterou si klient hradí z každé pojistné události sám?', 'Spoluúčast'],
      [400, 'Jak se nazývá doklad, kterým pojišťovna potvrzuje uzavření pojistné smlouvy?', 'Pojistka'],
      [600, 'Jak se nazývá horní hranice plnění sjednaná ve smlouvě?', 'Pojistná částka, tedy limit pojistného plnění'],
      [800, 'Jak se nazývá období po uzavření smlouvy, ve kterém pojišťovna ještě neplní?', 'Čekací doba'],
      [1000, 'Jak se nazývá zásada, podle které pojištění nesmí být zdrojem obohacení?', 'Zásada odškodnění, tedy princip indemnity'],
    ],
  ],
  [
    'Povinné ručení',
    [
      [200, 'Co povinné ručení kryje?', 'Škodu, kterou provoz vozidla způsobí někomu jinému'],
      [400, 'Jak se nazývá doklad, kterým řidič prokazuje sjednané povinné ručení?', 'Zelená karta'],
      [600, 'Kryje povinné ručení i škodu na vlastním vozidle toho, kdo nehodu zavinil?', 'Ne, na to slouží havarijní pojištění'],
      [800, 'Jak se nazývá sleva na pojistném za bezeškodní průběh?', 'Bonus'],
      [1000, 'Jak se nazývá přirážka k pojistnému po zaviněných nehodách?', 'Malus'],
    ],
  ],
  [
    'Život a úraz',
    [
      [200, 'Jak se označuje osoba, které pojišťovna vyplatí plnění v případě smrti pojištěného?', 'Obmyšlená osoba'],
      [400, 'Jak se nazývá životní pojištění, které kryje pouze riziko smrti a nespoří?', 'Rizikové životní pojištění'],
      [600, 'Jak se nazývá plnění za poškození zdraví, které po úrazu zůstane natrvalo?', 'Trvalé následky úrazu'],
      [800, 'Jak se nazývá připojištění, které vyplácí denní částku po dobu léčení úrazu?', 'Denní odškodné'],
      [1000, 'Jakou povinnost má klient při sjednání smlouvy vůči dotazům pojišťovny?', 'Odpovědět pravdivě a úplně, tedy informační povinnost'],
    ],
  ],
  [
    'Práce s klientem',
    [
      [200, 'Která otázka klienta rozmluví víc, otevřená, nebo uzavřená?', 'Otevřená'],
      [400, 'Jak se nazývá technika, kdy klientovi vlastními slovy zopakuješ, co právě řekl?', 'Parafráze'],
      [600, 'Čeho by měl obchodník na schůzce dělat víc, mluvit, nebo naslouchat?', 'Naslouchat'],
      [800, 'Jak se nazývá námitka, kterou klient vysloví místo té skutečné?', 'Zástupná námitka'],
      [1000, 'Jak se nazývá fáze schůzky, ve které zjišťuješ, co klient doopravdy potřebuje?', 'Analýza potřeb'],
    ],
  ],
  [
    'Zkratky a instituce',
    [
      [200, 'Kolik měsíců trvá pojistné období, když klient platí jednou ročně?', 'Dvanáct'],
      [400, 'Co znamená zkratka ČNB a jakou roli má v pojišťovnictví?', 'Česká národní banka, vykonává dohled nad pojišťovnami'],
      [600, 'Co znamená zkratka ČKP?', 'Česká kancelář pojistitelů'],
      [800, 'Z jakého fondu se hradí škody způsobené nepojištěným vozidlem?', 'Z garančního fondu České kanceláře pojistitelů'],
      [1000, 'Co znamená zkratka IDD v oblasti distribuce pojištění?', 'Insurance Distribution Directive, tedy směrnice o distribuci pojištění'],
    ],
  ],
]

/** Ukázkový balíček, který se vytvoří při prvním spuštění, aby aplikace
 *  nezačínala prázdnou obrazovkou. Je určený k přepsání vlastním obsahem. */
export function demoPack(): Pack {
  const now = Date.now()
  return {
    id: id('p'),
    name: 'Ukázkový balíček',
    description:
      'Obecné otázky z pojišťovnictví a práce s klientem. Slouží k vyzkoušení hry, nahraď ho vlastním obsahem.',
    ladder: [200, 400, 600, 800, 1000],
    categories: CONTENT.map(([name, rows]) => ({
      id: id('c'),
      name,
      questions: rows.map(([value, prompt, answer]) => ({
        id: id('q'),
        value,
        prompt,
        answer,
      })),
    })),
    createdAt: now,
    updatedAt: now,
  }
}
