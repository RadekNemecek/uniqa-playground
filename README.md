# Playground

Interaktivní hry pro školení týmů. První hra je **Pojišťuj!**: deska
kategorií a bodových hodnot, jeden až šest týmů, vlastní otázky, časomíra
a pole **Nepojištěno!**, kde tým před otázkou vsadí část svých bodů. Běží
jako statická webová aplikace, hostovaná na GitHub Pages.

Projekt je stavěný tak, aby další hra byla přírůstek, ne přestavba: hry jsou
moduly v `src/games/`, evidované v `src/games/registry.ts`.

## Rychlý start

```bash
npm install
npm run dev
```

Aplikace naběhne bez jakéhokoli nastavení. Dokud není vyplněná konfigurace
Firebase, ukládá data do prohlížeče (režim `local`), takže se dá hned zkoušet.
Při prvním spuštění se založí ukázkový balíček otázek.

## Jak se hra vede

1. **Otázky** připravíš předem v sekci *Otázky*. Deska v editoru vypadá
   stejně jako ta, kterou uvidí hráči: klikneš na políčko a napíšeš k němu
   otázku a odpověď. Tlačítko *Doplnit chybějící* tě provede zbytkem.
2. **Hrát** otevře přípravu: vybereš balíček, kategorie, týmy a pravidla.
3. Na desce klikneš na políčko, zobrazí se otázka. Správnou odpověď
   neznáš, odhalíš ji dalším kliknutím nebo mezerníkem.
4. Vyhodnotíš **Správně** nebo **Špatně**. Při správné odpovědi se políčko
   obarví barvou týmu a body přiskočí, při špatné políčko zčerná.
   Na poli **Nepojištěno!** si tým nejdřív vsadí, kolik bodů riskuje.
5. Když odpověděl jiný tým, použij pruh *Body přiznat jinému týmu*.

### Klávesnice

| klávesa | co dělá |
|---|---|
| šipky | pohyb po desce |
| Enter | otevře políčko, potom potvrdí správnou odpověď |
| mezerník | odhalí správnou odpověď |
| 1 az 6 | přizná body danému týmu |
| N nebo 0 | neuhodl nikdo |
| Esc | zavře políčko bez bodování |

Tlačítko **Zpět** vrátí poslední bodování včetně stavu políčka. Rozehraná hra
přežije obnovení stránky i pád prohlížeče.

## Nasazení a sdílení otázek

Aby otázky viděli i kolegové a nemusely se přenášet ručně, připojí se projekt
k Firebase Firestore. Celý postup je v [`DEPLOY.md`](DEPLOY.md).

## Vizuál

Aplikace je laděná do značky UNIQA, ale není to oficiální nástroj
pojišťovny.

**Barvy a písma nejsou odhadnuté.** Jsou změřené z živých stylů na
uniqa.cz: modrá `#005CA9`, inkoust `#1B1B1B`, plochy `#EEF2FA` a `#D5DEEE`,
zelená `#026E46`, červená `#D71C4F`, poloměry 4 a 8 px. Písmo je **Lato**,
kterým UNIQA sází, a **Caveat**, ruční řez, který si na svůj web pustila
sama tam, kde chce znít lidsky. Hravost se tedy ke značce nepřilepuje,
jen se zesiluje to, co v ní už je.

**Jedno téma, tmavě modré.** Rampa ploch je čistý odstín `#005CA9`
ztlumený do hloubky, takže deska i rozhraní nesou barvu značky. Platí
i pro správu otázek: hraje se na projektoru a správa má vypadat jako
součást hry, ne jako cizí nástroj.

**Zlatá v systému není**, UNIQA žádnou nemá. Hodnoty na dlaždicích jsou
bílé, akcent je modrý a jediná teplá barva patří poli **Nepojištěno!**
Jeho hrana je červená UNIQA, tedy barva, kterou pojišťovna dává na chyby.
Pole bez krytí je obarvené vlastní varovnou barvou značky.

## Logo UNIQA

V repozitáři není a bez svolení se nepoužije. UNIQA to říká výslovně:
logo nesmí být použito bez souhlasu UNIQA Insurance Group AG, kontakt je
`grafik@uniqa.at`, v ČR to půjde přes místní marketing. Do té doby stojí
v hlavičce vlastní značka, mřížka dlaždic s jednou rozsvícenou, a na
rozcestníku nenápadná věta „Vytvořeno pro tým UNIQA".

Až svolení přijde, patří logo do `public/`, do hlavičky
`src/components/AppHeader.vue`, do `public/favicon.svg` a do předlohy
ikon `scripts/make-icons.mjs`.

## Příprava otázek

Balíček je jedna herní deska: kategorie tvoří sloupce, bodové hodnoty řádky.
V editoru se dá obojí přidávat, přejmenovat i přeskládat.

Otázku otevřeš kliknutím na políčko. Ukládá se sama, tlačítko Uložit tu není.
Šipkami v hlavičce se posuneš na sousední otázku, *Další nevyplněná* skočí
na tu, která ještě chybí, `Ctrl+Enter` udělá totéž z klávesnice.

Do hry jde jen kategorie, která má vyplněné všechny otázky i odpovědi.
Nedodělané kategorie se v přípravě hry samy nenabídnou.

## Skripty

| příkaz | co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run dev:local` | totéž, ale data zůstanou jen v prohlížeči, sdílená databáze se nedotkne |
| `npm run build` | kontrola typů a produkční sestavení |
| `npm run preview` | náhled produkčního sestavení |
| `npm run typecheck` | jen kontrola typů |
| `npm run icons` | vygeneruje ikony aplikace z předlohy |

## Struktura

```
src/
  games/pojistuj/   hra Pojišťuj!: komponenty a ukázkový balíček
  games/registry.ts seznam her na rozcestníku
  components/admin/ správa balíčků a otázek
  components/ui/    sdílené prvky rozhraní
  stores/           stav: balíčky, hra, nastavení, oznámení
  lib/              úložiště, Firebase, animace, zvuk, konfety
  styles/tokens.css jediné místo pro barvy, mezery, písma a časování
```
