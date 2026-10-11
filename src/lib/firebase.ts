import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  isSignInWithEmailLink,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updatePassword,
  type ActionCodeSettings,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  clearIndexedDbPersistence,
  collection,
  connectFirestoreEmulator,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import type { Pack } from '@/types'
import type { QuizImage, QuizPack } from '@/games/kviz/types'
import type { MucirnaDb } from '@/lib/db'
import { FIREBASE_CONFIG } from '@/lib/firebase.config'
import { reportDbError } from '@/lib/db'
import {
  account,
  currentSpaceId,
  recallMembership,
  rememberMembership,
  setAccount,
  type Role,
} from '@/stores/account'
import { degraded } from '@/stores/ui'

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
 * Je tohle telefon hráče?
 *
 * Rozhoduje adresa, na které se aplikace načetla, protože mezipaměť se
 * volí jednou při startu a pak se nemění.
 *
 * Telefon hráče nemá co ukládat na disk. Trvalá mezipaměť s volbou hlavní
 * karty tam naopak škodí: spojení k serveru drží jediná karta a ostatní
 * čtou, co jim přes IndexedDB podstrčí. Když prohlížeč tu hlavní na pozadí
 * uspí, a mobilní prohlížeče to dělají agresivně, ostatní zamrznou na
 * poslední uložené fázi a hráč kouká na minulou otázku, dokud stránku
 * ručně neobnoví. Přesně to se stalo na druhém telefonu.
 *
 * Přijít o offline režim tu nic nestojí: bez sítě se stejně odpovědět
 * nedá, odpověď se neposílá naslepo.
 */
function isPlayerDevice(): boolean {
  const base = import.meta.env.BASE_URL || '/'
  const path = window.location.pathname
  const rest = (path.startsWith(base) ? path.slice(base.length) : path).replace(/^\/+/, '')
  // `k` je kvíz, `v` dotazník Výslechu. Obojí otevírá telefon z QR kódu.
  return rest === 'k' || rest.startsWith('k/') || rest === 'v' || rest.startsWith('v/')
}

/** Přihlášený e-mailem, ne anonymní telefon. Malými písmeny, jak je
 *  zapsaný v členech i porovnávaný v pravidlech. */
function emailOf(user: User | null): string {
  return user && !user.isAnonymous && user.email ? user.email.toLowerCase() : ''
}

/**
 * Firestore jako úložiště otázek.
 *
 * Všechno, co tým připravil, leží pod `spaces/{prostor}` a čte a mění to
 * jen člen s ověřeným e-mailem. Hlídají to pravidla na straně Google,
 * aplikace jen neukazuje, kam člověk nesmí.
 */
class FirestoreDb implements MucirnaDb {
  readonly kind = 'firestore' as const

