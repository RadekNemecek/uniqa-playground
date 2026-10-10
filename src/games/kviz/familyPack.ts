import { id } from '@/lib/id'
import bryleUrl from '@/assets/quiz/rodina/bryle.svg'
import cepiceUrl from '@/assets/quiz/rodina/cepice.svg'
import chaloupkaUrl from '@/assets/quiz/rodina/chaloupka.svg'
import hrnecUrl from '@/assets/quiz/rodina/hrnec.svg'
import jablkoUrl from '@/assets/quiz/rodina/jablko.svg'
import kalhotkyUrl from '@/assets/quiz/rodina/kalhotky.svg'
import kostkaUrl from '@/assets/quiz/rodina/kostka.svg'
import oriskyUrl from '@/assets/quiz/rodina/orisky.svg'
import satekUrl from '@/assets/quiz/rodina/satek.svg'
import sluchatkoUrl from '@/assets/quiz/rodina/sluchatko.svg'
import type { QuizItem, QuizPack } from './types'

/**
 * Rodinný kvíz: dva dospělí a dvě děti kolem dvanácti let.
 *
 * Otázky jsou poskládané tak, aby každá generace měla svoje kolo.
 * Večerníčky a české pohádky táhnou rodiče, YouTube a hry děti, filmy
 * a knihy znají obě strany. Snadné otázky jsou tu schválně, kvíz se hraje
 * pro radost, ne na školení.
 *
 * Obrázky jsou vlastní kresby v `src/assets/quiz/rodina/`, žádné stažené
 * postavičky: nese je předmět (čepice z novin, tři oříšky, sluchátko),
 * ne kresba cizí postavy, takže se neopisuje nic, co patří někomu jinému.
 * Žádná kresba neprozrazuje odpověď písmem.
 */

/** Otázka se čtyřmi možnostmi: znění, správná, tři chybné, poučka
 *  a případně kresba. Správná je vždy první, ve hře se pořadí zamíchá. */
type Row = [
  prompt: string,
  correct: string,
  wrong: [string, string, string],
  note: string,
  image?: string,
]

