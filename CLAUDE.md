# Mučírna: konvence projektu

Vue 3 + Vite + TypeScript, statická aplikace na Firebase Hostingu, data ve
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
  text. Text na papíře se počítá i vůči zrnu `--bg-paper`, na nejtmavším
  průměru přes plošku 2×2 px (tah písmene). Postup je v komentáři u zrna.
- **Tým se nikdy nerozlišuje jen barvou.** Vždy je vedle ní i písmeno.
- **Slovo se nikdy nedělí na konci řádku.** Ani podle slovníku.
  „ODPOVĚDNOSTNÍ" rozseknuté na dva řádky se z posledního stolu přečte
  jako dvě slova a chvíli trvá, než si to člověk srovná. Když se text do
  boxu nevejde, ubere se na velikosti: `v-fit-text` z `src/lib/fitText.ts`
  měří šířku i výšku a snižuje `--fit-text`, dokud se obsah nevejde.
  Styl si to bere jako násobek tokenu, takže velikost dál vychází
  z tokenu, ne ze syrové hodnoty. `overflow-wrap: anywhere` se na plátně
  nepoužívá. Ve správě, v přípravě a ve výsledcích smí: název balíčku
  ani znění otázky se nečtou ze zadní řady a autorka tam píše, co chce.
  Na plátně je výjimka jediná, adresa pod QR kódem: to není slovo, opisuje se po
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
  400, 700 a 900. Caveat je ruční a smí být jen na třech místech: řádek
  pod značkou na rozcestníku, kicker v dialogu sázky, blahopřání na
  výsledkové obrazovce.
  Nikdy nenese otázku, odpověď, hodnotu ani ovládací prvek, ty se čtou
  z druhého konce místnosti a tam vyhrává čitelnost nad charakterem.
- **Jedno téma, světlý papír a inkoust.** Hravý neobrutalismus: plocha je
  papír UNIQA `#EEF2FA`, karty bílé, obrysy tlusté inkoustové a stíny
  tvrdé, posunuté a bez rozmazání (`--shadow-sm/md/lg`). Hloubku nedělá
  světlo, lesk ani přechod, ale stín, do kterého se klikatelný prvek
  při stisku zamáčkne. Platí na všechno: hru, rozcestník, přípravu,
  správu otázek i výsledky. Papír má zrno (`--bg-paper`) pod každou
  stránkou, i pod deskou na projektoru; karty zůstávají hladké bílé.
  Jen zrno, ne vlákna, skvrnky ani mřížka sešitu: všechno to bylo
  v ukázkách a vyhrálo to nejtišší. Obláčky pod zrnem byly taky
  a na ploše se četly jako tmavé fleky, nevracet je. Síla je vybraná pohledem, kontrast
  se k ní dopočítal a kvůli ní je `--c-bad` o stupeň tmavší. Tmavě modré téma tu bylo dřív a působilo
  jako studentská práce: všechno mělo jeden odstín, takže oko nemělo
  co vést. Nevracet ho bez pádnějšího důvodu.
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
- **Dlaždice rozcestníku je klikatelná celá.** Tlačítko v ní zůstává,
  aby bylo vidět, co se stane, a aby měla klávesnice cíl, na který se dá
  zaměřit. Roztažený pseudoprvek na to nestačí, `UiButton` je sám
  polohovaný a překryv se zastaví na jeho okraji, takže kliknutí nese
  sama karta a tlačítko uvnitř zastavuje probublání. K balíčkům se
  odtud nechodí, ta cesta vede z hlavičky hry.
