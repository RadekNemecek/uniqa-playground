# Mučírna: konvence projektu

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
- **Slovo se nikdy nedělí na konci řádku.** Ani podle slovníku.
  „ODPOVĚDNOSTNÍ" rozseknuté na dva řádky se z posledního stolu přečte
  jako dvě slova a chvíli trvá, než si to člověk srovná. Když se text do
  boxu nevejde, ubere se na velikosti: `v-fit-text` z `src/lib/fitText.ts`
  měří šířku i výšku a snižuje `--fit-text`, dokud se obsah nevejde.
  Styl si to bere jako násobek tokenu, takže velikost dál vychází
  z tokenu, ne ze syrové hodnoty. `overflow-wrap: anywhere` se nepoužívá.
  Výjimka je jediná, adresa pod QR kódem: to není slovo, opisuje se po
  znacích a zmenšit ji nejde, ze zadní řady by ji nikdo nepřepsal.
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
- **Kvíz se ve výchozím stavu hraje celý.** Balíček se chystá na
  konkrétní školení, takže se zahrají všechny hotové otázky z vybraných
  balíčků, jen zamíchané dohromady. Strop na počet otázek je volba
  navíc, ne běžný postup, a `count: 0` v `QuizSetup` znamená „všechny".
  Se stropem se losuje po balíčcích kolem dokola, takže z každého vyjde
  stejný díl a z menšího se dobere jen to, co v něm je. Nabízejí se jen
  stropy nižší, než kolik je otázek k dispozici: strop, který se rovná
  celé zásobě, je jen past tvářící se jako volba.
- **Kvíz zná dva tvary otázky.** Čtveřici možností a tvrzení, na které se
  odpovídá Pravda, nebo Nepravda. Tvar se volí u každé otázky zvlášť a oba
  se v jednom balíčku i v jedné hře běžně střídají, losování mezi nimi
  nerozlišuje. Co se u tvrzení nemíchá, je pořadí jeho dvou možností:
  Pravda je vždycky A. Hráč na telefonu jejich znění nevidí a po druhém
  tvrzení má vědět, kam sáhnout. Slova Pravda a Nepravda nese
  `BOOLEAN_LABELS`, nepíše je autorka a do balíčku se neukládají. Balíček
  bez pole `kind` je čtveřice možností, přepisovat se kvůli tomu nemusí.
- **Obrázek k otázce patří jen na plátno.** Kvízová otázka může nést
  jeden obrázek. Do balíčku se ukládá odkaz, ne data: balíček je jeden
  dokument a editor ho přepisuje po každé pauze v psaní. Obrázky mají
  vlastní kolekci `quizImages`, jeden dokument na obrázek, uvnitř data
  URL po zmenšení na 1600 px a převodu do WebP (`src/games/kviz/image.ts`).
  Platí jeden obrázek, jeden vlastník: duplikace balíčku i import
  zakládají vlastní kopie a mazání otázky i balíčku obrázek uklidí,
  jinak zůstanou ve Firestore dokumenty, které nejsou nikde vidět.
  Telefon obrázek nedostane, do session nesmí o otázce nic.
  Na plátně si obrázek drží stejné místo i po odhalení; kdyby zmizel,
  dlaždice pod ním poskočí a měření je jednorázové. Rozměry se ukládají
  s obrázkem, aby měl box velikost dřív, než se obrázek dekóduje.
- **Po odhalení nese rozložení hlasů sama dlaždice.** Ne graf vedle ní:
  pět prvků na jednom plátně nikdo nepřečte. Dlaždici přeteče pruh
  z inkoustu podle počtu hlasů a číslo na kraji. Otázka se zároveň smrskne
  na řádek nad středem, protože visela na plátně celý limit, a uvolněný
  střed dostane poučka, kvůli které se kvíz hraje. Pruh i číslo si drží
  místo od začátku otázky a jen se odkryjí: `fitToScreen()` měří jednou
  a obsah se při odhalení nesmí pohnout. Když otázka poučku nemá, zůstane
  uprostřed ona, prázdný střed by byl horší než zopakování.
- **Průběžné pořadí se na plátno nedostane vůbec.** Ani bedna. Z místnosti
  se čte špatně, zdržuje mezi otázkami a každý stejně hledá jen sebe.
  Po odhalení jde mezerník rovnou na další otázku. Své místo, posun proti
  minulé otázce i odstup na lepšího vidí každý na svém telefonu hned po
  odhalení, celé pořadí je ve vyhodnocení.
