/**
 * Vygeneruje favicon, ikony aplikace a náhledovou kartu z produktové značky.
 * Spouští se ručně: `node scripts/make-icons.mjs`
 */
import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

// Musí odpovídat tmavé vrstvě v src/styles/tokens.css.
const BASE = '#001A31' // --c-base
const LIT = '#7DBBF0' // --c-brand
const GLOW = '#002846' // --c-surface
const SOURCE = 'src/assets/mucirna-mark.png'

const source = await readFile(SOURCE)

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

/** Široká náhledová karta pro Teams, e-mail a další sdílení odkazu. */
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
  <text x="388" y="297" fill="#F2F7FD"
        font-family="Lato, Helvetica, Arial, sans-serif" font-weight="900" font-size="118"
        letter-spacing="-3">Mučírna</text>
  <text x="392" y="371" fill="#A9C6E2"
        font-family="Lato, Helvetica, Arial, sans-serif" font-weight="400" font-size="40">
    Školicí hry pro týmy
  </text>
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