- **Rozcestník je titulní strana s dopadem.** Nahoře jen nápis,
  nálepka s větou a dvě tlačítka: Vybrat hru, které k výběru plynule
  odroluje, a vedle něj tiché Připojit se kódem. To je pro účastníka
  s telefonem, který QR nenačte (odlesk projektoru, zadní řada) a na
  adresu Mučírny se dostal sám: vede na `/k`, kde opíše kód z plátna.
  Kód kvízu i Výslechu vypadá stejně, takže `/k` po kódu, pod kterým
  kvíz neběží, zkusí otevřený dotazník a přesměruje na `/v/:code`.
  V horní řádce je vlevo nadhoz, vpravo nabídka a nepřihlášenému
  i tlačítko Přihlásit se (na telefonu jen v nabídce, tam je skoro
  vždycky účastník). Karta hry nepřihlášenému řekne, že je pro členy
  týmu, dřív než klikne a ocitne se na formuláři.
  Sekvence: vyskočí písmena „učírna", shora spadne dlaždice s M,
  dopadne, smáčkne se, slovo se otřese a kolem nadskočí barevné
  dlaždice v pozadí. Vtip s odebraným „M" se tím přečte sám, věta na
  nálepce ho jen dopoví, proto přijde až po dopadu. Dlaždice v pozadí
  jsou v barvách možností A až D s inkoustovou hranou, leží u okrajů
  a pomalu se pohupují. Hranu mají v procentech šířky okna, takže na
  velkém monitoru rostou s ním; v pevné velikosti tam zbyly drobné
  a úvod působil prázdně. Za myší se nehýbou: posun proti kurzoru tu
  byl a víc rušil, než přidal hloubku. Pod nimi je
  papír se zrnem: rastrové tečky tu byly a neosvědčily se. Na telefonu
  zůstanou jen dlaždice v rozích. Žádná fotka ani generovaná grafika. Zpod úvodu vykoukne
  nadpis výběru her (`--home-peek`), aby bylo vidět, že se roluje.
  Hry jsou až na druhé obrazovce: dvě barevné karty, mírně natočené
  každá na jinou stranu, s nálepkou a živým náhledem. Časování drží
  tokeny `--delay-mark-*`, při `prefers-reduced-motion` stojí všechno
  rovnou v cíli.
- **Nápis Mučírna je plochý a živý.** Dlaždice s M je plná modrá UNIQA
  s inkoustovou hranou a tvrdým stínem, slovo je inkoust. Žádný lesk,
  přeliv ani odlesk: ve velikosti, jakou má na rozcestníku, z toho byla
  ikona z roku 2012. Po úvodu nápis nezůstane mrtvý: jednou za čas M
  strčí do písmen a ta se zhoupnou jako domino, jindy M vyskočí a za
  ním poskočí písmena, do třetice se M otočí. Cyklus je dlouhý
  (`--dur-idle`), aby se to dělo občas. Rozměry uvnitř nápisu jsou
  v `em`, roste jako celek s `--fs-home-mark`. Barvy jdou přes
  `--mark-*`. Favicona a náhledová karta se kreslí z téže dlaždice
  (`scripts/make-icons.mjs`).
- **Pohyb se neláme na klíčových snímcích.** Křivka z `animation` platí
  pro každý úsek mezi snímky zvlášť, takže `--ease-out` u animace se
  třemi snímky na začátku každého úseku cukne a na konci stojí.
  Vyskočení s překmitem je jeden přechod `from → to` na
  `--ease-spring` nebo `--ease-spring-soft`. Kde snímky zůstanou
  (pády, odskoky), jede animace `linear` a křivku nese každý snímek:
  dolů `--ease-fall`, nahoru `--ease-rise`, smáčknutí až na zemi.
  Rychle letící prvek nesmí poskočit o víc než asi 40 px za snímek,
  jinak se místo pohybu zjeví. Dvě animace téže vlastnosti na jednom
  prvku (dvakrát `transform`) prohlížeč nepustí do kompozitoru, druhá
  jde na `scale`, `rotate` nebo `translate`. `box-shadow` se
  neanimuje, zamáčknutí do stínu je posun přes plochu pod prvkem.
- **Dlaždice s M je postavička, ne maskot se jménem.** `MascotTile.vue`
  je tatáž kresba jako značka, bez obličeje, povahu nese jen pohyb:
  dopadne, pak podle nálady vyskočí, přepadne přes hranu, nakloní hlavu,
  nebo čeká. Patří tam, kde se čeká a nic důležitého se nečte: telefon
  hráče (čekárna, odhalení, konec, hra neběží), čekárna kvízu a vyhlášení
  na plátně. Ne k běžící otázce, ne do správy ani Výslechu a ne k desce
  Pojišťuj!, kde týmy nesou dlaždice s písmenem a M by se četlo jako tým.
  Samostatná postavička tu nebude: srazila by se se zvířaty hráčů
  a táhla by k dětskosti, se kterou se tu už dvakrát bojovalo.
- **Hravost patří do hry a na rozcestník, ne do správy otázek.** Obrys,
  tvrdý stín a zamáčknutí při stisku jsou jazyk celého rozhraní, i ve
  správě. Ozdoby navíc, tedy nálepky, natočení, poskakování a dlaždice
  v pozadí, patří jen hře a rozcestníku. Ve správě se pracuje.