  private db!: Firestore
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
      // obnovení připojení se změny samy dosynchronizují. Na telefonu
      // hráče ale škodí, viz `isPlayerDevice()`.
      localCache: isPlayerDevice()
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Firemní proxy a captive portály na konferenční wifi umí streamování
      // rozbít tak, že se spojení tváří jako navázané a mlčí. Autodetekce
      // přepne na dlouhý polling, který proleze i tudy.
      experimentalAutoDetectLongPolling: true,
    })
    const auth = getAuth(app)
    auth.languageCode = 'cs'

    // `npm run dev:emu`: přihlášení i databáze běží v emulátorech na tomhle
    // počítači. Na zkoušení pozvánek a pravidel, bez sahání na ostrá data.
    if (import.meta.env.VITE_EMULATORS === '1') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(this.db, '127.0.0.1', 8080)
    }

    // Přihlášení si prohlížeč pamatuje, i bez sítě. Na něj se čeká, jinak
    // by se člen na okamžik tvářil jako odhlášený.
    await auth.authStateReady()
    let user = auth.currentUser

    // Telefon hráče potřebuje identitu hned, je to jeho karta ve hře.
    // Po obnovení stránky se vrátí tatáž anonymní identita.
    if (!user && isPlayerDevice()) user = (await signInAnonymously(auth)).user

    conn = { db: this.db, auth, uid: user?.uid ?? '' }
    await resolveAccount(user)
  }

  /* --- Cesty do prostoru ------------------------------------------------- */

  private col(name: string) {
    return collection(this.db, 'spaces', currentSpaceId(), name)
  }

  private ref(name: string, id: string) {
    return doc(this.db, 'spaces', currentSpaceId(), name, id)
  }

  /** Bez prostoru se nesleduje nic. Na obrazovky s otázkami se bez
   *  členství nedá dostat, tohle jen nedovolí sledování na prázdno. */
  private watch<T>(
    name: string,
    onChange: (items: T[]) => void,
    onError: (err: { code?: string }) => void,
  ): () => void {
    if (!account.spaceId) {
      onChange([])
      return () => undefined
    }
    return onSnapshot(
      this.col(name),
      (snap) => onChange(snap.docs.map((d) => d.data() as T)),
      onError,
    )
  }

  watchPacks(onChange: (packs: Pack[]) => void): () => void {
    return this.watch<Pack>('packs', onChange, (err) => console.error('Čtení balíčků selhalo:', err))
  }

  async savePack(pack: Pack): Promise<void> {
    await this.write(setDoc(this.ref('packs', pack.id), pack), 'Uložení balíčku')
  }

  async deletePack(packId: string): Promise<void> {
    await this.write(deleteDoc(this.ref('packs', packId)), 'Smazání balíčku')
  }

  watchQuizPacks(onChange: (packs: QuizPack[]) => void, onDenied?: () => void): () => void {
    return this.watch<QuizPack>('quizPacks', onChange, (err) => {
      // Zamítnuté čtení znamená odebrané členství nebo stará pravidla.
      // Listener po zamítnutí umře a sám se nezotaví.
      if (err.code === 'permission-denied') onDenied?.()
      else console.error('Čtení balíčků kvízu selhalo:', err)
    })
  }

  async saveQuizPack(pack: QuizPack): Promise<void> {
    await this.write(setDoc(this.ref('quizPacks', pack.id), pack), 'Uložení balíčku kvízu')
  }

  async deleteQuizPack(packId: string): Promise<void> {
    await this.write(deleteDoc(this.ref('quizPacks', packId)), 'Smazání balíčku kvízu')
  }

  /**
   * Obrázky k otázkám. Jeden dokument na obrázek.
   *
   * Zápis se tu na rozdíl od balíčku čeká celý. Balíček se ukládá sám
   * během psaní, takže tam krátká lhůta stačí, ale obrázek nahrává
   * autorka jednou a musí se dozvědět, jestli se to povedlo: uložit
   * odkaz na obrázek, který v databázi není, by otázku tiše rozbilo.
   */
  async saveQuizImage(image: QuizImage): Promise<void> {
    try {
      await withTimeout(setDoc(this.ref('quizImages', image.id), image), 20000)
    } catch (e) {
      console.error('Uložení obrázku selhalo:', e)
      throw new Error('Obrázek se nepodařilo uložit. Zkontroluj připojení a oprávnění.')
    }
  }

  async loadQuizImage(imageId: string): Promise<QuizImage | null> {
    const snap = await withTimeout(getDoc(this.ref('quizImages', imageId)), 20000)
    return snap.exists() ? (snap.data() as QuizImage) : null
  }

  async deleteQuizImage(imageId: string): Promise<void> {
    await this.write(deleteDoc(this.ref('quizImages', imageId)), 'Smazání obrázku')
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
}

/* ------------------------------------------------------------------------ */
/* Spojení pro ostatní části aplikace                                       */
/* ------------------------------------------------------------------------ */

interface Connection {
  db: Firestore
  auth: Auth
  uid: string
}

let conn: Connection | null = null

/** Živé spojení pro session kvízu a Výslechu. Null, dokud se Firestore
 *  nerozjede. */
export interface FirebaseHandle {
  db: Firestore
  uid: string
}

export function firebaseHandle(): FirebaseHandle | null {
  return conn ? { db: conn.db, uid: conn.uid } : null
}

