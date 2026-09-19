import { id } from '@/lib/id'
import type { QuizPack } from './types'

/** Otázka v ukázce: znění, správná odpověď, tři chybné, poučka. Správná
 *  je tu vždy první, ve hře se pořadí zamíchá. */
type Row = [prompt: string, correct: string, wrong: [string, string, string], note: string]

const ROWS: Row[] = [
  [
    'Jak se odborně říká částce, kterou si klient hradí z každé pojistné události sám?',
    'Spoluúčast',
    ['Pojistné', 'Pojistná částka', 'Storno poplatek'],
    'Čím vyšší spoluúčast, tím nižší pojistné. Klient tím na sebe bere malé škody a pojišťovně zůstávají ty velké.',
  ],
  [
    'Jak se nazývá doklad, kterým pojišťovna potvrzuje uzavření pojistné smlouvy?',
    'Pojistka',
    ['Pojistný certifikát', 'Zelená karta', 'Návrh na pojištění'],
    'Pojistka potvrzuje uzavření smlouvy. Zelená karta je doklad jen pro povinné ručení.',
  ],
  [
    'Jak se nazývá horní hranice pojistného plnění sjednaná ve smlouvě?',
    'Pojistná částka',
    ['Spoluúčast', 'Pojistné', 'Pojistná hodnota'],
    'Pojistná částka je strop, přes který pojišťovna neplní, i kdyby škoda byla vyšší.',
  ],
  [
    'Jak se nazývá období po uzavření smlouvy, ve kterém pojišťovna ještě neplní?',
    'Čekací doba',
    ['Výpovědní lhůta', 'Odkladná lhůta', 'Zkušební doba'],
    'Čekací doba brání tomu, aby se pojištění sjednávalo až ve chvíli, kdy člověk o události už ví.',
  ],
  [
    'Co kryje povinné ručení?',
    'Škodu, kterou provoz vozidla způsobí někomu jinému',
    ['Škodu na vlastním vozidle', 'Krádež vozidla', 'Poruchu vozidla'],
    'Povinné ručení chrání ty druhé. Na vlastní vůz je havarijní pojištění.',
  ],
  [
    'Jak se nazývá doklad, kterým řidič prokazuje sjednané povinné ručení?',
    'Zelená karta',
    ['Pojistka', 'Technický průkaz', 'Malý technický průkaz'],
    'Zelená karta platí i v zahraničí a je to mezinárodně uznávaný doklad.',
  ],
  [
    'Jak se nazývá sleva na pojistném za bezeškodní průběh?',
    'Bonus',
    ['Malus', 'Sleva za věrnost', 'Rabat'],
    'Bonus roste s počtem let bez nehody a při přepisu smlouvy si ho klient obvykle přenese.',
  ],
  [
    'Jak se nazývá přirážka k pojistnému po zaviněných nehodách?',
    'Malus',
    ['Bonus', 'Spoluúčast', 'Storno poplatek'],
    'Malus je opak bonusu. Systém bonus malus tím promítá chování řidiče do ceny.',
  ],
  [
    'Jak se označuje osoba, které pojišťovna vyplatí plnění v případě smrti pojištěného?',
    'Obmyšlená osoba',
    ['Pojistník', 'Pojištěný', 'Zákonný zástupce'],
    'Obmyšlenou osobu určuje pojistník. Bez ní se plnění řídí občanským zákoníkem.',
  ],
  [
    'Jak se nazývá životní pojištění, které kryje pouze riziko smrti a nespoří?',
    'Rizikové životní pojištění',
    ['Kapitálové životní pojištění', 'Investiční životní pojištění', 'Důchodové pojištění'],
    'Rizikové pojištění je nejlevnější cesta, jak zajistit rodinu. Nic se v něm nespoří.',
  ],
  [
    'Jak se nazývá plnění za poškození zdraví, které po úrazu zůstane natrvalo?',
    'Trvalé následky úrazu',
    ['Denní odškodné', 'Bolestné', 'Invalidní důchod'],
    'Trvalé následky se hodnotí procentem z pojistné částky podle rozsahu poškození.',
  ],
  [
    'Jak se nazývá připojištění, které vyplácí denní částku po dobu léčení úrazu?',
    'Denní odškodné',
    ['Trvalé následky úrazu', 'Pracovní neschopnost', 'Hospitalizace'],
    'Denní odškodné pokrývá dobu léčení a vyplácí se za každý den podle sjednané sazby.',
  ],
  [
    'Jakou povinnost má klient vůči dotazům pojišťovny při sjednání smlouvy?',
    'Odpovědět pravdivě a úplně',
    [
      'Odpovědět jen na to, co uzná za vhodné',
      'Nemá žádnou, ptát se má poradce',
      'Odpovědět až při pojistné události',
    ],
    'Neúplná nebo nepravdivá odpověď může vést ke krácení plnění nebo k odstoupení od smlouvy.',
  ],
  [
    'Která otázka klienta rozmluví víc?',
    'Otevřená',
    ['Uzavřená', 'Sugestivní', 'Řečnická'],
    'Otevřená otázka začíná slovy jak, proč nebo co a nedá se na ni odpovědět ano či ne.',
  ],
  [
    'Jak se nazývá technika, kdy klientovi vlastními slovy zopakuješ, co právě řekl?',
    'Parafráze',
    ['Sugesce', 'Argumentace', 'Zrcadlení postoje'],
    'Parafráze ověří, že jste si rozuměli, a klientovi dá najevo, že ho posloucháte.',
  ],
  [
    'Jak se nazývá námitka, kterou klient vysloví místo té skutečné?',
    'Zástupná námitka',
    ['Cenová námitka', 'Konečná námitka', 'Věcná námitka'],
    'Za zástupnou námitkou bývá nejistota nebo nedůvěra. Vyplatí se doptat, ne vyvracet.',
  ],
  [
    'Jak se nazývá fáze schůzky, ve které zjišťuješ, co klient doopravdy potřebuje?',
    'Analýza potřeb',
    ['Prezentace řešení', 'Uzavření obchodu', 'Navázání kontaktu'],
    'Bez analýzy potřeb je nabídka jen odhad a klient to pozná.',
  ],
  [
    'Kdo vykonává dohled nad pojišťovnami v České republice?',
    'Česká národní banka',
    ['Česká kancelář pojistitelů', 'Ministerstvo financí', 'Česká asociace pojišťoven'],
    'Dohled nad pojišťovnami převzala ČNB v roce 2006, do té doby ho měl samostatný úřad.',
  ],
  [
    'Co znamená zkratka ČKP?',
    'Česká kancelář pojistitelů',
    ['Česká komora pojišťoven', 'Český katalog produktů', 'Česká kancelář pojištěných'],
    'ČKP sdružuje pojistitele povinného ručení a spravuje garanční fond.',
  ],
  [
    'Z čeho se hradí škody způsobené nepojištěným vozidlem?',
    'Z garančního fondu České kanceláře pojistitelů',
    ['Ze státního rozpočtu', 'Z fondu zábrany škod', 'Z rezerv pojišťovny poškozeného'],
    'Garanční fond zaplatí poškozenému a částku pak vymáhá po nepojištěném viníkovi.',
  ],
]