- **Zvuky jsou ze stolu, ne z haly.** Výchozí sada „Stůl" v
  `src/lib/sound.ts` patří k papírovému vzhledu: suché údery dřeva
  a marimby, plop, bzučák, skoro bez dozvuku. Původní měkká „Hala" zůstává
  jako volba v nastavení. Pořád žádné soubory, všechno je Web Audio.
  Zvuk má jen plátno, telefon hráče mlčí. Nový zvuk se přidává do obou
  sad, aby přepnutí nic neztratilo.
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
  odpovídá ANO, nebo NE. Tvar se volí u každé otázky zvlášť a oba
  se v jednom balíčku i v jedné hře běžně střídají, losování mezi nimi
  nerozlišuje. Co se u tvrzení nemíchá, je pořadí jeho dvou možností:
  ANO je vždycky A. Hráč na telefonu jejich znění nevidí a po druhém
  tvrzení má vědět, kam sáhnout. Slova ANO a NE nese
  `BOOLEAN_LABELS`, nepíše je autorka a do balíčku se neukládají. Balíček
  bez pole `kind` je čtveřice možností, přepisovat se kvůli tomu nemusí.
- **Obrázek k otázce patří jen na plátno.** Kvízová otázka může nést
  jeden obrázek. Do balíčku se ukládá odkaz, ne data: balíček je jeden
  dokument a editor ho přepisuje po každé pauze v psaní. Obrázky mají
  vlastní kolekci `quizImages`, jeden dokument na obrázek, uvnitř data
  URL po zmenšení na 1600 px a převodu do WebP (`src/games/kviz/image.ts`).
  Platí jeden obrázek, jeden vlastník: duplikace balíčku zakládá
  vlastní kopie a mazání otázky i balíčku obrázek uklidí,
  jinak zůstanou ve Firestore dokumenty, které nejsou nikde vidět.
  Telefon obrázek nedostane, do session nesmí o otázce nic.
  Na plátně si obrázek drží stejné místo i po odhalení; kdyby zmizel,
  dlaždice pod ním poskočí a měření je jednorázové. Rozměry se ukládají
  s obrázkem, aby měl box velikost dřív, než se obrázek dekóduje.
- **Hotové balíčky kvízu se zakládají z nabídky ve správě.** Ukázka
  z pojištění (`demoPack.ts`), rodinný kvíz (`familyPack.ts`) a všeobecné
  znalosti pro děti od jedenácti let (`generalPack.ts`). Kresby
  rodinného kvízu jsou vlastní SVG v `src/assets/quiz/rodina/`, žádné
  stažené postavy: otázku nese předmět, ne cizí kresba. Při založení se
  převedou na WebP (`rasterizeQuizImage()`), takže se chovají jako
  nahraný obrázek a SVG se do úložiště nedostane. Kresba je ořízlá
  těsně na 4:3, plátno obrázek zmenšuje spolu s textem a prázdný okraj
  by ho zmenšil ještě víc. Žádná kresba neprozradí odpověď písmem.
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
  A až D, kde barva význam má. Kresby jsou vlastní SVG v repozitáři
  (`src/assets/avatars/`, seznam v `src/games/kviz/avatars.ts`), ne
  stažená sada: žádná cizí licence a stejný výtvarný jazyk jako zbytek
  aplikace. Jen hlava zvířete, tlustý inkoustový obrys, ploché barvy
  z palety, bez stínování a přechodů. Bez žluté a bez jiskry, liška i lev
  jsou v písku. Avatar sedí v dlaždici, ne v kolečku. Dřív to byla
  kreslená dětská sada se stínováním a v malém se slévala do skvrny.
  Zvíře se vybírá před připojením; kartu hráče smí pak měnit jen
  moderátorka, takže je dané na celou hru.
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
- **Data týmu vidí jen člen týmu.** Balíčky obou her, obrázky, sady
  Výslechu i výsledky leží pod `spaces/{prostor}` a čte je i mění jen
  přihlášený člen s ověřeným e-mailem. Telefon hráče se nepřihlašuje,
  zná jen kód hry a do prostoru nevidí. Admin navíc spravuje členy,
  editor smí všechno ostatní. Účet vzniká jen z pozvánky, registrace
  není. Podrobně v kapitole Přihlášení a tým.
