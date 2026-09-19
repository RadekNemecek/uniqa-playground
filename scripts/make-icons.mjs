/**
 * Vygeneruje favicon, ikony aplikace a náhledovou kartu z produktové značky.
 * Spouští se ručně: `node scripts/make-icons.mjs`
 *
 * Značka je dlaždice s „M", tatáž, jakou nese nápis v `HeroMark.vue`.
 * Nekreslí se odjinud a není to obrázek: geometrie i barvy se sem opíšou
 * z téhož zdroje jako do nápisu, takže se ikona v prohlížeči a nápis na
 * plátně nemůžou rozejít.
 *
 * Jiskry nad dlaždicí do ikony nepatří. V nápisu mají místo, v ikoně by
 * ubraly z dlaždice výšku a na šestnácti bodech, kde se favicona čte,
 * by z nich stejně zbyly tři šmouhy.
 */
import { mkdir, readFile } from 'node:fs/promises'
import opentype from 'opentype.js'
import sharp from 'sharp'

// Musí odpovídat tmavé vrstvě v src/styles/tokens.css.
const BASE = '#001A31' // --c-base
const LIT = '#7DBBF0' // --c-brand
const GLOW = '#002846' // --c-surface

// Dlaždice značky. Tytéž hodnoty jako gradient `mark-tile` v HeroMark.
const TILE_TOP = '#5AAAF5' // --c-light
const TILE_BOTTOM = '#4E9BDD' // --c-brand-deep
const TILE_EDGE = '#01182E' // --c-tile-edge
const TILE_SHEEN = 'rgba(255, 255, 255, 0.16)' // --c-tile-sheen
const LETTER = '#FFFFFF' // --c-value

/** Naklonění dlaždice ve stupních. Stejné jako v nápisu. */
const TILT = 7
/** Strana dlaždice a střed plátna, na kterém se kreslí. Konkrétní čísla
 *  jsou jedno, obrázek se pak stejně ořízne na obsah a zasadí do čtverce;
 *  musí se jen vejít i s náklonem a hranou. */
const TILE = 90
const CENTER = 60
const CANVAS = 120

/**
 * Písmeno „M" v Latu 900, tedy v písmu UNIQA a v tomtéž řezu jako nápis.
 *
 * Bere se z téhož zdroje, ze kterého si řezy vyrábí `make-fonts.mjs`,
 * takže „M" v ikoně a „M" na plátně jsou jedna a tatáž kresba.
 *
 * Kdyby se do SVG napsalo `font-family="Lato"`, vykreslila by ho knihovna
 * v sharpu systémovým písmem: Lato v systému není a záměna by proběhla
 * tiše, takže by ikona vypadala správně jen na počítači, kde Lato
 * nainstalované je.
 */
const FONTS = 'node_modules/lato-font/fonts'

/** Otevře řez Lata. */
async function loadFont(name) {
  const file = await readFile(`${FONTS}/${name}/${name}.woff`)
  return opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
}

/**
 * Vypíše cestu z příkazů.
 *
 * `Path.toPathData` z opentype.js 2.0.0 se použít nedá: při necelé
 * velikosti písma, což je přesně náš případ, vypouští do souřadnic `NaN`.
 * Příkazy samotné jsou v pořádku, takže se zapíší rovnou.
 */
function pathData(path, precision = 2) {
  const num = (value) => String(Number(value.toFixed(precision)))

  return path.commands
    .map((command) => {
      if (command.type === 'Z') return 'Z'
      const points =
        command.type === 'C'
          ? [command.x1, command.y1, command.x2, command.y2, command.x, command.y]
          : command.type === 'Q'
            ? [command.x1, command.y1, command.x, command.y]
            : [command.x, command.y]
      return command.type + points.map(num).join(' ')
    })
    .join('')
    .replace(/ -/g, '-')
}

/**
 * Křivka „M" vystředěná na střed dlaždice.
 *
 * Středí se na skutečný obrys, ne na účaří: v poli má sedět opticky,
 * a to `dominant-baseline` neumí.
 *
 * Verzálka zabírá větší díl dlaždice než v nápisu. Nápis se čte na
 * plátně a dlaždice v něm smí dýchat, kdežto favicona se čte na
 * šestnácti bodech a tam rozhoduje, jak silné je písmeno. S poměrem
 * z nápisu z něj v liště zbyl světlý proužek.
 */