/**
 * Identita pro hru, kdyby ji ještě neměl.
 *
 * Telefon ji dostane při startu podle adresy. Kdo se ale ke kódu dostal
 * z jiné stránky bez přihlášení, třeba přepsal adresu v otevřené kartě,
 * přihlásí se anonymně až teď, jinak by se nemohl připojit.
 */
export async function ensureFirebaseHandle(): Promise<FirebaseHandle | null> {
  if (!conn) return null
  if (!conn.auth.currentUser) {
    const credential = await signInAnonymously(conn.auth)
    conn.uid = credential.user.uid
  }
  return firebaseHandle()
}

export async function createFirestoreDb(): Promise<MucirnaDb> {
  const impl = new FirestoreDb()
  await impl.ready()
  return impl
}

/* ------------------------------------------------------------------------ */
/* Účet a členství                                                          */
/* ------------------------------------------------------------------------ */

/**
 * Stav účtu se zapisuje, jen dokud aplikace jede na Firestore. Když start
 * spadl do lokálního režimu a spojení dorazilo pozdě, rozhoduje lokální
 * režim: hra už běží nad daty z tohohle počítače a přihlašovací obrazovka
 * uprostřed by ji přerušila.
 */
function publish(next: Parameters<typeof setAccount>[0]): void {
  if (degraded.local) return
  setAccount(next)
}

async function resolveAccount(user: User | null): Promise<void> {
  const email = emailOf(user)
  if (!user || !email) {
    publish({ status: 'signedOut', email: '' })
    return
  }
  // Účet z pozvánky má adresu ověřenou kliknutím na odkaz. Neověřený
  // vznikl jinudy a pravidla by ho stejně nepustila.
  if (!user.emailVerified) {
    publish({ status: 'noAccess', email })
    return
  }

  // Známé členství z minula pustí dovnitř hned, i bez sítě. Ověření ze
  // serveru doběhne na pozadí a případně ho opraví.
  const known = recallMembership(email)
  if (known) {
    publish({ status: 'member', ...known })
    void lookUpMembership(email).catch((e) => console.error('Ověření členství selhalo:', e))
    return
  }

  try {
    await withTimeout(lookUpMembership(email), 8000)
  } catch (e) {
    console.error('Ověření členství selhalo:', e)
    publish({ status: 'unknown', email })
  }
}

/**
 * Kam patřím. Dotaz přes členy všech prostorů, pravidla pustí jen ten
 * s vlastním e-mailem. Teď je prostor jeden; až jich bude víc, vybere se
 * naposledy použitý.
 */
async function lookUpMembership(email: string): Promise<void> {
  if (!conn) return
  const snap = await getDocs(query(collectionGroup(conn.db, 'members'), where('email', '==', email)))
  const docs = snap.docs.filter((d) => d.ref.parent.parent !== null)
  if (docs.length === 0) {
    rememberMembership(null)
    publish({ status: 'noAccess', email })
    return
  }

  const preferred = recallMembership(email)?.spaceId
  const chosen = docs.find((d) => d.ref.parent.parent?.id === preferred) ?? docs[0]
  const spaceId = chosen.ref.parent.parent!.id
  const role: Role = chosen.data().role === 'admin' ? 'admin' : 'editor'
  let spaceName = ''
  try {
    const space = await getDoc(doc(conn.db, 'spaces', spaceId))
    spaceName = String(space.data()?.name ?? '')
  } catch {
    // Název je jen popisek, bez něj se dá pracovat.
  }

  const membership = { email, spaceId, spaceName, role }
  rememberMembership(membership)
  publish({ status: 'member', ...membership })

  // První příchod. Podle toho správa pozná, kdo pozvánku přijal.
  if (!chosen.data().joinedAt) {
    void updateDoc(chosen.ref, { joinedAt: serverTimestamp() }).catch((e) =>
      console.error('Zápis přijetí pozvánky selhal:', e),
    )
  }
}

