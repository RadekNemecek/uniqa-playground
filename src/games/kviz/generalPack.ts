import { id } from '@/lib/id'
import type { QuizItem, QuizPack } from './types'

/**
 * Všeobecné znalosti pro rodinu s dětmi kolem jedenácti a třinácti let.
 *
 * Látka sahá tam, kam sahá druhý stupeň: zeměpis, vesmír, příroda, lidské
 * tělo, české dějiny, trochu počtů a sportu. Děti to mají čerstvě ze
 * školy, rodiče z paměti, takže nikdo nemá náskok zadarmo. Pár otázek
 * je schválně chyták pro dospělé (nejbližší hvězda, násobilka na čas).
 */

/** Otázka se čtyřmi možnostmi: znění, správná, tři chybné, poučka.
 *  Správná je vždy první, ve hře se pořadí zamíchá. */
type Row = [prompt: string, correct: string, wrong: [string, string, string], note: string]

const ROWS: Row[] = [
  /* --- Zeměpis ------------------------------------------------------------ */
  [
    'Které město je hlavním městem Austrálie?',
    'Canberra',
    ['Sydney', 'Melbourne', 'Perth'],
    'Sydney a Melbourne se přely, které z nich to bude, a tak se mezi nimi postavilo úplně nové město.',
  ],
  [
    'Která hora je nejvyšší v Česku?',
    'Sněžka',
    ['Praděd', 'Lysá hora', 'Klínovec'],
    'Sněžka v Krkonoších má 1 603 metrů. Praděd v Jeseníkách je druhý s 1 491 metry.',
  ],
  [
    'Která řeka je nejdelší na území Česka?',
    'Vltava',
    ['Labe', 'Morava', 'Ohře'],
    'Vltava měří 430 kilometrů a celá teče u nás. Labe je delší, ale většinu cesty urazí v Německu.',
  ],
  [
    'Který oceán je největší?',
    'Tichý',
    ['Atlantský', 'Indický', 'Severní ledový'],
    'Tichý oceán je větší než všechna pevnina na Zemi dohromady.',
  ],
  [
    'Která země je rozlohou největší na světě?',
    'Rusko',
    ['Kanada', 'Čína', 'USA'],
    'Rusko se rozkládá v Evropě i v Asii a má jedenáct časových pásem. Druhá je Kanada.',
  ],
  [
    'Jakým jazykem se mluví v Brazílii?',
    'Portugalsky',
    ['Španělsky', 'Brazilsky', 'Anglicky'],
    'Brazílie byla portugalskou kolonií. Je to největší portugalsky mluvící země, mnohem větší než samo Portugalsko.',
  ],

  /* --- Vesmír ------------------------------------------------------------- */
  [
    'Kolik planet má Sluneční soustava?',
    '8',
    ['7', '9', '10'],
    'Pluto bylo planetou do roku 2006. Pak ho astronomové přeřadili mezi trpasličí planety.',
  ],
  [
    'Která hvězda je nejblíž Zemi?',
    'Slunce',
    ['Polárka', 'Proxima Centauri', 'Sírius'],
    'Slunce je taky hvězda. Proxima Centauri je nejbližší hned po něm, její světlo k nám letí přes čtyři roky.',
  ],
  [
    'Jak dlouho letí světlo ze Slunce na Zemi?',
    'Asi 8 minut',
    ['Asi 8 sekund', 'Asi 8 hodin', 'Asi 8 dní'],
    'Slunce je 150 milionů kilometrů daleko. Když se díváme na Slunce, vidíme ho takové, jaké bylo před osmi minutami.',
  ],

  /* --- Příroda a lidské tělo ---------------------------------------------- */
  [
    'Které zvíře je největší na světě?',
    'Plejtvák obrovský',
    ['Slon africký', 'Žralok velrybí', 'Vorvaň'],
    'Plejtvák dorůstá přes 30 metrů. Je to největší živočich, o kterém víme, větší než kterýkoli dinosaurus.',
  ],
  [
    'Které zvíře je nejrychlejší na souši?',
    'Gepard',
    ['Lev', 'Antilopa vidloroh', 'Chrt'],
    'Gepard zrychlí až kolem 100 km/h, ale vydrží jen pár set metrů. Vidloroh je pomalejší a běží mnohem déle.',
  ],
  [
    'Kolik kostí má dospělý člověk?',
    '206',
    ['106', '156', '306'],
    'Miminko jich má kolem tří set. Během růstu některé srostou dohromady, třeba kosti lebky.',
  ],
  [
    'Jaký plyn rostliny vyrábějí ze slunečního světla a vzduchu?',
    'Kyslík',
    ['Oxid uhličitý', 'Dusík', 'Helium'],
    'Rostliny berou ze vzduchu oxid uhličitý a vracejí kyslík. Říká se tomu fotosyntéza.',
  ],

  /* --- Dějiny a kultura --------------------------------------------------- */
  [
    'Ve kterém roce vzniklo Československo?',
    '1918',
    ['1914', '1938', '1945'],
    'Stalo se to 28. října 1918, proto je ten den státní svátek.',
  ],
  [
    'Kdo byl prvním prezidentem Československa?',
    'Tomáš Garrigue Masaryk',
    ['Edvard Beneš', 'Václav Havel', 'Ludvík Svoboda'],
    'Masaryk byl prezidentem sedmnáct let. Václav Havel byl posledním prezidentem Československa a prvním České republiky.',
  ],
  [
    'Který panovník založil v Praze univerzitu?',
    'Karel IV.',
    ['Rudolf II.', 'Přemysl Otakar II.', 'Václav II.'],
    'Karlova univerzita vznikla v roce 1348. Je nejstarší ve střední Evropě.',
  ],
  [
    'Kdo namaloval Monu Lisu?',
    'Leonardo da Vinci',
    ['Michelangelo', 'Rafael', 'Vincent van Gogh'],
    'Obraz visí v pařížském Louvru za neprůstřelným sklem a před ním stojí pořád fronta.',
  ],
  [
    'Kdo napsal knihu Babička?',
    'Božena Němcová',
    ['Karel Jaromír Erben', 'Jan Neruda', 'Karel Čapek'],
    'Božena Němcová je i na pětisetkorunové bankovce. Erben napsal Kytici, Neruda Povídky malostranské.',
  ],

  /* --- Věda, počty a sport ------------------------------------------------ */
  [
    'Jakou chemickou značku má zlato?',
    'Au',
    ['Ag', 'Zl', 'Go'],
    'Značka pochází z latinského aurum. Ag je stříbro, z latinského argentum.',
  ],
  [
    'Kolik je 7 × 8?',
    '56',
    ['54', '48', '64'],
    'Dá se to zapamatovat podle řady 5, 6, 7, 8: padesát šest je sedm krát osm.',
  ],
  [
    'Kolik minut má jeden den?',
    '1 440',
    ['1 240', '1 340', '1 540'],
    'Dvacet čtyři hodin krát šedesát minut. V sekundách je to 86 400.',
  ],
  [
    'Kolik hráčů jednoho týmu je v hokeji najednou na ledě, když se hraje v plném počtu?',
    '6',
    ['5', '7', '11'],
    'Pět hráčů v poli a brankář. Když tým dostane trest, hraje v oslabení o jednoho méně.',
  ],
]

