import { id } from '@/lib/id'
import type { QuizImage } from './types'

/**
 * Obrázek k otázce se zpracovává v prohlížeči, ne na serveru: žádný tu
 * není. Z fotky z mobilu, která má tři tisíce pixelů na šířku a osm
 * megabajtů, se udělá něco, co se vejde do dokumentu Firestore a přitom
 * na projektoru pořád vypadá dobře.
 *
 * Delší hrana 1600 px je strop schválně nad rozlišením projektoru:
 * plátno obrázek stejně zmenší a rezerva se hodí, až někdo bude promítat
 * na čtyřkový displej.
 */
const VARIANTS: ReadonlyArray<{ edge: number; quality: number }> = [
  { edge: 1600, quality: 0.82 },
  { edge: 1600, quality: 0.7 },
  { edge: 1280, quality: 0.7 },
  { edge: 1024, quality: 0.62 },
]

/**
 * Kolik znaků smí mít data URL.
 *
 * Dokument Firestore unese 1 MiB včetně názvů polí a base64 nafoukne
 * obsah o třetinu. Sedm set tisíc znaků je zhruba půl megabajtu
 * skutečných dat a nechává pohodlnou rezervu; fotka po zmenšení jich
 * mívá desetinu.
 */
export const IMAGE_MAX_CHARS = 700_000

/** Co umí prohlížeč otevřít. HEIC z iPhonu mezi tím schválně není. */
const READABLE = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']

/** Co nabídnout v dialogu pro výběr souboru. */
export const IMAGE_ACCEPT = READABLE.join(',')

/**
 * Připraví obrázek k uložení: zmenší, překóduje do WebP a zabalí do data
 * URL. Vyhazuje chybu s českou větou, kterou jde rovnou ukázat.
 */
export async function prepareQuizImage(file: File): Promise<QuizImage> {
  const bitmap = await readBitmap(file)
  try {
    for (const variant of VARIANTS) {
      const blob = await encode(bitmap, variant.edge, variant.quality)
      const data = await toDataUrl(blob)
      if (data.length <= IMAGE_MAX_CHARS) {
        const { w, h } = scaled(bitmap.width, bitmap.height, variant.edge)
        return {
          id: id('ki'),
          mime: blob.type,
          w,
          h,
          data,
          bytes: blob.size,
          createdAt: Date.now(),
        }
      }
    }
  } finally {
    bitmap.close()
  }
  throw new Error(
    'Obrázek je i po zmenšení moc velký. Zkus ho oříznout nebo použít prostší obrázek.',
  )
}

/** Kopie obrázku pod novým id. Balíčky si obrázky nesdílejí, viz `types.ts`. */
export function copyQuizImage(source: QuizImage): QuizImage {
  return { ...source, id: id('ki'), createdAt: Date.now() }
}

/** Velikost k zobrazení ve správě. */
export function imageSizeLabel(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1000))} kB`
}

/* --- Vnitřnosti ----------------------------------------------------------- */

async function readBitmap(file: File): Promise<ImageBitmap> {
  if (file.type === 'image/svg+xml') {
    throw new Error('SVG se nedá použít. Ulož obrázek jako PNG nebo JPEG.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Tohle není obrázek. Vyber PNG, JPEG nebo WebP.')
  }
  try {
    return await createImageBitmap(file)
  } catch {
    // Fotky z iPhonu chodí jako HEIC a ten prohlížeč neotevře. Je to
    // nejčastější způsob, jak tohle pole selže, takže si zaslouží větu,
    // ze které je vidět, co s tím.
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      throw new Error(
        'Fotky z iPhonu ve formátu HEIC prohlížeč neotevře. Ulož ji jako JPEG a zkus to znovu.',
      )
    }
    throw new Error('Obrázek se nepodařilo otevřít. Může být poškozený.')
  }
}

function scaled(w: number, h: number, edge: number): { w: number; h: number } {
  const ratio = Math.min(1, edge / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) }
}

async function encode(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob> {
  const size = scaled(bitmap.width, bitmap.height, edge)
  const canvas = document.createElement('canvas')
  canvas.width = size.w
  canvas.height = size.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Obrázek se nepodařilo zpracovat.')
  // Průhlednost by na tmavém plátně zmizela do pozadí a z loga vyrobila
  // tmavou skvrnu. Podklad je bílý, protože průhledné bývají hlavně
  // výřezy dokumentů a schémat.
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, size.w, size.h)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, size.w, size.h)

  const webp = await toBlob(canvas, 'image/webp', quality)
  // Prohlížeč, který WebP zakódovat neumí, vrátí PNG. To je u fotky
  // zbytečně velké, takže se pro něj sáhne po JPEGu.
  if (webp.type === 'image/webp') return webp
  return toBlob(canvas, 'image/jpeg', quality)
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Obrázek se nepodařilo zpracovat.'))),
      mime,
      quality,
    )
  })
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Obrázek se nepodařilo načíst.'))
    reader.readAsDataURL(blob)
  })
}