/** Znovu ověřit členství, třeba když ho admin právě přidal. */
export async function refreshAccount(): Promise<void> {
  if (!conn) return
  const user = conn.auth.currentUser
  if (user && !user.isAnonymous) await user.reload()
  await resolveAccount(conn.auth.currentUser)
}

/* --- Pozvánka a heslo ---------------------------------------------------
 *
 * Účet vzniká jen z pozvánky. Admin zapíše kolegyni do týmu a pošle jí
 * přihlašovací odkaz. Kliknutím na něj potvrdí, že adresa je její, na
 * stránce `/pozvanka` si nastaví heslo a dál se přihlašuje heslem.
 * Registrace na přihlašovací stránce není: kdo pozvaný není, nemá kde začít.
 */

/** Kam vedou odkazy z mailů od Firebase. Bez povolené domény ve Firebase
 *  by se mail neodeslal vůbec, proto se při odmítnutí ozve srozumitelně. */
function linkTo(path: string, inApp: boolean): ActionCodeSettings {
  return { url: `${window.location.origin}${path}`, handleCodeInApp: inApp }
}

function requireAuth(): Auth {
  if (!conn) throw new Error('Spojení s Firebase se nenavázalo. Zkontroluj připojení a načti stránku znovu.')
  return conn.auth
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(requireAuth(), email.trim(), password)
}

/** Pošle pozvánku. Volá admin po zápisu do týmu, nebo znovu, když
 *  pozvánka propadla. Nikoho tím nepřihlašuje.
 *
 *  Adresa jde i do odkazu, aby ji stránka pozvánky měla předvyplněnou.
 *  Odkaz otevírá skoro vždycky jiný prohlížeč, než ze kterého admin
 *  zval, takže jinak by ji kolegyně musela psát znovu. */
export async function sendInvite(email: string): Promise<void> {
  const clean = email.trim().toLowerCase()
  await sendSignInLinkToEmail(requireAuth(), clean, linkTo(`/pozvanka?email=${encodeURIComponent(clean)}`, true))
}

export function isInviteLink(href: string): boolean {
  return conn ? isSignInWithEmailLink(conn.auth, href) : false
}

/**
 * Přijetí pozvánky: přihlásit odkazem a hned nastavit heslo.
 *
 * Když už je přihlášená stejná adresa (heslo napoprvé neprošlo a zkouší
 * to znovu), odkaz se nepoužije podruhé, nastaví se jen heslo.
 */
export async function acceptInvite(email: string, password: string, href: string): Promise<void> {
  const auth = requireAuth()
  const clean = email.trim().toLowerCase()
  let user = auth.currentUser
  if (!user || emailOf(user) !== clean) {
    user = (await signInWithEmailLink(auth, clean, href)).user
  }
  await updatePassword(user, password)
  rememberMembership(null)
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = requireAuth()
  try {
    await sendPasswordResetEmail(auth, email.trim(), linkTo('/prihlaseni', false))
  } catch (e) {
    // Neexistující účet Firebase schválně neprozradí, ať se adresy nedají
    // zkoušet. Kdyby ano, odpověď musí vypadat stejně jako úspěch.
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e
  }
}

/**
 * Odhlášení. Notebook bývá sdílený, takže se s účtem zahodí i mezipaměť
 * otázek a výsledků v prohlížeči. Po odhlášení se stránka načte znovu
 * a Firestore se rozjede načisto.
 */
export async function signOutHere(): Promise<void> {
  const auth = requireAuth()
  rememberMembership(null)
  await signOut(auth)
  if (conn) {
    try {
      await terminate(conn.db)
      await clearIndexedDbPersistence(conn.db)
    } catch (e) {
      // Druhá otevřená karta drží mezipaměť. Odhlášení platí i tak,
      // data v ní pravidla stejně nikomu dalšímu neukážou.
      console.error('Mezipaměť se nepodařilo smazat:', e)
    }
  }
}

