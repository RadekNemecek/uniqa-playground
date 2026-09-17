# Playground: konvence projektu

Vue 3 + Vite + TypeScript, statická aplikace na GitHub Pages, data ve
Firestore. Hry jsou moduly: Pojišťuj! je deska pro týmy, Na kolik to dáš? je kvíz,
do kterého se účastníci připojují telefonem. Další mají přibývat stejně.

Kontext, proč projekt vznikl, je v `README.md`, nasazení v `DEPLOY.md`.

## Co nesmíš porušit

- **Žádné syrové hodnoty.** Barva, mezera, velikost písma, poloměr a trvání
  animace vždy přes `var(--token)` z `src/styles/tokens.css`. Novou hodnotu
  nejdřív přidej mezi tokeny.
- **Pohyb se dá vypnout.** Každá animace musí respektovat
  `prefers-reduced-motion`. Tokeny trvání jdou v tom režimu na 1 ms, takže
  animace psané přes tokeny to řeší samy. Klíčové snímky s `animation`
  vypni explicitně.
- **Kontrast textu nejméně 4,5:1, spočítaný.** Neodhaduj ho. Každá dvojice
  text/plocha v `tokens.css` má poměr uvedený v komentáři.
  Barvy týmů drží aspoň 7:1 vůči `--c-text-ink`, aby na nich mohl být tmavý
  text.
- **Tým se nikdy nerozlišuje jen barvou.** Vždy je vedle ní i písmeno.
- **Deska i otázka se vejdou na jednu obrazovku.** Na projektoru se
  nescrolluje. Velikost otázky a odpovědi neodhaduj z počtu znaků, měř ji:
  `fitToScreen()` v `QuestionStage.vue` ubírá, dokud se obsah nevejde.
- **Nastavení velikosti písma platí jen na herní ploše.** Nese ji třída
  `.game-surface`, která přepisuje celou škálu `--fs-*`. Rozhraní, hlavička
  ani správa otázek se nezvětšují. `var()` uvnitř custom property se dosazuje
  tam, kde je property deklarovaná, takže samotné přepsání `--scale` na
  potomkovi by nestačilo.
- **Dvě písma, Lato a Caveat.** Lato nese všechno, je to písmo UNIQA, řezy
  400, 700 a 900. Caveat je ruční a smí být jen na třech místech: kicker
  rozcestníku, kicker v dialogu sázky, blahopřání na výsledkové obrazovce.
  Nikdy nenese otázku, odpověď, hodnotu ani ovládací prvek, ty se čtou
  z druhého konce místnosti a tam vyhrává čitelnost nad charakterem.
- **Jedno téma, tmavě modré.** Rampa ploch je čistý odstín `#005CA9`
  ztlumený do hloubky. Platí i pro správu otázek: hraje se na projektoru
  a správa má vypadat jako součást hry, ne jako cizí nástroj.
- **Žádná zlatá ani žlutá.** UNIQA je nemá. Akcent je `--c-brand`, hodnoty
  na dlaždicích nese `--c-value`. Žlutá chybí i mezi barvami týmů, jinak by
  se zlatá vrátila zadními dveřmi.
- **Barvy jsou změřené, ne vymyšlené.** Modrá #005CA9, inkoust #1B1B1B,
  plochy #EEF2FA a #D5DEEE, zelená #026E46, červená #D71C4F a písma Lato
  a Caveat pocházejí z živých stylů na uniqa.cz. Když přidáváš odstín,
  odvoď ho odtud, ne z citu.
- **Logo UNIQA v repozitáři není.** Bez písemného svolení se nepoužije,
  `uniqagroup.com` to říká výslovně, kontakt `grafik@uniqa.at`, v ČR přes
  místní marketing. Do té doby stojí na rozcestníku jen věta „Vytvořeno pro
  tým UNIQA" a v hlavičce vlastní značka, mřížka dlaždic. Ta schválně
  nepřipomíná smyčku z loga.
- **Hra přežije obnovení stránky.** Stav se ukládá po každé akci.
- **Ovládací prvek musí mít na dotyku aspoň 44 px.** Bloky
  `@media (pointer: coarse)` patří na konec souboru se styly, jinak je
  přebijí pravidla zapsaná pod nimi.
- **Texty česky, bez dlouhých pomlček.** A bez řeči o tom, jak je aplikace
  postavená. Uživatelku zajímá, co s tím může dělat, ne architektura.
- **Hravost patří do hry a na rozcestník, ne do správy otázek.** Tam se
  pracuje, ozdoby by překážely. Ve hře je hmota dlaždic, pohyb a jiskra
  vítaná, protože z tabulky dělá herní desku.
- **Každá hra má vlastní otázky.** Deska chce znění a odpověď, kvíz čtyři
  možnosti a nepovinnou poučku. Společná sada by znamenala, že každá otázka
  nese pole, která druhá hra nepoužije, a že se obě hry musí domlouvat na
  společném tvaru. Balíčky desky jsou `packs`, balíčky kvízu `quizPacks`.
- **Čtyři možnosti kvízu nesmí rozlišovat jen barva.** Každá nese barvu
  i písmeno: azur/A, limeta/B, levandule/C, růžová/D. Vynechaný je tyrkys,
  na azur je z dálky moc blízko, a písek, jediná teplá barva palety.
  Definice je v `src/games/kviz/options.ts` a platí stejně na plátně
  i na telefonu.
- **Do živé session se nikdy nezapisuje odtikávající čas.** Pošle se
  `askedAt` a `limitMs` jednou a telefony odpočítávají samy. Firestore drží
  zhruba jeden zápis za sekundu na dokument a vzniklá latence by zkreslila
  přesně to, co hra měří.