- **Pořadí se během hry neukáže nikde, ani na telefonu.** Průběžné
  umístění svádí hráče porovnávat se s ostatními místo s otázkou a půlce
  místnosti říká, že se nemá cenu snažit. Body stoupají každému, pořadí
  jen třem. Telefon po odhalení ukáže verdikt, zisk a vlastní body, nic
  z toho není žebříček. Kdo je kolikátý, padne až na výsledkové tabuli.
  Texty jsou bez rodu, za přezdívkou nevíme, jestli je on, nebo ona.
- **Avatar nic nekóduje.** Zvíře hráče rozlišuje tvar a jméno, odstín pod
  ním je jen plocha. Proto avatar nepatří k běžící otázce vedle možností
  A až D, kde barva význam má. Kresby jsou v repozitáři
  (`src/games/kviz/avatars.ts`), ne stažená sada: žádná cizí licence
  a stejný výtvarný jazyk jako zbytek aplikace. Zvíře se vybírá před
  připojením; kartu hráče smí pak měnit jen moderátorka, takže je dané
  na celou hru.
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

## Komponentová vrstva

Tokeny jsou přízemí, komponenty druhé patro. **Nové UI se skládá
z `src/components/ui/`, nekreslí se znovu.** Dřív si každá obrazovka
stavěla vlastní tlačítka, dialogy a pole, takže pět souborů mělo víc CSS
než celá složka `ui/` a šest ikonových tlačítek vypadalo šesti způsoby.

- `UiIcon` a rejstřík `icons.ts`. **Žádné inline `<svg>` v komponentách**
  a žádný křížek zapsaný jako `&#215;`. Jedna velikostní škála
  (`--icon-*`) a jedna tloušťka tahu (`--icon-stroke`).
- `UiIconButton` na každé tlačítko, které nese jen ikonu.
- `UiButton` má `loading`, `icon` a plnou `danger` variantu. Destruktivní
  akce nesmí být vizuálně slabší než potvrzovací.
- `UiModal` drží focus trap, vrací zaměření a zamyká rolování přes čítač
  v `src/lib/scrollLock.ts`. **Vlastní dialog se nepíše**; potvrzení se umí
  otevřít nad jiným oknem a prostý přepínač `overflow` to rozbije.
- `UiField` umí chybu (`error`) a povinnost. Pole se nestyluje ručně.
- `UiSwitch` a `UiSegmented` na binární a malé výběry. Segmented je
  `radiogroup`, ne řada nezávislých `aria-pressed` tlačítek.
- `UiSkeleton` a `UiEmpty`. **Prázdný stav se nesmí ukázat místo
  načítání**: podmiňuje se `loaded` z příslušného storu, jinak správa na
  pomalé síti tvrdí „zatím tu nic není" a nabídne založit ukázku dřív, než
  dorazí skutečná data.

Breakpointy jsou **tři** a jsou vypsané v `tokens.css`: 560, 720, 960.
Jiný se nezavádí. Rozvržení jedné obrazovky patří do jejího
`<style scoped>`, ne mezi tokeny.

Zakázané: `!important`, `transition: all` (jsou na to `--tr-surface`
a `--tr-enter`), syrové `44px` místo `--control-touch`, syrový prstenec
zaměření místo `--focus-ring-*`.

## Prezentační režim

Jakmile hra běží, **rozhraní aplikace zmizí z plátna**. Hlavička se
značkou a přepínačem Hrát/Otázky patří do přípravy. Nad hrou zůstane jen
`PresentationBar`: vlevo název hry, uprostřed co udělá další stisk,
vpravo nástroje.

Pás se po chvíli schová a vrací se **pohybem myši, ne klávesou**. Hra se
vede mezerníkem, takže na klávesu by byl vidět pořád; takhle plátno
zčistí, jakmile moderátorka pustí myš.

Schovaný pás si drží místo v toku. Kdyby zmizel, obsah pod ním
poposkočí, a ten je změřený na jednu obrazovku.

Stav celé obrazovky se čte z `fullscreenchange`, ne z vlastního
přepínače: odchází se z ní i Escapem a F11.

## Archiv odehraných her

Po hře musí něco zůstat, jinak se půlhodina školení ztratí. Deska zapisuje
do `src/games/pojistuj/runLog.ts` (localStorage, posledních 50 her), kvíz
do `quizReports`. Obojí nese **název skupiny**, jinak je archiv jen seznam
dat.

U kvízu se ukládají přezdívky účastníků. Patří k nim doba uchování, viz
`DEPLOY.md`.

