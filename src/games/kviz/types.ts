/* Datové typy kvízu. */

/**
 * Tvar otázky. `choice` je klasická čtveřice možností, `boolean` tvrzení,
 * na které se odpovídá Pravda, nebo Nepravda. Dva tvary v jednom balíčku
 * jsou schválně: školení se tím rozhýbe a tvrzení se píšou rychleji než
 * čtyři věrohodné možnosti.
 */
export type QuizKind = 'choice' | 'boolean'

/**
 * Balíček otázek kvízu.
 *
 * Kvíz má vlastní zásobu otázek, oddělenou od desky Pojišťuj!. Obě hry
 * se ptají na jiný tvar odpovědi: deska chce jedno znění, které moderátorka
 * přečte nahlas, kvíz čtyři možnosti, mezi kterými se vybírá. Jedna sada
 * pro obojí by znamenala, že každá otázka nese pole, která druhá hra
 * nepoužije, a že se obě hry musí domlouvat na společném tvaru.
 *
 * Balíček je jeden dokument, stejně jako u desky: jednotky kilobajtů proti
 * limitu jednoho megabajtu, atomický zápis a triviální duplikace.
 */
export interface QuizItem {
  id: string
  /**
   * Tvar otázky. `choice` je čtveřice možností, `boolean` tvrzení, na které
   * se odpovídá Pravda, nebo Nepravda. Chybí u balíčků, které vznikly dřív,
   * a tam se čte jako `choice`; kvůli jednomu poli se staré balíčky
   * nepřepisují.
   */
  kind?: QuizKind
  prompt: string
  /** Čtyři možnosti. Ve hře se jejich pořadí zamíchá. */
  options: string[]
  /**
   * Která možnost je správná. U tvrzení je 0 Pravda a 1 Nepravda; `options`
   * se u nich nečtou, znění obou možností je dané a nese ho `BOOLEAN_LABELS`.
   * Zůstanou proto uložené i po přepnutí tvaru a přepnutí zpátky je vrátí.
   */
  correctIndex: number
  /** Poučka po odhalení. Prázdná, když ji autorka nenapsala. */
  note: string
}

export interface QuizPack {
  id: string
  name: string
  description: string
  items: QuizItem[]
  createdAt: number
  updatedAt: number
}

/**
 * Fáze kvízu. Posouvá je moderátorka mezerníkem, jediná automatika je
 * přechod z `question` do `locked`, jakmile doběhne časomíra.
 *
 * Průběžné pořadí mezi fázemi není. Plátno ho neukazuje vůbec: patří na
 * telefon, kde si ho každý přečte sám a nedrží kvůli němu celou místnost.
 * Čekárna dává smysl jen s telefony, bez nich se přeskakuje.
 */
export type QuizPhase = 'lobby' | 'question' | 'locked' | 'reveal' | 'final'

/**
 * Otázka zamrazená do běžícího kvízu, včetně pořadí možností. Úprava
 * balíčku uprostřed hry nesmí změnit to, co běží na projektoru.
 */
export interface QuizQuestion {
  qid: string
  kind: QuizKind
  prompt: string
  /** Možnosti v pořadí, ve kterém se ukážou. U tvrzení jsou vždy dvě
   *  a nemíchají se: Pravda je vždycky A. */
  options: string[]
  correctIndex: number
  /** Poučka po odhalení. Prázdná, když ji autorka nenapsala. */
  note: string
  packName: string
}

/** Z čeho se kvíz sestavil. Slouží i k odvetě s novými otázkami. */
export interface QuizSetup {
  packIds: string[]
  count: number
  limitSeconds: number
  /** Hraje se s telefony, tedy se zakládá živá session. */
  withPhones: boolean
  /**
   * Koho školíme. Nepovinné, ale bez toho je archiv jen hromada
   * anonymních tabulek: k čemu je „kvíz z 12. 3.", když se ten den
   * školily tři skupiny.
   */
  groupName: string
}

export interface QuizHostState {
  id: string
  /** Kolikáté kolo na stejné sestavě. Odveta ho zvýší. */
  round: number
  setup: QuizSetup
  questions: QuizQuestion[]
  /** Otázky odehrané v minulých kolech, aby odveta losovala nové. */
  usedQids: string[]
  index: number
  phase: QuizPhase
  /** Kdy se otázka objevila na plátně. Null mimo běžící otázku. */
  askedAt: number | null
  /** Kód živé session. Null, když se hraje bez telefonů. */
  code: string | null
  /** Platnost session, aby ji telefon nemusel dopočítávat. */
  expiresAt: number
  /** Body podle uid. Počítá je moderátorka, hráč do nich nevidí. */
  scores: Record<string, number>
  /** Přezdívky zamrazené k uid, aby vyhodnocení přežilo i odchod hráče. */
  nicks: Record<string, string>
  /** Zvířata zamrazená k uid, ze stejného důvodu jako přezdívky. */
  avatars: Record<string, string>
  /** Od které otázky kdo hraje. Kdo přišel později, nemá se počítat jako
   *  ten, kdo otázku nezvládl. */
  joinIndex: Record<string, number>
  /** Otázky, které už byly obodované. Brání dvojímu připsání bodů. */
  scoredQids: string[]
  /** Uložené vyhodnocení dohraného kola, aby se po obnovení stránky
   *  dalo najít zpátky. */
  reportId: string | null
  startedAt: number
}

/* --- Živá session --------------------------------------------------------- */