/** Tvrzení: znění, jestli platí, a poučka. Odpovídá se ANO, nebo NE. */
type Claim = [prompt: string, holds: boolean, note: string]

const CLAIMS: Claim[] = [
  [
    'Netopýr je pták.',
    false,
    'Netopýr je savec, mláďata krmí mlékem. Je to jediný savec, který opravdu létá.',
  ],
  [
    'Chobotnice má tři srdce.',
    true,
    'Dvě srdce ženou krev přes žábry, třetí do zbytku těla. A krev má modrou.',
  ],
  [
    'Rajče je podle botaniků ovoce.',
    true,
    'Je to plod se semínky, který vyrostl z květu. V kuchyni se s ním ale zachází jako se zeleninou.',
  ],
  [
    'Žirafa má v krku stejný počet obratlů jako člověk.',
    true,
    'Obě mají sedm krčních obratlů. Žirafí jsou jen mnohem delší, každý měří kolem pětadvaceti centimetrů.',
  ],
  [
    'Velká čínská zeď je z Měsíce vidět pouhým okem.',
    false,
    'Zeď je dlouhá, ale úzká. Z Měsíce ji nikdo nespatřil a i z vesmírné stanice se bez pomůcek skoro nedá rozeznat.',
  ],
  [
    'Nejvyšší sopka Sluneční soustavy je na Marsu.',
    true,
    'Olympus Mons je zhruba dvaapůlkrát vyšší než Mount Everest.',
  ],
  [
    'Pravěcí lidé se setkávali s tyranosaury.',
    false,
    'Dinosauři vyhynuli před 66 miliony let. První lidé se objevili až před pár miliony let.',
  ],
  [
    'Blesk nikdy neudeří dvakrát do stejného místa.',
    false,
    'Blesk si vybírá vysoká místa, a ta se nehýbou. Do mrakodrapu Empire State Building v New Yorku udeří kolem dvacetkrát za rok.',
  ],
]

export function generalQuizPack(): QuizPack {
  const now = Date.now()

  const choices: QuizItem[] = ROWS.map(([prompt, correct, wrong, note]) => ({
    id: id('i'),
    kind: 'choice',
    prompt,
    // Správná je na prvním místě, protože se ve hře stejně zamíchá.
    options: [correct, ...wrong],
    correctIndex: 0,
    note,
  }))

  const claims: QuizItem[] = CLAIMS.map(([prompt, holds, note]) => ({
    id: id('i'),
    kind: 'boolean',
    prompt,
    // Tvrzení znění možností nečte, ANO je vždycky 0.
    options: [],
    correctIndex: holds ? 0 : 1,
    note,
  }))

  return {
    id: id('kp'),
    name: 'Všeobecné znalosti',
    description:
      'Zeměpis, vesmír, příroda, dějiny a počty v rozsahu druhého stupně. Pro děti od jedenácti let i jejich rodiče.',
    items: [...choices, ...claims],
    createdAt: now,
    updatedAt: now,
  }
}