const ROWS: Row[] = [
  /* --- S obrázkem --------------------------------------------------------- */
  [
    'Kdo nosí na hlavě tuhle čepici z novin?',
    'Večerníček',
    ['Hurvínek', 'Mach', 'Rumcajs'],
    'Kluk s čepicí z novin zve děti k pohádce na dobrou noc. Nakreslil ho Radek Pilař, který kreslil i Rumcajse.',
    cepiceUrl,
  ],
  [
    'Ze které pohádky jsou tyhle tři oříšky?',
    'Tři oříšky pro Popelku',
    ['Pyšná princezna', 'S čerty nejsou žerty', 'Princezna ze mlejna'],
    'Z oříšků vypadly šaty na lov, na ples a na svatbu. Pohádka je z roku 1973 a v televizi běží skoro každé Vánoce.',
    oriskyUrl,
  ],
  [
    'Kdo si nechal ušít tyhle kalhotky s velkými kapsami?',
    'Krtek',
    ['Maxipes Fík', 'Ferda Mravenec', 'Hurvínek'],
    'Jak krtek ke kalhotkám přišel je úplně první film o Krtkovi. Nakreslil ho Zdeněk Miler.',
    kalhotkyUrl,
  ],
  [
    'Komu patřilo tohle kouzelné sluchátko?',
    'Machovi a Šebestové',
    ['Patovi a Matovi', 'Jájovi a Pájovi', 'Bobovi a Bobkovi'],
    'Stačilo do sluchátka říct přání a splnilo se. Příběhy napsal Miloš Macourek a nakreslil Adolf Born.',
    sluchatkoUrl,
  ],
  [
    'Kdo nosí na krku tenhle puntíkatý šátek?',
    'Ferda Mravenec',
    ['Maxipes Fík', 'Pinďa ze Čtyřlístku', 'Rumcajs'],
    'Ferdu Mravence vymyslel a nakreslil Ondřej Sekora. Mravenec, který se nikdy nevzdá, je s námi od třicátých let.',
    satekUrl,
  ],
  [
    'Jakými slovy se zastavoval tenhle kouzelný hrnec?',
    'Hrnečku, dost!',
    ['Hrnečku, stůj!', 'Hrnečku, přestaň!', 'Hrnečku, spinkej!'],
    'Maminka si ta slova nepamatovala, a tak kaše zaplavila celou vesnici, než se holčička vrátila domů.',
    hrnecUrl,
  ],
  [
    'Kdo v pohádce našel tuhle chaloupku?',
    'Jeníček a Mařenka',
    ['Mach a Šebestová', 'Káťa a Škubánek', 'Křemílek a Vochomůrka'],
    'Chaloupka byla z perníku, aby k ní přilákala děti. Bydlela v ní ježibaba.',
    chaloupkaUrl,
  ],
  [
    'Kterou pohádkovou princeznu uspalo jablko jako tohle?',
    'Sněhurku',
    ['Šípkovou Růženku', 'Popelku', 'Zlatovlásku'],
    'Otrávené jablko jí podstrčila zlá královna. Šípková Růženka se píchla o vřeteno.',
    jablkoUrl,
  ],
  [
    'Majitel těchhle brýlí a jizvy chodil v Bradavicích do které koleje?',
    'Nebelvír',
    ['Zmijozel', 'Havraspár', 'Mrzimor'],
    'Moudrý klobouk chtěl Harryho poslat do Zmijozelu, ale Harry si v duchu řekl, že tam nechce.',
    bryleUrl,
  ],
  [
    'Ze které hry je tahle kostka?',
    'Minecraft',
    ['Roblox', 'Fortnite', 'Among Us'],
    'Minecraft je nejprodávanější videohra všech dob, prodalo se ho přes 300 milionů kusů.',
    kostkaUrl,
  ],

  /* --- Večerníčky a české pohádky ----------------------------------------- */
  [
    'Jak se jmenuje holčička, která vychovala Maxipsa Fíka?',
    'Ája',
    ['Jája', 'Bára', 'Majda'],
    'Fík z malého štěněte vyrostl v obřího psa, který mluví jako člověk. Příběhy napsal Rudolf Čechura.',
  ],
  [
    'Kde bydleli skřítci Křemílek a Vochomůrka?',
    'V pařezové chaloupce',
    ['V dutém stromě', 'Pod mlýnským kolem', 'V hrnečku od kafe'],
    'Pohádky z pařezové chaloupky napsal Václav Čtvrtek a nakreslil Zdeněk Smetana.',
  ],
  [
    'Odkud vylézají králíci Bob a Bobek?',
    'Z klobouku kouzelníka',
    ['Z nory pod jabloní', 'Z kouzelné skříně', 'Z dědova kufru'],
    'Celý název večerníčku je Bob a Bobek, králíci z klobouku.',
  ],
  [
    'Ve kterém lese bydlel loupežník Rumcajs?',
    'V Řáholci',
    ['Na Šumavě', 'V Brdech', 'Na Kokořínsku'],
    'Rumcajs byl původně švec z Jičína. V lese Řáholci žil s Mankou a synem Cipískem.',
  ],
  [
    'Co říkají Pat a Mat, když dokončí svoje dílo?',
    'A je to!',
    ['Hotovo!', 'Máme hotovo!', 'Tak a dost!'],
    'Říkají to, i když dílo zrovna spadlo nebo shořelo. Natáčejí se od roku 1976.',
  ],
  [
    'Kdo vládne horám v Krkonošských pohádkách?',
    'Krakonoš',
    ['Trautenberk', 'Hejkal', 'Pan Tau'],
    'Trautenberk je pán, se kterým se Krakonoš pořád přetahuje. Krakonoš hlídá, aby se v horách dělo po právu.',
  ],
  [
    'Jak se jmenuje pes Spejbla a Hurvínka?',
    'Žeryk',
    ['Fík', 'Rex', 'Punťa'],
    'Hurvínek má ještě kamarádku Máničku. Spejbla a Hurvínka vymyslel Josef Skupa.',
  ],
  [
    'Kdo z nich nepatří do Čtyřlístku?',
    'Hurvínek',
    ['Myšpulín', 'Fifinka', 'Pinďa'],
    'Čtyřlístek tvoří Fifinka, Myšpulín, Pinďa a Bobík. Komiks vychází od roku 1969.',
  ],
  [
    'Jak moc měla princezna Maruška ráda tatínka v pohádce Byl jednou jeden král?',
    'Jako sůl',
    ['Jako zlato', 'Jako med', 'Jako slunce'],
    'Král se urazil a sůl v celé zemi zakázal. Bez ní pak pochopil, že je nad zlato.',
  ],

  /* --- Filmy a knihy ------------------------------------------------------ */
  [
    'Jak se jmenuje sněhulák z Ledového království?',
    'Olaf',
    ['Sven', 'Kristoff', 'Hans'],
    'Sven je Kristoffův sob a Hans princ, kterému se nedá věřit. Olaf miluje vřelá objetí.',
  ],
  [
    'Jak se jmenuje Simbův zlý strýc ve Lvím králi?',
    'Scar',
    ['Mufasa', 'Rafiki', 'Pumbaa'],
    'Mufasa je Simbův táta, Rafiki moudrý pavián a Pumbaa prase bradavičnaté.',
  ],
  [
    'Kde bydlí Shrek na začátku prvního filmu?',
    'V bažině',
    ['Ve věži', 'V jeskyni', 'Na hradě'],
    'Do bažiny se mu nastěhují pohádkové bytosti a Shrek se vydá, aby je zase vystěhoval.',
  ],

  /* --- YouTube a hry ------------------------------------------------------ */
  [
    'Kdo má od roku 2024 nejodebíranější kanál na YouTube?',
    'MrBeast',
    ['PewDiePie', 'Markiplier', 'Dude Perfect'],
    'Vlastním jménem Jimmy Donaldson. V listopadu 2024 předběhl indický hudební kanál T-Series.',
  ],
  [
    'Jaké zvíře je na úplně prvním videu na YouTube?',
    'Slon',
    ['Kočka', 'Pes', 'Panda'],
    'Video Me at the zoo natočil v roce 2005 jeden ze zakladatelů YouTube v zoo v San Diegu. Má jen 19 vteřin.',
  ],
  [
    'Které video na YouTube jako první překonalo miliardu zhlédnutí?',
    'Gangnam Style',
    ['Despacito', 'Baby Shark Dance', 'Baby od Justina Biebera'],
    'Korejský zpěvák PSY to zvládl v prosinci 2012. Dnes má nejvíc zhlédnutí Baby Shark Dance.',
  ],
  [
    'Ve kterém seriálu bojují zpívající hlavy ze záchodů s lidmi, kteří mají místo hlavy kameru?',
    'Skibidi Toilet',
    ['Poppy Playtime', 'The Amazing Digital Circus', 'Among Us'],
    'Začal v roce 2023 jako krátká videa na YouTube a během několika měsíců z něj byl fenomén.',
  ],
  [
    'Jakého typu je Pokémon Pikachu?',
    'Elektrický',
    ['Ohnivý', 'Vodní', 'Travní'],
    'Elektřinu nosí v červených tvářičkách. Od roku 1996 je tváří celé značky.',
  ],
  [
    'Jaké povolání má Super Mario?',
    'Instalatér',
    ['Kuchař', 'Pekař', 'Kominík'],
    'V úplně první hře, Donkey Kongu z roku 1981, byl ještě tesař. Instalatérem se stal o dva roky později.',
  ],
]