/**
 * Jediný dokument, který čtou telefony.
 *
 * Není v něm jediné písmeno otázky ani stopa po správné možnosti, dokud ji
 * moderátorka neodhalí. Kdo kód uhodne, dozví se nanejvýš, že někde běží
 * sedmá otázka. Telefon si z jednoho snímku dopočítá všechno ostatní:
 * svoje body, pořadí, přírůstek i to, jestli měl pravdu.
 */
export interface QuizSession {
  schema: 1
  /** Shodné s id dokumentu, hlídají pravidla. */
  code: string
  /** Vlastník. Zapíše se při vzniku a už se nemění. */
  hostUid: string
  createdAt: number
  /** Vznik plus osm hodin. Podle toho se session uklízí. */
  expiresAt: number
  acceptsPlayers: boolean
  /** Kolikáté kolo. Odveta na stejný kód ho zvýší. */
  round: number
  total: number
  index: number
  qid: string
  /** Tvar běžící otázky. Telefon podle něj ví, kolik má nabídnout tlačítek
   *  a jestli na nich mají být slova Pravda a Nepravda. Znění otázky ani
   *  správná odpověď v tom nejsou. */
  kind: QuizKind
  phase: QuizSessionPhase
  /** Čas serveru, ne moderátorčina počítače. Od něj se odvíjí předehra
   *  i to, co pravidla uznají za včasnou odpověď. */
  askedAt: number | null
  /** Předehra „připrav se". Schová rozptyl doručení snímku telefonům. */
  preRollMs: number
  limitMs: number
  /** Vzniká až s odhalením. Pravidlo zakazuje, aby tohle pole v dokumentu
   *  bylo, dokud otázka běží. */
  reveal?: QuizReveal
  /**
   * Body podle uid. Telefon si najde svoje, ostatní jsou pro něj čísla.
   *
   * Jmenovitý žebříček tu schválně není. Dokument čte kdokoli, kdo zná
   * kód, a přezdívky účastníků školení do něj nepatří: anonymní uid
   * a číslo neprozradí nikoho.
   */
  scores: Record<string, number>
}

export type QuizSessionPhase = 'lobby' | 'question' | 'locked' | 'reveal' | 'final'

export interface QuizReveal {
  correctIndex: number
  note: string
  /** Kolik lidí zvolilo kterou možnost. */
  counts: number[]
}

export interface QuizStanding {
  uid: string
  nick: string
  /** Zvíře hráče. Prázdné u hráče, který se připojil starším telefonem. */
  avatar: string
  score: number
}

export interface QuizPlayer {
  uid: string
  nick: string
  /** Identifikátor zvířete z `avatars.ts`. Vybírá se při připojení. */
  avatar: string
  joinedAt: number
  /** Od které otázky hraje. Otázky před tím se ve vyhodnocení počítají
   *  jako „nebyl", ne jako chyba. */
  joinedAtIndex: number
  expiresAt: number
}

export interface QuizAnswer {
  /** Složené id `kolo_otázka_hráč`. Druhá odpověď by byla přepis, a ten
   *  pravidla nikomu kromě moderátorky nedovolí. */
  id: string
  uid: string
  round: number
  qid: string
  choice: number
  /** Čas od odemčení tlačítek, měřený telefonem. */
  elapsedMs: number
  at: number
}

/* --- Vyhodnocení pro školitelku ------------------------------------------- */

/**
 * Co kvíz ukázal. Vzniká po poslední otázce a odpovídá na jedinou otázku,
 * kvůli které se hraje: co tým neumí.
 *
 * Je to jeden dokument. Přečte ho jeho moderátor a odemčená správa,
 * protože jsou v něm přezdívky účastníků. Zapsané se už nemění, aby se
 * výsledky nedaly přepsat zpětně.
 */
export interface QuizReport {
  schema: 1
  id: string
  hostUid: string
  /** Koho se to týkalo. Prázdné u her spuštěných bez názvu skupiny. */
  groupName: string
  /** Kód hry. Null, když se hrálo bez telefonů. */
  code: string | null
  round: number
  packNames: string[]
  startedAt: number
  finishedAt: number
  questions: QuizReportQuestion[]
  players: QuizReportPlayer[]
  /**
   * Kdo co zmáčkl, po otázkách a hráčích. Indexy odpovídají polím výše,
   * null znamená neodpověděl. Kdo v tu chvíli ještě nebyl ve hře, pozná
   * se podle `joinIndex`, ne podle nulové odpovědi.
   */
  matrix: Array<Array<QuizReportCell | null>>
}

export interface QuizReportQuestion {
  qid: string
  index: number
  prompt: string
  options: string[]
  correctIndex: number
  note: string
  packName: string
  /** Kolik lidí bylo ve hře, kolik odpovědělo a kolik trefilo. */
  present: number
  answered: number
  correct: number
  byChoice: number[]
  /** Průměrná doba správné odpovědi v milisekundách. */
  avgMs: number
}

export interface QuizReportPlayer {
  uid: string
  nick: string
  joinIndex: number
  score: number
  answered: number
  correct: number
}

export interface QuizReportCell {
  /** Zvolená možnost. */
  c: number
  /** Doba odpovědi v milisekundách. */
  ms: number
  /** Připsané body. */
  p: number
}

/** Řádek seznamu uložených vyhodnocení. Bez matice, aby se seznam
 *  nestahoval po stovkách kilobajtů. */
export interface QuizReportSummary {
  id: string
  groupName: string
  finishedAt: number
  round: number
  packNames: string[]
  questionCount: number
  playerCount: number
}
