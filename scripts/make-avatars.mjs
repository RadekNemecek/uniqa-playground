/**
 * Rozřeže zdrojový list avatarů, odstraní drobné pixely mimo postavy
 * a připraví stejně velké obrázky pro aplikaci.
 */
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const SOURCE = 'scripts/assets/quiz-avatars-source.png'
const OUTPUT = 'src/assets/avatars'
const COLUMNS = 4
const ROWS = 3
const SIZE = 256
const INNER = 224
const EDGE_ALPHA = 200

const names = [
  'liska',
  'medved',
  'sova',
  'kocka',
  'zajic',
  'mys',
  'zaba',
  'tucnak',
  'lev',
  'prase',
  'ryba',
  'slon',
]

/** Najde největší souvislou neprůhlednou plochu v jednom políčku. */
function largestComponent(data, width, height) {
  const solid = new Uint8Array(width * height)
  const seen = new Uint8Array(width * height)
  for (let i = 0; i < solid.length; i += 1) {
    solid[i] = data[i * 4 + 3] >= EDGE_ALPHA ? 1 : 0
  }

  let largest = []
  for (let start = 0; start < solid.length; start += 1) {
    if (!solid[start] || seen[start]) continue

    const queue = [start]
    const component = []
    seen[start] = 1

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const pixel = queue[cursor]
      component.push(pixel)
      const x = pixel % width
      const y = Math.floor(pixel / width)

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const next = ny * width + nx
          if (!solid[next] || seen[next]) continue
          seen[next] = 1
          queue.push(next)
        }
      }
    }

    if (component.length > largest.length) largest = component
  }

  return largest
}

/**
 * Vnější barevné smetí zahodí a hranu největší postavy znovu zjemní.
 * RGB uvnitř kresby se nemění.
 */
function cleanCell(data, width, height) {
  const component = largestComponent(data, width, height)
  if (component.length === 0) throw new Error('V políčku chybí avatar.')

  const keep = new Uint8Array(width * height)
  for (const pixel of component) keep[pixel] = 1

  const output = Buffer.from(data)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x
      const alpha = pixel * 4 + 3

      if (!keep[pixel]) {
        output[alpha] = 0
        continue
      }

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      let neighbors = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && keep[ny * width + nx]) {
            neighbors += 1
          }
        }
      }
      output[alpha] = Math.min(output[alpha], Math.round((neighbors / 9) * 255))
    }
  }

  return {
    data: output,
    box: {
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  }
}

const metadata = await sharp(SOURCE).metadata()
if (!metadata.width || !metadata.height) throw new Error('Zdrojový list nemá rozměry.')
if (metadata.width % COLUMNS !== 0 || metadata.height % ROWS !== 0) {
  throw new Error('Zdrojový list nejde přesně rozdělit na mřížku 4 × 3.')
}

const cellWidth = metadata.width / COLUMNS
const cellHeight = metadata.height / ROWS
await mkdir(OUTPUT, { recursive: true })

for (const [index, name] of names.entries()) {
  const column = index % COLUMNS
  const row = Math.floor(index / COLUMNS)
  const { data, info } = await sharp(SOURCE)
    .extract({
      left: column * cellWidth,
      top: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const cleaned = cleanCell(data, info.width, info.height)
  const margin = (SIZE - INNER) / 2
  const file = `${OUTPUT}/${name}.webp`

  await sharp(cleaned.data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(cleaned.box)
    .resize(INNER, INNER, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: margin,
      right: margin,
      bottom: margin,
      left: margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true })
    .toFile(file)

  console.log('napsáno', file)
}