/** Srozumitelná věta k chybě přihlášení. Kódy jsou z Firebase Auth. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'Tohle nevypadá jako e-mailová adresa.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail nebo heslo nesedí. Účet vzniká z pozvánky od správce, jinak se založit nedá.'
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'Pozvánka už neplatí. Požádej správce, ať ti pošle novou.'
    case 'auth/missing-email':
      return 'Vyplň e-mail.'
    case 'auth/unauthorized-continue-uri':
    case 'auth/unauthorized-domain':
      return 'Tahle adresa aplikace není ve Firebase povolená. Napiš správci.'
    case 'auth/quota-exceeded':
      return 'Firebase dnes už další maily nepošle. Zkus to zítra, nebo napiš správci.'
    case 'auth/requires-recent-login':
      return 'Pozvánka se nepoužila celá. Otevři odkaz z mailu znovu.'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Heslo je moc slabé. Musí mít aspoň osm znaků.'
    case 'auth/too-many-requests':
      return 'Příliš mnoho pokusů. Počkej pár minut a zkus to znovu.'
    case 'auth/network-request-failed':
      return 'Nepodařilo se spojit se serverem. Zkontroluj připojení.'
    case 'auth/operation-not-allowed':
      return 'Přihlašování e-mailem není ve Firebase zapnuté. Napiš správci.'
    case 'auth/user-disabled':
      return 'Tenhle účet je zablokovaný. Napiš správci.'
    default:
      return e instanceof Error && e.message && !code ? e.message : 'Něco se nepovedlo. Zkus to znovu.'
  }
}

/* ------------------------------------------------------------------------ */
/* Tým: členové prostoru                                                    */
/* ------------------------------------------------------------------------ */

export interface TeamMember {
  email: string
  role: Role
  name: string
  addedBy: string
  addedAt: number
  /** Poslední pozvánka. Při prvním zápisu je to `addedAt`. */
  invitedAt: number
  /** Kdy se poprvé přihlásila. 0 = pozvánku ještě nepřijala. */
  joinedAt: number
}

function millisOf(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0
}

function requireDb(): Firestore {
  if (!conn) throw new Error('Spojení s Firebase se nenavázalo.')
  return conn.db
}

function memberRef(email: string) {
  return doc(requireDb(), 'spaces', currentSpaceId(), 'members', email)
}

export function watchMembers(
  onChange: (members: TeamMember[]) => void,
  onError: (message: string) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), 'spaces', currentSpaceId(), 'members'),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data()
          const addedAt = millisOf(data.addedAt)
          return {
            email: d.id,
            role: data.role === 'admin' ? 'admin' : 'editor',
            name: String(data.name ?? ''),
            addedBy: String(data.addedBy ?? ''),
            addedAt,
            invitedAt: millisOf(data.invitedAt) || addedAt,
            joinedAt: millisOf(data.joinedAt),
          } satisfies TeamMember
        }),
      ),
    (err) => {
      console.error('Čtení členů selhalo:', err)
      onError('Seznam členů se nepodařilo načíst.')
    },
  )
}

/**
 * Pozvat do týmu: zapsat a poslat odkaz. Zápis jde první, jinak by
 * kolegyně mohla kliknout dřív, než má kam přijít.
 *
 * Zápisy členů se čekají na server celé: admin musí vědět, jestli
 * kolegyně opravdu dostala přístup.
 */
export async function inviteMember(email: string, name: string, role: Role): Promise<void> {
  const clean = email.trim().toLowerCase()
  await withTimeout(
    setDoc(memberRef(clean), {
      email: clean,
      role,
      ...(name.trim() ? { name: name.trim() } : {}),
      addedBy: account.email,
      addedAt: serverTimestamp(),
    }),
    12000,
  )
  await sendInvite(clean)
}

export async function resendInvite(email: string): Promise<void> {
  await sendInvite(email)
  await withTimeout(updateDoc(memberRef(email), { invitedAt: serverTimestamp() }), 12000)
}

export async function updateMember(email: string, patch: { role?: Role; name?: string }): Promise<void> {
  await withTimeout(updateDoc(memberRef(email), patch), 12000)
}

export async function removeMember(email: string): Promise<void> {
  await withTimeout(deleteDoc(memberRef(email)), 12000)
}
