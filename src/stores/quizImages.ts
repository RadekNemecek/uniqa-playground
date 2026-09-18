import { reactive } from 'vue'
import { db } from '@/lib/db'
import { copyQuizImage } from '@/games/kviz/image'
import type { QuizImage } from '@/games/kviz/types'

/**
 * Obrázky k otázkám kvízu.
 *
 * Na rozdíl od balíčků se nesledují listenerem: snímek celé kolekce by
 * do každého prohlížeče natáhl všechno, co kdo kdy nahrál, včetně
 * obrázků z balíčků, které se dnes nehrají. Stahuje se proto jen to, co
 * je zrovna na obrazovce, a jednou stažený obrázek zůstane v paměti.
 *
 * `null` v mezipaměti znamená „hledali jsme a není", ne „ještě nevíme".
 * Plátno podle toho pozná, že se obrázek nenačetl, a otázku ukáže bez
 * něj místo toho, aby čekalo.
 */
interface State {
  byId: Record<string, QuizImage | null>
}

const state = reactive<State>({ byId: {} })

/** Rozdělané stahování, aby tři komponenty nestáhly totéž třikrát. */
const pending = new Map<string, Promise<QuizImage | null>>()

/** Čtený stav. Zapisuje se výhradně přes funkce níže. */
export const quizImages = state

/** Co už je v paměti. Undefined znamená, že se ještě nestahovalo. */
export function cachedImage(imageId: string | undefined): QuizImage | null | undefined {
  return imageId ? state.byId[imageId] : null
}

export function loadImage(imageId: string): Promise<QuizImage | null> {
  const known = state.byId[imageId]
  if (known !== undefined) return Promise.resolve(known)

  const running = pending.get(imageId)
  if (running) return running

  const job = (async () => {
    try {
      await db().ready()
      const image = await db().loadQuizImage(imageId)
      state.byId[imageId] = image
      return image
    } catch (e) {
      console.error('Načtení obrázku selhalo:', e)
      // Neuloží se nic: příště to má smysl zkusit znovu, protože tohle
      // byl výpadek sítě, ne chybějící obrázek.
      return null
    } finally {
      pending.delete(imageId)
    }
  })()

  pending.set(imageId, job)
  return job
}

/**
 * Natáhne a dekóduje obrázky dopředu.
 *
 * Volá se při sestavení kvízu, tedy ještě v čekárně. Obrázek, který se
 * dekóduje až ve chvíli, kdy se otázka objeví na plátně, by místnost
 * viděla naskakovat a měření velikosti by proběhlo nad prázdným místem.
 */
export async function preloadImages(ids: ReadonlyArray<string | undefined>): Promise<void> {
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))]
  await Promise.all(
    wanted.map(async (imageId) => {
      const image = await loadImage(imageId)
      if (image) await decode(image.data)
    }),
  )
}

/** Uloží nahraný obrázek a rovnou ho dá k dispozici editoru. */
export async function putImage(image: QuizImage): Promise<void> {
  await db().ready()
  await db().saveQuizImage(image)
  state.byId[image.id] = image
}

/**
 * Smaže obrázek. Volá se při výměně, smazání otázky i smazání balíčku:
 * jinak by v databázi zůstaly dokumenty, na které se nikdo neodkazuje
 * a které nejsou nikde vidět.
 */
export async function removeImage(imageId: string): Promise<void> {
  try {
    await db().ready()
    await db().deleteQuizImage(imageId)
  } catch (e) {
    // Neuklizený obrázek je mrzutost, ne chyba, kvůli které by měla
    // selhat celá akce, kterou uživatelka právě dělá.
    console.error('Smazání obrázku selhalo:', e)
  }
  delete state.byId[imageId]
}

/** Kopie obrázku pod novým id, pro duplikaci balíčku a import. */
export async function duplicateImage(imageId: string): Promise<string | undefined> {
  const source = await loadImage(imageId)
  if (!source) return undefined
  const copy = copyQuizImage(source)
  await putImage(copy)
  return copy.id
}

function decode(data: string): Promise<void> {
  const img = new Image()
  img.src = data
  return img.decode().catch(() => undefined)
}
