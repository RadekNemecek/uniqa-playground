import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Pack } from '@/types'
import type { QuizPack } from '@/games/kviz/types'
import type { MucirnaDb } from '@/lib/db'
import { FIREBASE_CONFIG } from '@/lib/firebase.config'
import { hashSecret } from '@/lib/hash'
import { reportDbError } from '@/lib/db'

const KEY_LOCAL_HASH = 'playground.keyhash.v1'
const KEY_UNLOCK = 'playground.unlocked.v1'

const delay = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

/** Firestore umí čekat na server libovolně dlouho. Rozhraní ne. */
function withTimeout<T>(op: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    op,
    delay(ms).then(() => {
      throw new Error('Firestore neodpověděl včas.')
    }),
  ]) as Promise<T>
}

/**
 * Firestore jako úložiště balíčků.
 *
 * Ochrana správy je jednoduchá, ale vynucená na straně Google, ne jen
 * schovaná v rozhraní:
 *
 * 1. Klient se přihlásí anonymně, uživatelka o tom neví.
 * 2. Při odemčení pošle otisk hesla do `unlocks/{uid}`.
 * 3. Pravidlo ten zápis povolí jen tehdy, když se otisk shoduje s tím
 *    v `config/admin`, který nikdo přečíst nesmí.
 * 4. Zápis do balíčků smí jen ten, kdo `unlocks/{uid}` má. Čtení je
 *    veřejné, aby šla připravená hra spustit bez hesla do editoru.
 *
 * Po prvním úspěšném odemčení si otisk necháme i lokálně, aby se dalo
 * odemknout i bez sítě. Skutečné oprávnění stejně rozhodují pravidla.
 */
class FirestoreDb implements MucirnaDb {
  readonly kind = 'firestore' as const

  private db!: Firestore
  private auth!: Auth
  private uid = ''
  private unlocked = false
  private booted: Promise<void> | null = null

  /** Volá se z více míst, proto musí být idempotentní. */
  ready(): Promise<void> {
    this.booted ??= this.boot()
    return this.booted
  }

  private async boot(): Promise<void> {
    const app = initializeApp(FIREBASE_CONFIG)
    this.db = initializeFirestore(app, {
      // Offline vrstva: hra i seznam balíčků fungují bez sítě a po
      // obnovení připojení se změny samy dosynchronizují.
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Firemní proxy a captive portály na konferenční wifi umí streamování
      // rozbít tak, že se spojení tváří jako navázané a mlčí. Autodetekce
      // přepne na dlouhý polling, který proleze i tudy.
      experimentalAutoDetectLongPolling: true,
    })
    this.auth = getAuth(app)
    const credential = await signInAnonymously(this.auth)
    this.uid = credential.user.uid
    this.unlocked = sessionStorage.getItem(KEY_UNLOCK) === '1'
    handle = { db: this.db, uid: this.uid }
  }

  watchPacks(onChange: (packs: Pack[]) => void): () => void {
    return onSnapshot(
      collection(this.db, 'packs'),
      (snap) => onChange(snap.docs.map((d) => d.data() as Pack)),
      (err) => console.error('Čtení balíčků selhalo:', err),
    )
  }

  async savePack(pack: Pack): Promise<void> {
    await this.write(setDoc(doc(this.db, 'packs', pack.id), pack), 'Uložení balíčku')
  }

  async deletePack(packId: string): Promise<void> {
    await this.write(deleteDoc(doc(this.db, 'packs', packId)), 'Smazání balíčku')
  }

  /** Balíčky kvízu čte příprava hry veřejně. Zápisy dál hlídají pravidla. */
  watchQuizPacks(onChange: (packs: QuizPack[]) => void, onDenied?: () => void): () => void {
    return onSnapshot(
      collection(this.db, 'quizPacks'),
      (snap) => onChange(snap.docs.map((d) => d.data() as QuizPack)),
      (err) => {
        // Zamítnuté čtení znamená stará nebo chybně publikovaná pravidla.
        // Listener po zamítnutí umře a sám se nezotaví.
        if (err.code === 'permission-denied') onDenied?.()
        else console.error('Čtení balíčků kvízu selhalo:', err)
      },
    )
  }

  async saveQuizPack(pack: QuizPack): Promise<void> {
    await this.write(setDoc(doc(this.db, 'quizPacks', pack.id), pack), 'Uložení balíčku kvízu')
  }

