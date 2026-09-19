/**
 * Vyrobí řezy Lata, které umí česky.
 * Spouští se ručně: `node scripts/make-fonts.mjs`
 *
 * Lato z Google Fonts češtinu neumí. Není to věc subsetu: celý řez, který
 * Google rozdává, má 224 glyfů a chybí v nich Č, Ď, Ě, Ň, Ř, Ť a Ů včetně
 * malých. Aplikace přitom v `fonts.css` deklarovala `unicode-range`, který
 * tvrdil, že latin-ext češtinu pokrývá, takže si prohlížeč soubor stáhl,
 * nenašel v něm glyf a potichu sáhl po systémovém písmu. Půlka háčků v celé
 * aplikaci se tak sázela něčím jiným než Latem.
 *
 * Zdrojem je proto původní Lato 2.015 od autora (balíček `lato-font`),
 * které má 3023 glyfů a češtinu obsahuje. Míchat ho s tím od Googlu nejde,
 * jsou to jiné kresby: „r" se mezi nimi liší o osm procent šířky, takže by
 * „ř" vedle „r" v jednom slově nesedělo.
 *
 * Řezy se nedělí na latin a latin-ext. To dělení šetří stažení tam, kde se
 * rozšířené znaky nevyskytnou; česká aplikace má háček v každé druhé větě,
 * takže by se stahovaly vždycky oba a je z toho jen požadavek navíc.
 *
 * Licence putuje uvnitř souborů, v tabulce `name`. Původ a postup popisuje
 * `src/assets/fonts/README.md`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import subsetFont from 'subset-font'

const TARGET = 'src/assets/fonts'

/** Řezy, které aplikace používá: 400 text, 700 zvýraznění, 900 nadpisy. */
const WEIGHTS = [
  { weight: 400, source: 'lato-normal' },
  { weight: 700, source: 'lato-bold' },
  { weight: 900, source: 'lato-black' },
]

/**
 * Co se do subsetu vejde.
 *
 * Musí se shodovat s `unicode-range` v `src/styles/fonts.css`. Kdyby tam
 * stálo víc, než je tady, opakovala by se přesně ta chyba, kvůli které
 * tenhle skript vznikl: prohlížeč by soubor stáhl a glyf v něm nenašel.
 *
 * Dnešní rozsah je štědřejší než to, co vezlo Lato od Googlu (241 znaků),
 * protože celý blok Latin Extended-A vyjde skoro nastejno a pokryje
 * i ostatní středoevropské jazyky.
 */
const RANGES = [
  [0x0000, 0x017f], // základní latinka, Latin-1 a Latin Extended-A, tedy i čeština
  [0x0192, 0x0192], // ƒ
  [0x02c6, 0x02dd], // samostatné háčky, stříšky a kroužky
  [0x2000, 0x206f], // mezery, uvozovky, pomlčky, výpustka
  [0x20a0, 0x20bf], // měny včetně eura
  [0x2113, 0x2113], // ℓ
  [0x2122, 0x2122], // ™
  [0x2190, 0x2193], // šipky
  [0x2212, 0x2212], // minus
  [0x2215, 0x2215], // lomítko dělení
  [0xfeff, 0xfeff], // nulová mezera
  [0xfffd, 0xfffd], // náhradní znak
]

/** Rozsahy jako text, protože subsetter bere znaky, ne intervaly. */
const characters = RANGES.flatMap(([from, to]) => {
  const out = []
  for (let code = from; code <= to; code += 1) out.push(String.fromCodePoint(code))
  return out
}).join('')

await mkdir(TARGET, { recursive: true })

for (const { weight, source } of WEIGHTS) {
  const input = await readFile(`node_modules/lato-font/fonts/${source}/${source}.woff2`)
  const output = await subsetFont(input, characters, { targetFormat: 'woff2' })
  const file = `${TARGET}/lato-${weight}.woff2`
  await writeFile(file, output)
  console.log('napsáno', file, `(${(output.length / 1024).toFixed(1)} kB z ${(input.length / 1024).toFixed(1)} kB)`)
}

// Vypíše rozsah do `unicode-range`, ať se dá do fonts.css opsat beze změny.
const range = RANGES.map(([from, to]) => {
  // Druhá mez se v CSS píše bez `U+`, jinak je celé pravidlo neplatné.
  const hex = (code) => code.toString(16).toUpperCase().padStart(4, '0')
  return from === to ? `U+${hex(from)}` : `U+${hex(from)}-${hex(to)}`
}).join(',')
console.log('\nunicode-range pro fonts.css:\n' + range)
