# Playground

Interaktivní hry pro školení týmů. Běží jako statická webová aplikace,
hostovaná na GitHub Pages.

**Pojišťuj!** je deska kategorií a bodových hodnot. Jeden až šest týmů,
vlastní otázky, časomíra a pole **Riziko!**, kde tým před otázkou vsadí
část svých bodů. Vede se z notebooku na plátno, účastníci nemají v ruce nic.

**Na kolik to dáš?** je kvíz. Otázka, čtyři možnosti, jedna správná a časomíra.
Účastníci se připojí telefonem přes QR kód a odpovídají sami za sebe, body
dostávají podle rychlosti. Po odhalení se ukáže poučka a po poslední otázce
vyhodnocení, ze kterého je vidět, co tým neumí.

Každá hra má **vlastní balíčky otázek a vlastní správu**. Deska chce znění
a odpověď, kvíz čtyři možnosti; společná sada by znamenala, že každá otázka
nese pole, která druhá hra nepoužije.

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

## Jak se vede Pojišťuj!

1. **Otázky** připravíš předem v sekci *Otázky*. Deska v editoru vypadá
   stejně jako ta, kterou uvidí hráči: klikneš na políčko a napíšeš k němu
   otázku a odpověď. Tlačítko *Doplnit chybějící* tě provede zbytkem.
2. **Hrát** otevře přípravu: vybereš balíček, kategorie, týmy a pravidla.
3. Na desce klikneš na políčko, zobrazí se otázka. Správnou odpověď
   neznáš, odhalíš ji dalším kliknutím nebo mezerníkem.
4. Vyhodnotíš **Správně** nebo **Špatně**. Při správné odpovědi se políčko
   obarví barvou týmu a body přiskočí, při špatné se políčko označí
   jako **Nepojištěno**. Na poli **Riziko!** si tým nejdřív vsadí, kolik
   bodů riskuje.
5. Když odpověděl jiný tým, použij pruh *Body přiznat jinému týmu*.
   Objeví se jen tehdy, když je v pravidlech zapnuté **Přebrání jiným týmem**.

### Klávesnice

Zkratky platí nad otevřenou otázkou. Po desce se chodí tabulátorem, políčka
jsou obyčejná tlačítka.

| klávesa | co dělá |
|---|---|
| mezerník | odhalí odpověď, podruhé ji přizná týmu na tahu |
| N nebo 0 | neuhodl nikdo |
| 1 až 6 | přizná body danému týmu, pokud je zapnuté přebírání |
| Esc | zavře políčko bez bodování |
| ? | vypíše tenhle přehled přímo ve hře |

Tlačítko **Zpět** vrátí poslední bodování včetně stavu políčka. Rozehraná hra
přežije obnovení stránky i pád prohlížeče.

## Jak se vede Na kolik to dáš?

1. **Otázky** připravíš v sekci *Otázky* na adrese `/kviz/otazky`. Kvíz má
   vlastní balíčky, s deskou Pojišťuj! se nemíchají.
2. **Hrát** otevře přípravu: zaškrtneš balíčky, počet otázek a čas na
   odpověď. Pořadí otázek i možností se zamíchá.
3. Na plátně se objeví **kód a QR**. Účastníci se připojí telefonem, zadají
   přezdívku a jejich jména naskáčou do soupisky.
4. **Mezerník** vede celou hru: zamkne odpovídání, odhalí správnou možnost
   i poučku, ukáže průběžný žebříček a pustí další otázku. Na plátně je
   vždycky vidět, co udělá další stisk.
5. Po poslední otázce je vyhlášení a **vyhodnocení**: otázky seřazené od
   nejhůř zvládnuté a tabulka, kdo co škrtl. Dá se stáhnout jako CSV.

Každá otázka má tříveřinovou předehru. Na plátně se drží „Připrav se",
aby se telefony stihly dozvědět, že otázka běží, a odemkly tlačítka ve
stejný okamžik. Bez ní by hra odměňovala rychlejší wifi.