- **Odpověď se neposílá naslepo.** Firestore ji lokálně přijme i bez sítě
  a server ji o pět minut později odmítne, aniž by si toho kdokoli všiml.
  Telefon musí počkat na potvrzení a při neúspěchu to ukázat.
- **Po vypršení limitu neprojde žádná odpověď.** Drží to tři nezávislé
  vrstvy: telefon si zamkne tlačítka sám, moderátorský počítač přepne fázi
  a server odmítne pozdní zápis. Poslední slovo má server, protože platí
  i tehdy, když moderátorce vypadne síť.
- **Připravené balíčky kvízu jsou veřejně čitelné.** Příprava a spuštění hry
  nesmí vyžadovat heslo do správy. Heslo chrání vytváření, úpravy a mazání
  balíčků. Balíčky desky zůstávají také veřejně čitelné.
- **`--c-spark` je vyhrazená pro pole Riziko!** Je to jediný divoký
  okamžik hry a po zrušení zlaté zároveň jediná teplá barva systému.
  Jakmile se objeví i jinde, přestane fungovat. Má tři stupně, protože na
  `--c-spark-deep`, což je červená UNIQA, tmavý text neprojde: plochy
  s tmavým textem končí na `--c-spark-mid`. Na rozcestníku ani v kvízu
  nemá co dělat.

## Data

`src/lib/db.ts` je rozhraní úložiště. Aplikace nikdy nesahá na Firestore
přímo. Implementace jsou dvě:

- `LocalDb` nad `localStorage`, jede bez jakéhokoli nastavení,
- `FirestoreDb` v `src/lib/firebase.ts`, zapne se, jakmile je vyplněný
  `src/lib/firebase.config.ts`.

`npm run dev:local` vynutí lokální režim i s vyplněnou konfigurací. Používej
ho, když zkoušíš něco, co by nemělo sáhnout na sdílená data.

Balíček otázek je **jeden dokument**, ne kolekce. Menší deska znamená
jednotky kilobajtů proti limitu 1 MB a získáme tím atomické ukládání,
jeden listener a triviální duplikaci. Cenou je, že při souběžné editaci
vyhraje poslední zápis; editor na to upozorní.

Hra si otázky při startu **zamrazí** do svého stavu. Úprava balíčku
uprostřed hry nesmí změnit desku, která běží na projektoru. U kvízu se
zamrazí i zamíchané pořadí možností: na plátně je jediné pořadí a telefon
nemá text, takže jiné pořadí u každého hráče by hru rozbilo.

Živá session kvízu má **vlastní rozhraní** `src/lib/sessionDb.ts`, ne metodu
navíc v `PlaygroundDb`. `LocalDb` ji splnit nemůže ani principiálně, telefon
v cizím zařízení se k `localStorage` moderátorčina notebooku nedostane.
`sessionDb()` proto vrací `null`, když Firestore není k dispozici, a kvíz
pak jede v režimu bez telefonů. Není to degradace, je to druhý způsob, jak
ho vést, a zároveň záchrana při výpadku wifi.

Smazání dokumentu ve Firestore **nemaže jeho podkolekce**. Po session musí
zmizet i `players` a `answers`, jinak zůstanou osiřelé dokumenty, které se
v konzoli ani neukážou.

## Reaktivita bez knihoven navíc

Stavy jsou obyčejné reaktivní singletony v `src/stores/`. Žádná Pinia.
Zapisuje se výhradně přes exportované funkce, aby změna vždy prošla
úložištěm.

Na hluboké kopie používej `clone()` z `src/lib/clone.ts`.
`structuredClone` na reaktivních objektech z Vue selže.

## Mobil

Správa otázek je na telefonu použitelná, matice kategorie krát hodnota se
pod 720 px přepíná na seznam podle kategorií (`BoardGrid.vue`, přepínač je
`useMediaQuery` z `src/lib/media.ts`). Editor otázky je na telefonu celá
obrazovka, ne vystředěné okno.

Herní deska na telefonu jen padne na obrazovku, s pěti kategoriemi vyjde
políčko na 65 px. Je to kompromis, hra se vede z notebooku.

## Ovládání na plátně

Obě hry se posouvají **mezerníkem**. Moderátorka nesahá na myš a nemusí se
učit nové klávesy. Na plátně je u každé fáze vidět, co udělá další stisk,
aby se nedalo omylem přeskočit odhalení. Správná odpověď se odhalí
automaticky a špatné se ztlumí ve dvou případech: po vypršení časového
limitu a ve chvíli, kdy odpoví všichni připojení hráči. Hlasování je tehdy
uzavřené tak jako tak a čekat na mezerník by jen drželo místnost
u obrazovky, která už nic nového neřekne. Automatika ale nikdy
nepostupuje na další otázku.

## Měření velikosti

`src/lib/fit.ts` ubírá `--fit`, dokud se obsah nevejde. Používá ho deska
i kvíz. Velikost textu se neodhaduje z počtu znaků, měří se.

## Přidání další hry

1. Nový adresář `src/games/<slug>/`.
2. Položka v `src/games/registry.ts`. Rozcestník ji přečte sám, dlaždice
   se do `HomeView.vue` nepíše ručně.
3. Routa v `src/router/index.ts` a pohled v `src/views/`.
4. Sdílené prvky ber z `src/components/ui/`.
5. Vlastní balíčky otázek a vlastní správu, viz pravidlo výš.

## Ověření změn

```bash
npm run typecheck
npm run build
```

Vizuál se neověří jinak než pohledem. Projdi hru v prohlížeči, na šířkách
1280 a 1920, s vypnutými animacemi a v režimu offline.