  async deleteQuizPack(packId: string): Promise<void> {
    await this.write(deleteDoc(doc(this.db, 'quizPacks', packId)), 'Smazání balíčku kvízu')
  }

  /**
   * Zápis do Firestore se potvrzuje serverem, takže bez sítě by se promise
   * nedočkala. Data jsou přitom v lokální mezipaměti a odejdou po připojení.
   * Proto na potvrzení čekáme jen chvíli a případné odmítnutí hlásíme zvlášť.
   */
  private async write(op: Promise<void>, what: string): Promise<void> {
    op.catch((err) => {
      console.error(`${what} selhalo:`, err)
      reportDbError(`${what} se nepovedlo. Zkontroluj připojení a oprávnění.`)
    })
    await Promise.race([op.catch(() => undefined), delay(1500)])
  }

  async hasPassword(): Promise<boolean> {
    try {
      const snap = await withTimeout(getDoc(doc(this.db, 'config', 'public')))
      return snap.exists() && snap.data()?.initialized === true
    } catch {
      // Bez odpovědi se opřeme o otisk z dřívějšího odemčení na tomhle
      // zařízení. Rozhoduje jen o tom, co správa nabídne za obrazovku.
      return localStorage.getItem(KEY_LOCAL_HASH) !== null
    }
  }

  async setPassword(next: string, current?: string): Promise<void> {
    const alreadySet = await this.hasPassword()
    if (alreadySet) {
      if (current === undefined || !(await this.unlock(current))) {
        throw new Error('Stávající heslo nesouhlasí.')
      }
    }
    const keyHash = await hashSecret(next)

    // Na pořadí záleží, pravidla se dívají na stav databáze v ten okamžik:
    // 1. otisk hesla, ten smí vzniknout jen dokud neexistuje,
    // 2. doklad o odemčení, ten projde právě proto, že otisky sedí,
    // 3. veřejný příznak, ten už vyžaduje odemčenou relaci.
    try {
      await withTimeout(setDoc(doc(this.db, 'config', 'admin'), { keyHash }), 12000)
      await withTimeout(setDoc(doc(this.db, 'unlocks', this.uid), { keyHash, at: Date.now() }), 12000)
      await withTimeout(setDoc(doc(this.db, 'config', 'public'), { initialized: true }), 12000)
    } catch (e) {
      console.error('Nastavení hesla selhalo:', e)
      throw new Error(
        'Heslo se nepodařilo uložit. Zkontroluj připojení a publikovaná pravidla ve Firebase.',
      )
    }
    this.markUnlocked(keyHash)
  }

  async unlock(password: string): Promise<boolean> {
    const keyHash = await hashSecret(password)

    // Bez sítě se opřeme o otisk, který tu zůstal po dřívějším odemčení.
    const known = localStorage.getItem(KEY_LOCAL_HASH)
    if (!navigator.onLine && known) {
      if (known !== keyHash) return false
      this.setUnlockedFlag()
      return true
    }

    try {
      // Zápis se čeká na potvrzení serverem, protože právě to potvrzení
      // je ověřením hesla. Časový strop brání tomu, aby tlačítko viselo,
      // když je síť mrtvá, ale prohlížeč o tom ještě neví.
      await withTimeout(setDoc(doc(this.db, 'unlocks', this.uid), { keyHash, at: Date.now() }), 12000)
      this.markUnlocked(keyHash)
      return true
    } catch {
      // Pravidlo zápis odmítlo, tedy heslo nesouhlasí.
      return false
    }
  }

  private markUnlocked(keyHash: string): void {
    localStorage.setItem(KEY_LOCAL_HASH, keyHash)
    this.setUnlockedFlag()
  }

  private setUnlockedFlag(): void {
    this.unlocked = true
    sessionStorage.setItem(KEY_UNLOCK, '1')
  }

  isUnlocked(): boolean {
    return this.unlocked
  }

  lock(): void {
    this.unlocked = false
    sessionStorage.removeItem(KEY_UNLOCK)
  }
}

/** Živé spojení pro ostatní části aplikace, hlavně pro session kvízu.
 *  Null, dokud se Firestore nerozjede. */
export interface FirebaseHandle {
  db: Firestore
  uid: string
}

let handle: FirebaseHandle | null = null

export function firebaseHandle(): FirebaseHandle | null {
  return handle
}

export async function createFirestoreDb(): Promise<MucirnaDb> {
  const impl = new FirestoreDb()
  await impl.ready()
  return impl
}