Po vypršení limitu už odpovědět nejde. Hlídají to tři vrstvy nezávisle na
sobě: telefon si zamkne tlačítka sám, moderátorský počítač přepne fázi
a server odmítne pozdní zápis, i kdyby moderátorce vypadla síť.

Bez sdílené databáze se telefony nemají kam připojit. Kvíz pak jde
promítat a body si počítáš sama, což je plnohodnotný způsob, jak ho vést,
a zároveň záchrana, když na školení umře wifi.

### Zkoušení kvízu na vlastním počítači

Nasazená aplikace má veřejnou adresu a QR kód prostě funguje. Při zkoušení
z notebooku ale `localhost` znamená „tenhle stroj", takže by se telefon po
načtení kódu pokusil spojit sám se sebou.

```bash
npm run dev:lan
```

Vite vypíše vedle místní adresy i **Network**, například
`http://192.168.2.136:5173/uniqa-playground/`. Otevři Playground na ní a QR
kód se opraví sám. Kdyby ses přesto ocitla na `localhost`, čekárna to
vypíše červeně, takže na to nepřijdeš až před plnou místností.

Síťová adresa je z pohledu prohlížeče jiné místo než `localhost`. Pro hraní
to ničemu nevadí, připravené balíčky jsou dostupné bez hesla. Pokud chceš
na síťové adrese otázky také upravovat, správu tam odemkni zvlášť.

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
bílé, akcent je modrý a jediná teplá barva patří poli **Riziko!**
Jeho hrana je červená UNIQA, tedy barva, kterou pojišťovna dává na chyby.
Rizikové pole je obarvené vlastní varovnou barvou značky.

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

### Pojišťuj!

Balíček je jedna herní deska: kategorie tvoří sloupce, bodové hodnoty řádky.
V editoru se dá obojí přidávat, přejmenovat i přeskládat.

Otázku otevřeš kliknutím na políčko. Ukládá se sama, tlačítko Uložit tu není.
Šipkami v hlavičce se posuneš na sousední otázku, *Další nevyplněná* skočí
na tu, která ještě chybí, `Ctrl+Enter` udělá totéž z klávesnice.

Do hry jde jen kategorie, která má vyplněné všechny otázky i odpovědi.
Nedodělané kategorie se v přípravě hry samy nenabídnou.

### Na kolik to dáš?

Balíček je seznam otázek, ne mřížka. U každé je znění, čtyři možnosti
s puntíkem u té správné a nepovinná poučka, která se ukáže po odhalení.
Otázky se dají přeskládat šipkami. Ukládá se samo.

Do kvízu jde jen otázka, která má znění i všechny čtyři možnosti.
Nedodělané se prostě nelosují.

Oba druhy balíčků se dají stáhnout jako JSON, poslat kolegyni a zase
naimportovat. Import je shovívavý: co chybí, dopíše prázdné, aby se dalo
dodělat ve správě, místo aby soubor odmítl celý.

## Skripty

| příkaz | co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run dev:lan` | totéž, ale dostupné i z telefonů na stejné wifi |
| `npm run dev:local` | totéž, ale data zůstanou jen v prohlížeči, sdílená databáze se nedotkne |
| `npm run build` | kontrola typů a produkční sestavení |
| `npm run preview` | náhled produkčního sestavení |
| `npm run typecheck` | jen kontrola typů |
| `npm run icons` | vygeneruje ikony aplikace z předlohy |

## Struktura

```
src/
  games/pojistuj/   deska: komponenty a ukázkový balíček
  games/kviz/       kvíz: komponenty, losování, bodování, vyhodnocení
  games/registry.ts seznam her na rozcestníku
  components/admin/ správa balíčků desky
  components/ui/    sdílené prvky rozhraní
  stores/           stav: balíčky, hra, živá session, nastavení, oznámení
  lib/              úložiště, Firebase, živá session, animace, zvuk, konfety
  styles/tokens.css jediné místo pro barvy, mezery, písma a časování
```

## Autor

Postavil [Radek Němeček](https://radeknemecek.cz/), weby, firemní aplikace
a AI automatizace.
