/**
 * Vygeneruje ikony aplikace z jedné SVG předlohy.
 * Spouští se ručně: `node scripts/make-icons.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const BASE = '#0B1026'
const GOLD = '#F5C451'
const TILE = '#27336B'

/** Značka Playgroundu: mřížka dlaždic, jedna z nich zlatá. */
function markSvg(size, padding) {
  const inner = size - padding * 2
  const gap = inner * 0.07
  const cell = (inner - gap) / 2
  const r = cell * 0.22
  const at = (i) => padding + i * (cell + gap)
  const tile = (x, y, fill) =>
    `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="${fill}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BASE}"/>
  <defs>
    <radialGradient id="glow" cx="30%" cy="22%" r="85%">
      <stop offset="0%" stop-color="#1D2650"/>
      <stop offset="100%" stop-color="${BASE}"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>
  ${tile(at(0), at(0), GOLD)}
  ${tile(at(1), at(0), TILE)}
  ${tile(at(0), at(1), TILE)}
  ${tile(at(1), at(1), TILE)}
</svg>`
}

await mkdir('public', { recursive: true })

const targets = [
  { file: 'public/icon-192.png', size: 192, pad: 30 },
  { file: 'public/icon-512.png', size: 512, pad: 80 },
  // Maskable potřebuje víc místa u okrajů, systém si ikonu ořízne.
  { file: 'public/icon-maskable-512.png', size: 512, pad: 128 },
  { file: 'public/apple-touch-icon.png', size: 180, pad: 26 },
]

for (const { file, size, pad } of targets) {
  await sharp(Buffer.from(markSvg(size, pad))).png().toFile(file)
  console.log('napsáno', file)
}

await writeFile('public/favicon.svg', markSvg(64, 8))
console.log('napsáno public/favicon.svg')