/** Tvrzení: znění, jestli platí, a poučka. Na plátně i na telefonu se
 *  odpovídá ANO, nebo NE. */
type Claim = [prompt: string, holds: boolean, note: string]

const CLAIMS: Claim[] = [
  [
    'Povinné ručení kryje i škodu na vlastním voze viníka.',
    false,
    'Kryje jen škodu způsobenou někomu jinému. Na vlastní vůz je havarijní pojištění.',
  ],
  [
    'Čím vyšší spoluúčast si klient sjedná, tím nižší platí pojistné.',
    true,
    'Klient tím na sebe bere malé škody a pojišťovně zůstávají ty velké.',
  ],
  [
    'Pojistná částka je nejvyšší možné plnění, které pojišťovna vyplatí.',
    true,
    'Přes pojistnou částku pojišťovna neplní, i kdyby škoda byla vyšší.',
  ],
  [
    'Zelená karta nahrazuje pojistnou smlouvu.',
    false,
    'Zelená karta je jen doklad o povinném ručení, smlouvu nenahrazuje.',
  ],
  [
    'Pojistnou smlouvu lze vypovědět do dvou měsíců od jejího uzavření.',
    true,
    'Výpovědní doba je osmidenní a pojištění zanikne jejím uplynutím.',
  ],
]

/**
 * Ukázkový balíček kvízu. Založí se tlačítkem ve správě, aby si šlo hru
 * vyzkoušet dřív, než vznikne vlastní obsah. Jsou v něm oba tvary otázky,
 * ať je na první pohled vidět, že jdou míchat.
 */
export function demoQuizPack(): QuizPack {
  const now = Date.now()
  return {
    id: id('kp'),
    name: 'Ukázkový kvíz',
    description:
      'Obecné otázky z pojišťovnictví a práce s klientem. Slouží k vyzkoušení hry, nahraď ho vlastním obsahem.',
    items: [
      ...ROWS.map(([prompt, correct, wrong, note]) => ({
        id: id('i'),
        kind: 'choice' as const,
        prompt,
        // Správná je na prvním místě, protože se ve hře stejně zamíchá.
        options: [correct, ...wrong],
        correctIndex: 0,
        note,
      })),
      ...CLAIMS.map(([prompt, holds, note]) => ({
        id: id('i'),
        kind: 'boolean' as const,
        prompt,
        // Tvrzení znění možností nečte, ANO je vždycky 0.
        options: [],
        correctIndex: holds ? 0 : 1,
        note,
      })),
    ],
    createdAt: now,
    updatedAt: now,
  }
}