/** Tvrzení: znění, jestli platí, a poučka. Odpovídá se ANO, nebo NE. */
type Claim = [prompt: string, holds: boolean, note: string]

const CLAIMS: Claim[] = [
  [
    'Krtek ve večerníčcích mluví celými větami.',
    false,
    'Krtek říká jen krátká slova jako „Hele!" nebo „Ahoj!", aby mu rozuměly děti na celém světě. Namluvily je dcery Zdeňka Milera.',
  ],
  [
    'Pat a Mat jsou kreslený seriál.',
    false,
    'Pat a Mat jsou loutky. Každý jejich pohyb se natáčí políčko po políčku.',
  ],
  [
    'Večerníček se v televizi vysílá déle než padesát let.',
    true,
    'Poprvé se vysílal v lednu 1965, takže už přes šedesát let.',
  ],
  [
    'Endermana v Minecraftu rozzlobíš, když se mu podíváš do očí.',
    true,
    'Stačí se na něj zadívat. Kdo chce mít klid, nasadí si na hlavu vydlabanou dýni.',
  ],
  [
    'Tetris vymysleli v Japonsku.',
    false,
    'Tetris vymyslel v roce 1984 Alexej Pažitnov v Moskvě, tehdy ještě v Sovětském svazu.',
  ],
  [
    'Harry Potter má narozeniny 31. července.',
    true,
    'Stejný den slaví narozeniny i autorka knih J. K. Rowlingová.',
  ],
  [
    'Mimoni mluví vlastní řečí, které se nedá rozumět.',
    true,
    'Je poskládaná z kousků různých jazyků, takže se tu a tam dá něco pochytit. Třeba „banana".',
  ],
]

/** Rodinný kvíz a kresby k jeho otázkám. Kresby se do úložiště převedou
 *  až při založení, viz `createFamilyQuizPack()`. */
export interface FamilyPackDraft {
  pack: QuizPack
  /** Adresa kresby podle id otázky. */
  images: Map<string, string>
}

export function familyQuizPack(): FamilyPackDraft {
  const now = Date.now()
  const images = new Map<string, string>()

  const choices: QuizItem[] = ROWS.map(([prompt, correct, wrong, note, image]) => {
    const item: QuizItem = {
      id: id('i'),
      kind: 'choice',
      prompt,
      // Správná je na prvním místě, protože se ve hře stejně zamíchá.
      options: [correct, ...wrong],
      correctIndex: 0,
      note,
    }
    if (image) images.set(item.id, image)
    return item
  })

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
    pack: {
      id: id('kp'),
      name: 'Rodinný kvíz',
      description:
        'Pohádky, večerníčky, filmy, hry a YouTube. Pro rodiče i děti, každá generace má svoje kolo a deset otázek má obrázek.',
      items: [...choices, ...claims],
      createdAt: now,
      updatedAt: now,
    },
    images,
  }
}