- **Polí Riziko! je nejvýš jedno na kategorii a nejvýš čtyři.** Dvě pole
  v jednom sloupci by se potkala a víc než čtyři sázky za půlhodinu je
  zdržení. Strop se počítá z počtu vybraných kategorií, ne z počtu
  políček: dřív to bylo jedno pole na šest políček, což nikde nestálo,
  nedalo se to z obrazovky uhodnout a při jedné kategorii vycházela
  nula, takže se celá volba tiše zakázala. Omezení patří do nápovědy
  pod přepínačem, ne jen do kódu.
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
- `UiButton` má `loading`, `icon`, `iconAfter` a plnou `danger` variantu.
  Destruktivní akce nesmí být vizuálně slabší než potvrzovací. Tlačítko
  se při najetí posune do půlky svého stínu a při stisku do celého.
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
zaměření místo `--focus-ring-*`, rozmazaný stín, `backdrop-filter`
a barevné písmo v barvě týmu nebo možnosti. Světlé odstíny týmů jsou
plocha pod inkoustovým textem, na bílé jako text zmizí; tým se proto
ukazuje štítkem ve své barvě. Stavové barvy mají dvě podoby:
`--c-ok`/`--c-bad` jako text a `--c-ok-fill`/`--c-bad-fill` jako plocha
pod inkoustem.

## Prezentační režim

Jakmile hra běží, **rozhraní aplikace zmizí z plátna**. Hlavička se
značkou a přepínačem Hrát/Otázky patří do přípravy. Nad hrou zůstane jen
`PresentationBar`: vlevo název hry, uprostřed co udělá další stisk,
vpravo jediné tlačítko s nabídkou.

Pás je **vidět pořád**. Dřív se po chvíli bez myši schovával, ale při
každém pohybu se vracel a víc rušil, než šetřil. Plátno místo toho
čistí nabídka: nástroje nesvítí v řadě vedle sebe, leží pod jedním
tlačítkem. Nahoře to, co patří ke hře (vrácení bodování, výsledky,
klávesy, hráči), pod tím zobrazení (celá obrazovka, písmo a zvuk)
a úplně dole, oddělené a červené, ukončení hry. Celou obrazovku
i nastavení obstará pás sám, hra dodá jen svoje položky a popisek
ukončení. Mezerník na položce nabídky patří položce, hru neposune.

Stav celé obrazovky se čte z `fullscreenchange`, ne z vlastního
přepínače: odchází se z ní i Escapem a F11.

## Výslech, zpětná vazba po školení

Nástroj, ne hra. Je v `TOOLS` v registru, ne v `GAMES`, takže na
rozcestníku **nemá kartu**: chodí se k němu z nabídky aplikace
(`AppMenu`, tři čáry v hlavičce a v rohu rozcestníku). Celý je jen pro
členy týmu, i příprava, protože jsou v něm hodnocení lektorů. Kdo sběr
spustil, se ve výsledcích schválně neukládá: obvykle je to lektor,
kterého se hodnocení týká. Pole Lektor/ka se sice předvyplní jménem
přihlášeného, ale je vidět a dá se smazat; `hostEmail` jako kvíz
Výslech nikdy nedostane.

- **Telefon dostane celou sadu najednou** a odešle ji jedním tlačítkem.
  Na plátně otázky neběží, každý vyplňuje svým tempem. Rozepsané odpovědi
  drží telefon, odeslání čeká na potvrzení serverem.
- **Plátno ukazuje jen QR kód a počet odevzdaných dotazníků.** Výsledky
  se v sále neukazují: v malé skupině by šlo poznat, kdo co napsal,
  a lektor by komentoval vlastní hodnocení před lidmi.
- **Anonymita.** Telefon nezadává jméno, dokument odpovědí má za id jen
  anonymní uid a do vyhodnocení jdou dotazníky bez uid a v náhodném
  pořadí. Řádek drží pohromadě odpovědi jednoho člověka, aby šlo číst
  „co napsali nespokojení".
- **Otázky se při spuštění zamrazí** do session, srovnání školení se páruje
  podle id otázky. Kopie sady dostane nová id, jinak by se tvářila jako
  pokračování originálu. První škála sady je celková známka, podle ní se
  ve výsledcích filtruje.
- **Ukončení má pevné pořadí**: zavřít sběr, načíst odpovědi ze serveru,
  uložit vyhodnocení, teprve pak uklidit session s podkolekcí. Bez
  odpovědí se nic neukládá.
