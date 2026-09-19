# Řezy Lata

Vygenerované soubory. Needituj je ručně, přepíše je

```bash
node scripts/make-fonts.mjs
```

## Proč se generují

Lato z Google Fonts neumí česky. Není to věc subsetu: celý řez, který
Google rozdává, má 224 glyfů a chybí v nich Č, Ď, Ě, Ň, Ř, Ť a Ů včetně
malých. Aplikace přitom v `src/styles/fonts.css` deklarovala
`unicode-range`, který tvrdil, že je latin-ext pokrývá, takže si prohlížeč
soubor stáhl, glyf v něm nenašel a potichu sáhl po systémovém písmu.
Půlka háčků v aplikaci se tak sázela něčím jiným než Latem.

Zdrojem je proto původní Lato 2.015 od autora, balíček `lato-font`, které
má 3023 glyfů a češtinu obsahuje. Míchat ho s tím od Googlu nejde, jsou to
jiné kresby: „r" se mezi nimi liší o osm procent šířky, takže by „ř" vedle
„r" v jednom slově nesedělo.

## Co v nich je

Základní latinka, Latin-1 a celý blok Latin Extended-A, k tomu interpunkce,
měny a pár znaků navíc. Přesný rozsah drží `RANGES` v generátoru a **musí
se shodovat** s `unicode-range` v `src/styles/fonts.css`. Kdyby tam stálo
víc, opakovala by se přesně ta chyba, kvůli které tenhle postup vznikl.

Řezy se nedělí na latin a latin-ext. To dělení šetří stažení tam, kde se
rozšířené znaky nevyskytnou; česká aplikace má háček v každé druhé větě,
takže by se stahovaly vždycky oba a je z toho jen požadavek navíc.

Jeden řez váží zhruba 42 kB. Dřív to bylo 28 kB ve dvou souborech, ale bez
poloviny českých písmen.

## Licence

Lato je pod SIL Open Font License 1.1, copyright tyPoland Łukasz Dziedzic.
Text licence i copyright putují uvnitř každého souboru v tabulce `name`,
plné znění je na <https://openfontlicense.org>.