function letterPath(font) {
  const cap = font.tables.os2.sCapHeight / font.unitsPerEm
  const size = (TILE * 0.55) / cap
  const box = font.getPath('M', 0, 0, size).getBoundingBox()

  return pathData(
    font.getPath('M', CENTER - (box.x1 + box.x2) / 2, CENTER - (box.y1 + box.y2) / 2, size),
  )
}

/** Vysází text na křivky. Účaří na `y`, začátek na `x`. */
function textPath(font, text, x, y, size, tracking = 0) {
  let cursor = x

  return [...text]
    .map((character) => {
      const glyph = font.charToGlyph(character)
      const d = pathData(glyph.getPath(cursor, y, size))
      cursor += (glyph.advanceWidth * size) / font.unitsPerEm + tracking
      return d
    })
    .join('')
}

/** Dlaždice s „M". Hrana zespodu a lesk nahoře jsou tytéž jako na
 *  dlaždicích herní desky, bez nich by to byl jen barevný čtvereček. */
function markSvg(letter) {
  const x = CENTER - TILE / 2
  const y = CENTER - TILE / 2
  const r = TILE * 0.2
  const drop = TILE * 0.05

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${TILE_TOP}"/>
      <stop offset="100%" stop-color="${TILE_BOTTOM}"/>
    </linearGradient>
  </defs>
  <g transform="rotate(${-TILT} ${CENTER} ${CENTER})">
    <rect x="${x}" y="${y + drop}" width="${TILE}" height="${TILE}" rx="${r}" fill="${TILE_EDGE}"/>
    <rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="${r}" fill="url(#tile)"/>
    <rect x="${x + TILE * 0.09}" y="${y + drop}" width="${TILE * 0.82}" height="${TILE * 0.035}" rx="${TILE * 0.02}" fill="${TILE_SHEEN}"/>
    <path d="${letter}" fill="${LETTER}"/>
  </g>
</svg>`
}

const black = await loadFont('lato-black')
const regular = await loadFont('lato-normal')
const source = Buffer.from(markSvg(letterPath(black)))

/** Značku nejdřív ořízne na obsah a potom ji bezpečně zasadí do čtverce. */
async function squareMark(size, padding, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const inner = size - padding * 2
  const mark = await sharp(source)
    .trim()
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
}

/**
 * Široká náhledová karta pro Teams, e-mail a další sdílení odkazu.
 *
 * Nadpis i podtitul se sázejí na křivky ze stejného Lata jako značka.
 * Zapsané `font-family="Lato"` by knihovna v sharpu vykreslila tím, co
 * najde v systému, a Lato tam typicky není.
 */
function cardSvg() {
  const width = 1200
  const height = 630

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BASE}"/>
  <defs>
    <radialGradient id="g1" cx="16%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${LIT}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${BASE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="92%" cy="104%" r="60%">
      <stop offset="0%" stop-color="${GLOW}"/>
      <stop offset="100%" stop-color="${BASE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g1)"/>
  <rect width="${width}" height="${height}" fill="url(#g2)"/>
  <path d="${textPath(black, 'Mučírna', 388, 297, 118, -3)}" fill="#F2F7FD"/>
  <path d="${textPath(regular, 'Školicí hry pro týmy', 392, 371, 40)}" fill="#A9C6E2"/>
</svg>`
}

await mkdir('public', { recursive: true })

const targets = [
  { file: 'public/favicon.png', size: 64, padding: 2, transparent: true },
  { file: 'public/icon-192.png', size: 192, padding: 16 },
  { file: 'public/icon-512.png', size: 512, padding: 40 },
  // Maskovatelná ikona potřebuje větší bezpečný okraj, systém ji ořízne.
  { file: 'public/icon-maskable-512.png', size: 512, padding: 104 },
  { file: 'public/apple-touch-icon.png', size: 180, padding: 14 },
]

for (const { file, size, padding, transparent } of targets) {
  const background = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : BASE
  await sharp(await squareMark(size, padding, background)).toFile(file)
  console.log('napsáno', file)
}

const shareMark = await squareMark(220, 0)
await sharp(Buffer.from(cardSvg()))
  .composite([{ input: shareMark, left: 96, top: 205 }])
  .png()
  .toFile('public/share-card.png')
console.log('napsáno public/share-card.png')
