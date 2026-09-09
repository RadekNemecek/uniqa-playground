# Playground: konvence projektu

Vue 3 + Vite + TypeScript, statická aplikace na GitHub Pages, data ve
Firestore. Hra Pojišťuj! je první, další mají přibývat jako moduly.

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
  text/plocha v `tokens.css` má poměr v komentáři a platí v obou vrstvách.
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
- **Dvě barevné vrstvy se stejnými názvy tokenů.** `:root` je světlá a patří
  správě otázek, kde se pracuje. `:root[data-theme="dark"]` je tmavě modrá
  a patří rozcestníku a hře, kde se promítá. Přepíná je router podle
  `meta.theme` routy, komponenty o vrstvách nevědí. Nová barva se musí
  doplnit do obou, jinak propadne na hodnotu z té druhé.
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
- **`--c-spark` je vyhrazená pro pole Nepojištěno!** Je to jediný divoký
  okamžik hry a po zrušení zlaté zároveň jediná teplá barva systému.
  Jakmile se objeví i jinde, přestane fungovat. Má tři stupně, protože na
  `--c-spark-deep`, což je červená UNIQA, tmavý text neprojde: plochy
  s tmavým textem končí na `--c-spark-mid`.

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
uprostřed hry nesmí změnit desku, která běží na projektoru.

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

## Přidání další hry

1. Nový adresář `src/games/<slug>/`.
2. Položka v `src/games/registry.ts`.
3. Routa v `src/router/index.ts` a pohled v `src/views/`.
4. Sdílené prvky ber z `src/components/ui/`.

## Ověření změn

```bash
npm run typecheck
npm run build
```

Vizuál se neověří jinak než pohledem. Projdi hru v prohlížeči, na šířkách
1280 a 1920, s vypnutými animacemi a v režimu offline.