Výsledky kvízu mají **vlastní záložku** vedle Hrát a Otázky
(`src/views/KvizReportsView.vue`, cesta z `reportsRoute` v registru her).
Jsou to dvě různé práce: otázky se chystají před školením, výsledky se
čtou po něm, a jako oddíl pod knihovnou balíčků se k nim muselo
prorolovat. Záložku dostane jen hra, která `reportsRoute` má. Heslo
chrání totéž co správu, jsou v nich přezdívky.

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
navíc v `MucirnaDb`. `LocalDb` ji splnit nemůže ani principiálně, telefon
v cizím zařízení se k `localStorage` moderátorčina notebooku nedostane.
`sessionDb()` proto vrací `null`, když Firestore není k dispozici, a kvíz
pak jede v režimu bez telefonů. Není to degradace, je to druhý způsob, jak
ho vést, a zároveň záchrana při výpadku wifi.

Firestore **neumí pole v poli**. Matice „kdo co zmáčkl" ve vyhodnocení
je přesně to, takže se na hranici úložiště převádí: řádek jde do databáze
zabalený v objektu (`encodeReport` a `decodeReport` v `firebaseSession.ts`).
V aplikaci zůstává maticí. Bez toho odmítne Firestore celý dokument ještě
před pravidly a moderátorce zbyde jen stažená tabulka.

Telefon hráče jede na **paměťové mezipaměti**, ne na trvalé. Volí se podle
adresy při startu (`isPlayerDevice()` v `firebase.ts`). Trvalá mezipaměť
s volbou hlavní karty tam škodí: spojení drží jediná karta a když ji
prohlížeč na pozadí uspí, ostatní zamrznou na poslední uložené fázi.
Offline režim tam k ničemu není, bez sítě se stejně odpovědět nedá.

Spojení umí tiše umřít, aniž by to klient ohlásil. Telefon proto sleduje,
jestli snímek přišel ze serveru, nebo z mezipaměti, a když se drží
mezipaměti, řekne to hráči a spojení kříší sám: napřed `resync()`, pak
nasadí listenery znovu, protože `onSnapshot` po chybě umře a sám se
nezotaví. Prázdný snímek z mezipaměti se zahazuje, „hra neběží" smí říct
jen server.

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
učit nové klávesy. Časomíra je v obou hrách **nad otázkou**: místnost čte
otázku a ubývající čas má mít v témže pohledu. Pás si drží výšku i mimo
běžící otázku, aby obsah pod ním nepoposkočil, a nic dalšího do něj
nepřibývá: řádek navíc by posunul obsah, který je změřený na jednu
obrazovku. Na plátně je u každé fáze vidět, co udělá další stisk,
aby se nedalo omylem přeskočit odhalení. Správná odpověď se odhalí
automaticky a špatné se ztlumí ve dvou případech: po vypršení časového
limitu a ve chvíli, kdy odpoví všichni připojení hráči. Hlasování je tehdy
uzavřené tak jako tak a čekat na mezerník by jen drželo místnost
u obrazovky, která už nic nového neřekne. Automatika ale nikdy
nepostupuje na další otázku. Po poslední otázce vede mezerník z odhalení
rovnou na vyhlášení: průběžné pořadí by ukázalo bednu, kterou vzápětí
přebije celá listina.

## Měření velikosti

`src/lib/fit.ts` ubírá `--fit`, dokud se obsah nevejde. Používá ho deska
i kvíz. Velikost textu se neodhaduje z počtu znaků, měří se.

Totéž o patro níž dělá `src/lib/fitText.ts` s jedním boxem: direktiva
`v-fit-text` ubírá `--fit-text`, dokud se text vejde do své plochy. Slouží
k tomu, aby se nemusela dělit slova. Přeměřuje se jen při změně **šířky**
boxu, protože měření samo mění výšku a observer by se točil dokola.
Přetečení do šířky se nepozná ze `scrollWidth`, viditelně přeteklý text se
do něj nepočítá, měří se proto rozsah textu přes `Range`.

Nástupová animace uvnitř měřeného obsahu nesmí prvek posunout pod dolní
okraj. Takový posun se započítá do `scrollHeight`, měření ho přečte jako
přetečení a zmenší celou obrazovku na minimum, ze kterého se sama
nevrátí. Nástupy proto jen zesvětlují a zvětšují do místa. Písmo dorazí
až po prvním vykreslení, takže se po něm měří znovu (`refitOnFonts`).

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
