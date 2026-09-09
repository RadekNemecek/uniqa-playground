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
import type { PlaygroundDb } from '@/lib/db'
import { FIREBASE_CONFIG } from '@/lib/firebase.config'
import { hashSecret } from '@/lib/hash'

const KEY_LOCAL_HASH = 'playground.keyhash.v1'
const KEY_UNLOCK = 'playground.unlocked.v1'

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
 * 4. Zápis do balíčků smí jen ten, kdo `unlocks/{uid}` má.
 *
 * Po prvním úspěšném odemčení si otisk necháme i lokálně, aby se dalo
 * odemknout i bez sítě. Skutečné oprávnění stejně rozhodují pravidla.
 */
class FirestoreDb implements PlaygroundDb {
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
    })
    this.auth = getAuth(app)
    const credential = await signInAnonymously(this.auth)
    this.uid = credential.user.uid
    this.unlocked = sessionStorage.getItem(KEY_UNLOCK) === '1'
  }

  watchPacks(onChange: (packs: Pack[]) => void): () => void {
    return onSnapshot(
      collection(this.db, 'packs'),
      (snap) => onChange(snap.docs.map((d) => d.data() as Pack)),
      (err) => console.error('Čtení balíčků selhalo:', err),
    )
  }

  async savePack(pack: Pack): Promise<void> {
    await setDoc(doc(this.db, 'packs', pack.id), pack)
  }

  async deletePack(packId: string): Promise<void> {
    await deleteDoc(doc(this.db, 'packs', packId))
  }

  async hasPassword(): Promise<boolean> {
    if (localStorage.getItem(KEY_LOCAL_HASH)) return true
    try {
      const snap = await getDoc(doc(this.db, 'config', 'public'))
      return snap.exists() && snap.data()?.initialized === true
    } catch {
      return false
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
    await setDoc(doc(this.db, 'config', 'admin'), { keyHash })
    await setDoc(doc(this.db, 'config', 'public'), { initialized: true })
    await this.markUnlocked(keyHash)
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
      await setDoc(doc(this.db, 'unlocks', this.uid), { keyHash, at: Date.now() })
      await this.markUnlocked(keyHash)
      return true
    } catch {
      // Pravidlo zápis odmítlo, tedy heslo nesouhlasí.
      return false
    }
  }

  private async markUnlocked(keyHash: string): Promise<void> {
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

export async function createFirestoreDb(): Promise<PlaygroundDb> {
  const impl = new FirestoreDb()
  await impl.ready()
  return impl
}