- Úložiště má vlastní rozhraní `src/lib/vyslechDb.ts`. Na rozdíl od kvízu
  má i lokální implementaci (`localVyslech.ts`), aby šel Výslech zkoušet
  v `dev:local` z více karet. Příprava pak řekne, že se telefony v sále
  nepřipojí. Adresa pro telefon je `/v/:code` a má paměťovou mezipaměť
  stejně jako `/k`.

## Archiv odehraných her

Po hře musí něco zůstat, jinak se půlhodina školení ztratí. Deska zapisuje
do `pojistujRuns`, kvíz do `quizReports`, obojí ve sdílené databázi týmu.
Deska dřív ukládala jen do prohlížeče notebooku a kolegyně archiv
neviděla. V lokálním režimu jde záznam do localStorage (posledních 50
her, `runLog.ts`) a po připojení se jednou přestěhuje nahoru. Záznam desky
se smí přepsat: z výsledků se jde zpátky na desku a dohrát. Obojí nese
**název skupiny** a **lektora**, jinak je archiv jen seznam dat.

**Pro koho** je ve všech třech přípravách týž blok (`AudienceFields.vue`).
Skupina se z minula **nepředvyplňuje**, stará hodnota v poli se
přehlédla a zanášela archiv chybou. Naposledy použité skupiny se jen
nabízejí v `datalist` (`src/lib/recent.ts`, společné pro hry i Výslech).
Lektor se ve hrách **nezobrazuje**, bere se ze jména přihlášeného: hru
spouští ten, kdo školí, a lektorky pole navíc jen zdržovalo. Výslech
pole ukazuje (`show-trainer`), protože hodnotí konkrétního lektora a sběr
za něj někdy spouští kolegyně. Odhlášení naposledy použité skupiny
z počítače smaže. Starší vyhodnocení kvízu lektora nemají, seznam pak
ukáže `hostEmail`.

U kvízu se ukládají přezdívky účastníků. Patří k nim doba uchování, viz
`DEPLOY.md`.

Všechno, co není hra, je **jedna obrazovka v několika stavech**, ne
hromada různých nástrojů. Platí to napříč oběma hrami: příprava, správa
otázek i výsledky mají tentýž nadpisový blok (nadhoz, tvrzení s tečkou,
jednořádkový lead v sazbě `--content-reading`), tentýž linkovaný seznam
s pořadovým číslem a nabídkou akcí na řádku a tutéž hlavičku. Příprava
obou her má navíc týž tvar: číslované sekce `01`, `02`, `03` v jednom
sloupci a vpravo lepivé shrnutí s jediným hlavním tlačítkem a řádkou
„co bude dál". Sekce s dlouhým seznamem jde poslední: v kvízu je napřed
průběh a Pro koho, balíčky až za nimi. Obráceně se nastavení při
desítce balíčků ztratilo pod okrajem a kdo zaškrtl horní balíček a šel
rovnou na tlačítko, o čase ani skupině nevěděl. Shrnutí vedle tlačítka
ukazuje všechno nastavené. Hlavičku přepíná `prep`, který z pilulek udělá řádku
záložek a z „Hrát" „Přípravu".

Výsledky obou her mají **vlastní záložku** vedle Přípravy a Balíčků
(`KvizReportsView.vue`, `PojistujReportsView.vue`, cesta z `reportsRoute`
v registru her).
Jsou to dvě různé práce: otázky se chystají před školením, výsledky se
čtou po něm, a jako oddíl pod knihovnou balíčků se k nim muselo
prorolovat. Záložku dostane jen hra, která `reportsRoute` má. Čte je jen
tým, jsou v nich přezdívky. Každé vyhodnocení nese `hostEmail`, tedy
kdo školení vedl.

## Přihlášení a tým

Dřív otevíralo správu jedno sdílené heslo a balíčky četl kdokoli
s adresou. Teď má každý vlastní účet a data týmu vidí jen člen.

- **Účet vzniká jen z pozvánky.** Admin v `/tym` zapíše e-mail a roli,
  aplikace pošle přihlašovací odkaz Firebase (`sendSignInLinkToEmail`).
  Kliknutím člověk prokáže, že adresa je jeho, na `/pozvanka` si nastaví
  heslo a dál se přihlašuje e-mailem a heslem na `/prihlaseni`.
  Registrace na přihlášení není a být nemá: členství je vázané na
  e-mail, a kdo by si mohl založit účet sám, založil by si ho i na
  cizí adresu. Pravidla proto chtějí ověřený e-mail.
- **Pozvánka platí tři dny** od posledního odeslání (`INVITE_DAYS`
  v `account.ts` a `inviteHolds` v pravidlech, mění se obojí naráz).
  Nepřijatá starší nikoho nepustí, admin ji v `/tym` vidí červeně
  a pošle znovu, což lhůtu posune. Přijatou (`joinedAt`) lhůta
  neomezuje. Samotný odkaz z mailu drží Firebase jen hodiny a délku
  nastavit nedovolí, proto `/pozvanka` propadlý odkaz pozná hned při
  otevření (`checkActionCode`, kód se tím nespotřebuje) a pozvaný si
  v rámci lhůty pošle nový sám.
- **Odkazy z pošty stojí Blaze.** Na Sparku pošle Firebase pět
  přihlašovacích odkazů denně na celý projekt, proto projekt běží na
  Blaze. Zapomenuté heslo jde přes `sendPasswordResetEmail`.
- **Člen má za id e-mail** malými písmeny (`spaces/{prostor}/members/{email}`),
  protože admin zve dřív, než má kolegyně uid. Po přihlášení se členství
  hledá dotazem přes všechny prostory (`collectionGroup('members')`
  podle pole `email`). První přihlášení zapíše `joinedAt`, podle toho
  `/tym` pozná nepřijatou pozvánku.
- **Člen má jméno.** Zadává ho při přijetí pozvánky (povinné) a pak si
  ho mění sám v `/tym`, cizí jméno smí měnit jen admin. Pravidla členovi
  u vlastního záznamu dovolí jen `name` a jednou `joinedAt`. Ze jména se
  bere lektor her a v hlavičce se z něj ukazuje **jen křestní**:
  příprava často běží na promítnutém plátně, celé jméno ani adresa tam
  nepatří. Nabídka aplikace má pak pro člena místo tří čar štítek
  s iniciálou a křestním jménem, na telefonu jen iniciálu. Kdo jméno
  nemá, uvidí v nabídce Doplnit jméno. Heslo se mění odkazem do pošty
  z vlastního řádku v `/tym`.
- **Stav účtu** je v `src/stores/account.ts`, plní ho `firebase.ts` při
  startu. Router pouští na obrazovky s `meta.access: 'member'` jen člena,
  ostatní posílá na přihlášení s `?dal=` cestou, kam mířili. Po přihlášení
  i odhlášení se stránka načte znovu, ať se Firestore rozjede načisto.
  Odhlášení maže i mezipaměť Firestore v prohlížeči, notebook bývá sdílený.
- **Bez sítě se hra spustí.** Poslední ověřené členství si počítač
  pamatuje a pustí člena dovnitř hned, ověření ze serveru doběhne na
  pozadí. Rozhodují stejně pravidla na serveru.
- **Lokální režim nemá přihlášení.** Bez Firestore, v `dev:local` i při
  výpadku před školením, jsou data jen z tohoto počítače a není co
  chránit. Pozdě dorazivší spojení účet nepřepíše, jinak by uprostřed
  hry vyhodilo moderátorku na přihlášení.
- **Běžící hra a sběr zůstávají nahoře** (`quiz/{kód}`, `vyslech/{kód}`),
  telefon je hledá podle kódu. Nesou `spaceId` a založit je smí jen člen
  toho prostoru.
- **Prostor je zatím jeden** (`uniqa`) a zakládá ho skript. Pro více
  týmů stačí povolit zakládání prostoru a zapsat zakladatele jako admina,
  model s tím počítá.

Pravidla mají testy v emulátoru (`npm run test:rules`). Celý průběh
s pozvánkami jde vyzkoušet na emulátorech bez sahání na ostrá data:
`npm run emulators` a vedle `npm run dev:emu`. Odkazy, které by odešly
mailem, vypisuje emulátor na
`http://127.0.0.1:9099/emulator/v1/projects/uniqa-playground/oobCodes`.

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
npm run test:rules
```

`test:rules` pouští testy pravidel Firestore v emulátoru (`tests/rules.test.mjs`)
a potřebuje Javu. Homebrew ji nedává do `PATH`, takže buď
`export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`, nebo symlink podle
`brew info openjdk`. Každá změna pravidel přichází s testem, který ji hlídá.

Vizuál se neověří jinak než pohledem. Projdi hru v prohlížeči, na šířkách
1280 a 1920, s vypnutými animacemi a v režimu offline.
