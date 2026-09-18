import { computed, reactive } from 'vue'
import { sessionDb, type QuizSessionDb } from '@/lib/sessionDb'
import { randomAvatarId } from '@/games/kviz/avatars'
import type { QuizSession } from '@/games/kviz/types'

const STORAGE_KEY = 'playground.kviz.me.v1'

/**
 * Co telefon posílá, a jak to dopadlo.
 *
 * `sent` je jediný stav, který se dá brát jako jistotu, že odpověď došla.
 * Firestore ji lokálně přijme i bez sítě a server ji o pět minut později
 * odmítne, aniž by si toho kdokoli všiml, takže se čeká na potvrzení.
 */
export type SendState = 'idle' | 'sending' | 'sent' | 'failed'

interface PlayerState {
  code: string
  nick: string
  /** Zvíře hráče. Přiřadí se samo, hráč ho může před připojením vyměnit. */
  avatar: string
  uid: string
  session: QuizSession | null
  /** Session se nenašla. Jiný stav než „ještě nedorazila". */
  missing: boolean
  /**
   * Spojení se vůbec nenavázalo.
   *
   * Musí to být jiný stav než `missing`. Dřív obojí končilo hláškou
   * „Tahle hra neběží, zkontroluj kód", takže pomalý telefon obvinil
   * hráče z chyby, kterou neudělal, a moderátorka pak hledala problém
   * u sebe.
   */
  noConnection: boolean
  /**
   * Snímky chodí z mezipaměti, tedy telefon nevidí, co se na plátně děje.
   *
   * Bez tohohle stavu vypadá zamrzlý telefon úplně stejně jako živý:
   * poslední doručená fáze na něm zůstane viset a hráč nemá jak poznat,
   * že hra mezitím běží dál. Právě proto se druhý telefon musel
   * obnovovat ručně.
   */
  stale: boolean
  joining: boolean
  joinError: string
  /** Kterou možnost hráč zmáčkl. Drží se lokálně, do databáze se nekouká. */
  choice: number | null
  send: SendState
  /** Otázka, ke které se vztahuje `choice`. */
  answeredQid: string
  /** Kdy se odemkla tlačítka, podle monotónního času prohlížeče. */
  unlockedAt: number | null
  /** Lokální pojistka konce limitu, nezávislá na doručení další fáze. */
  expired: boolean
  /** Body z minulého snímku, aby šel ukázat přírůstek. */
  lastScore: number
  /** Je hráč na soupisce? Null, dokud to nevíme. */
  onRoster: boolean | null
}

const state = reactive<PlayerState>({
  code: '',
  nick: '',
  avatar: randomAvatarId(),
  uid: '',
  session: null,
  missing: false,
  noConnection: false,
  stale: false,
  joining: false,
  joinError: '',
  choice: null,
  send: 'idle',
  answeredQid: '',
  unlockedAt: null,
  expired: false,
  lastScore: 0,
  onRoster: null,
})

let conn: QuizSessionDb | null = null
let stop: Array<() => void> = []
let unlockTimer = 0
let expiryTimer = 0

/**
 * Za jak dlouho se snímek z mezipaměti bere jako výpadek.
 *
 * Krátká chvíle z mezipaměti je normální, tak vypadá každé připojení
 * listeneru. Čtyři vteřiny jsou nad tím rozptylem a pod dobou, za kterou
 * by hráč přišel o otázku.
 */
const STALE_MS = 4000

/** Rozestup dalších pokusů, dokud se spojení nevrátí. */
const RETRY_MS = 10000

let staleTimer = 0
let reviving = false
let attempts = 0
let wired = false

export const player = state

/* --- Identita ------------------------------------------------------------- */

interface Saved {
  code: string
  nick: string
  avatar?: string
  /**
   * Poslední potvrzená odpověď.
   *
   * Bez ní se po obnovení stránky uprostřed otázky odemkla tlačítka,
   * druhý zápis odmítla pravidla, „Zkusit odeslat znovu" nemohlo nikdy
   * uspět a při odhalení telefon tvrdil „Neodpověděl jsi", přestože body
   * dorazily.
   */
  answer?: { round: number; qid: string; choice: number }
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

function writeSaved(patch: Partial<Saved>): void {
  try {
    const saved = readSaved()
    const next: Saved = { code: state.code, nick: state.nick, ...saved, ...patch }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* Soukromé okno. Bez paměti se hraje dál, jen refresh zapomene. */
  }
}

/** Odpověď uložená z minulého načtení, pokud patří k téhle otázce. */
function rememberedAnswer(code: string, round: number, qid: string): number | null {
  const saved = readSaved()
  if (saved?.code !== code || !saved.answer) return null
  if (saved.answer.round !== round || saved.answer.qid !== qid) return null
  return saved.answer.choice
}

/** Po obnovení stránky se hráč vrátí rovnou do hry, bez ptaní na přezdívku. */
export function rememberedNick(code: string): string {
  const saved = readSaved()
  return saved?.code === code ? saved.nick : ''
}

/** Zvíře z minulého připojení. Prázdné, když hráč v téhle hře ještě nebyl. */
export function rememberedAvatar(code: string): string {
  const saved = readSaved()
  return saved?.code === code ? (saved.avatar ?? '') : ''
}

export function pickAvatar(id: string): void {
  state.avatar = id
}

/* --- Připojení ------------------------------------------------------------ */

export async function watchGame(code: string): Promise<void> {
  state.code = code
  state.nick = rememberedNick(code)
  state.avatar = rememberedAvatar(code) || state.avatar
  state.missing = false
  state.noConnection = false
  conn ??= await sessionDb()
  if (!conn) {
    state.noConnection = true
    return
  }
  state.uid = conn.myUid()
  detach()
  wireWake()
  stop = [
    conn.watchSession(code, (session, fromCache) => {
      onCacheState(fromCache)
      // Prázdný snímek z mezipaměti se zahazuje. „Hra neběží" smí říct jen
      // server: obvinit hráče z přepsaného kódu ve chvíli, kdy mu jen
      // vypadla wifi, je ta nejhorší možná rada. A hlavně by mu tím zmizela
      // obrazovka, na kterou se dívá, přestože hra běží dál.
      if (session === null && fromCache) return
      state.missing = session === null
      onSession(session)
    }),
    conn.watchMe(code, (me) => {
      state.onRoster = me !== null
      // Moderátorka může hráče přejmenovat, telefon to má vzít na vědomí.
      if (me) {
        state.nick = me.nick
        if (me.avatar) state.avatar = me.avatar
      }
    }),
  ]
}

function detach(): void {
  for (const off of stop) off()
  stop = []
}

export function leaveGame(): void {
  detach()
  unwireWake()
  window.clearTimeout(unlockTimer)
  window.clearTimeout(expiryTimer)
  window.clearTimeout(staleTimer)
  staleTimer = 0
  attempts = 0
  state.stale = false
  state.session = null
  state.choice = null
  state.send = 'idle'
  state.answeredQid = ''
  state.unlockedAt = null
  state.expired = false
  state.onRoster = null
}

export async function join(nick: string): Promise<boolean> {
  if (!conn) return false
  state.joining = true
  state.joinError = ''
  try {
    await conn.joinAsPlayer(state.code, nick.trim(), state.avatar)
    state.nick = nick.trim()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: state.code, nick: state.nick, avatar: state.avatar }),
    )
    return true
  } catch (e) {
    state.joinError = e instanceof Error ? e.message : 'Připojení se nepovedlo.'
    return false
  } finally {
    state.joining = false
  }
}

/* --- Živé spojení ----------------------------------------------------------
   Firestore umí přestat doručovat snímky, aniž by to komukoli řekl:
   prohlížeč uspí kartu, telefon se přepne z wifi na data, po cestě to
   zahodí proxy. Listener po chybě navíc umře a sám se nezotaví. Pro hráče
   to vypadá stejně jako klid ve hře, takže dokud tohle nebylo, zbývalo
   jediné: obnovit stránku ručně. -------------------------------------- */

/**
 * Přišel snímek ze serveru, nebo z mezipaměti? Jen to první je důkaz, že
 * telefon vidí, co se na plátně děje.
 */
function onCacheState(fromCache: boolean): void {
  if (!fromCache) {
    window.clearTimeout(staleTimer)
    staleTimer = 0
    attempts = 0
    state.stale = false
    return
  }
  // Pokus už běží, nebo je naplánovaný. Předbíhat se nemá cenu.
  if (staleTimer !== 0 || reviving) return
  scheduleRevive(state.stale ? RETRY_MS : STALE_MS)
}

function scheduleRevive(wait: number): void {
  window.clearTimeout(staleTimer)
  staleTimer = window.setTimeout(() => {
    staleTimer = 0
    state.stale = true
    void revive()
  }, wait)
}

/**
 * Zkusit spojení vzkřísit. Nejdřív jemně, pak natvrdo.
 *
 * Zavřít a otevřít síť stačí na mrtvý stream. Na mrtvý listener ne, ten
 * po chybě zůstane mrtvý až do konce stránky, a tak se od druhého pokusu
 * nasadí znovu i listenery.
 */
async function revive(): Promise<void> {
  if (!conn || !state.code || reviving || stop.length === 0) return
  // Odesílaná odpověď čeká na potvrzení serverem. Zahodit jí spojení pod
  // rukama by z poctivé odpovědi udělalo neodeslanou, tak se počká: buď
  // dojde potvrzení, nebo odesílání spadne na vlastní časový strop.
  if (state.send === 'sending') {
    if (state.stale) scheduleRevive(RETRY_MS)
    return
  }
  reviving = true
  attempts += 1
  try {
    await conn.resync()
    if (attempts >= 2) await watchGame(state.code)
  } catch (e) {
    console.error('Obnovení spojení selhalo:', e)
  } finally {
    reviving = false
    // Potvrzení přijde jako snímek ze serveru a tenhle timer zruší.
    // Dokud nepřijde, zkouší se dál.
    if (state.stale) scheduleRevive(RETRY_MS)
  }
}

/**
 * Telefon se probral. Uspaná karta má stream skoro vždycky mrtvý a čekat
 * na hlídače by stálo celou otázku, tak se spojení zkusí hned. Nic se
 * přitom nehlásí: když je všechno v pořádku, hráč o tomhle vědět nemusí.
 */
function onWake(): void {
  if (document.visibilityState === 'hidden' || stop.length === 0) return
  void revive()
}

function wireWake(): void {
  if (wired) return
  wired = true
  document.addEventListener('visibilitychange', onWake)
  window.addEventListener('online', onWake)
  // Návrat z mezipaměti prohlížeče (tlačítko zpět, přepnutí aplikace).
  // `visibilitychange` v tu chvíli nemusí přijít.
  window.addEventListener('pageshow', onWake)
}

function unwireWake(): void {
  if (!wired) return
  wired = false
  document.removeEventListener('visibilitychange', onWake)
  window.removeEventListener('online', onWake)
  window.removeEventListener('pageshow', onWake)
}

/* --- Průběh hry ------------------------------------------------------------ */

function onSession(session: QuizSession | null): void {
  const previous = state.session
  state.session = session
  if (!session) return

  // Nová otázka: zahodit minulou volbu a naplánovat odemčení tlačítek.
  const changed = session.qid !== previous?.qid || session.round !== previous?.round
  if (changed) {
    // Po obnovení stránky je `previous` null, takže tudy projde i návrat
    // do rozehrané otázky. Uloženou odpověď na tutéž otázku proto vrátíme
    // zpátky do stavu, jinak by telefon nabídl odpovídat podruhé.
    const saved = rememberedAnswer(state.code, session.round, session.qid)
    state.choice = saved
    state.send = saved === null ? 'idle' : 'sent'
    state.answeredQid = saved === null ? '' : session.qid
    state.unlockedAt = null
    state.expired = false
    state.lastScore = session.scores[state.uid] ?? 0
  }

  // Bez razítka od serveru se neodemyká. Dokud `askedAt` chybí, otázka
  // teprve vzniká a předehra nemá od čeho měřit: telefon by odemkl hned
  // a tlačítka by naskočila dřív, než se otázka objeví na plátně.
  // Razítko dorazí dalším snímkem a odemčení se naplánuje až podle něj.
  if (session.phase === 'question' && session.askedAt !== null && state.unlockedAt === null) {
    scheduleUnlock(session)
  }
}

/**
 * Kdy se smí začít mačkat.
 *
 * Na plátně se otázka objeví v čase `askedAt + preRollMs` podle hodin
 * serveru. Telefon míří na tentýž okamžik podle svých hodin, ne podle
 * chvíle, kdy mu dorazil snímek: jinak by odměňoval pomalou wifi. Rozdíl
 * hodin telefonu proti serveru je u dnešních přístrojů v řádu desetin
 * vteřiny a závorky níž ho drží v mezích, aby se ani při rozhozených
 * hodinách neodemklo dřív než teď a později než za celou předehru.
 */
function scheduleUnlock(session: QuizSession): void {
  window.clearTimeout(unlockTimer)
  window.clearTimeout(expiryTimer)
  const now = Date.now()
  const target = (session.askedAt ?? now) + session.preRollMs
  const wait = Math.min(Math.max(target - now, 0), session.preRollMs)
  unlockTimer = window.setTimeout(() => {
    // Když snímek dorazil až po začátku odpovídání, započte se i zpoždění.
    // Server tak nedostane uměle krátký čas a telefon nabídne jen skutečně
    // zbývající část limitu. Další měření už běží monotónně.
    const elapsedOnArrival = Math.min(Math.max(Date.now() - target, 0), session.limitMs)
    state.unlockedAt = performance.now() - elapsedOnArrival
    const remaining = session.limitMs - elapsedOnArrival
    if (remaining <= 0) {
      state.expired = true
      return
    }
    expiryTimer = window.setTimeout(() => {
      state.expired = true
    }, remaining)
  }, wait)
}

export const locked = computed(() => {
  const s = state.session
  if (!s || s.phase !== 'question') return true
  if (state.unlockedAt === null) return true
  if (state.choice !== null) return true
  // Reaktivní časovač zamkne tlačítka i bez zprávy od moderátorky. Samotné
  // `performance.now()` v computed by Vue znovu nepřepočítalo.
  return state.expired
})

export async function answer(choice: number): Promise<void> {
  const s = state.session
  if (!conn || !s || locked.value || state.unlockedAt === null) return

  const elapsed = Math.min(Math.round(performance.now() - state.unlockedAt), s.limitMs)
  state.choice = choice
  state.answeredQid = s.qid
  state.send = 'sending'
  try {
    await conn.sendAnswer(state.code, {
      round: s.round,
      qid: s.qid,
      choice,
      elapsedMs: elapsed,
      expiresAt: s.expiresAt,
    })
    state.send = 'sent'
    // Až po potvrzení serverem. Uložit ji dřív by znamenalo pamatovat si
    // odpověď, kterou server odmítl.
    writeSaved({ answer: { round: s.round, qid: s.qid, choice } })
  } catch (e) {
    console.error('Odeslání odpovědi selhalo:', e)
    state.send = 'failed'
  }
}

/** Zkusit odeslat znovu po neúspěchu. */
export async function retry(): Promise<void> {
  if (state.send !== 'failed' || state.choice === null) return
  const choice = state.choice
  state.choice = null
  await answer(choice)
}

/* --- Odvozené údaje -------------------------------------------------------- */

export const myScore = computed(() => state.session?.scores[state.uid] ?? 0)
export const myGain = computed(() => Math.max(0, myScore.value - state.lastScore))

/**
 * Pořadí. Při shodě bodů dostanou všichni to lepší místo, jako ve sportu.
 *
 * Čte ho **jen vyhlášení**. Během hry se pořadí neukazuje nikde, ani na
 * plátně, ani na telefonu: průběžné umístění svádí hráče porovnávat se
 * s ostatními místo s otázkou, a u poloviny místnosti je to zpráva, že
 * se nemá cenu snažit. Body stoupají každému, pořadí jen třem.
 */
export const myRank = computed(() => {
  const s = state.session
  if (!s) return 0
  const sorted = Object.values(s.scores).sort((a, b) => b - a)
  const at = sorted.indexOf(myScore.value)
  return at < 0 ? sorted.length + 1 : at + 1
})

export const playerCount = computed(() => Object.keys(state.session?.scores ?? {}).length)

/** Byla moje odpověď správná? Null, dokud se neodhalilo. */
export const wasRight = computed(() => {
  const s = state.session
  if (!s?.reveal || state.choice === null) return null
  return state.choice === s.reveal.correctIndex
})

/**
 * Je hráč ve hře? Rozhoduje soupiska, ne uložená přezdívka. Koho
 * moderátorka vyhodí, ten se vrátí na začátek místo toho, aby mačkal
 * tlačítka, jejichž odpovědi už server nepřijme.
 */
export const joined = computed(() => state.onRoster === true)

/** Ještě nevíme, jestli je hráč na soupisce. Bez toho by obrazovka
 *  na chvíli blikla formulářem i vracejícímu se hráči. */
export const checking = computed(() => state.onRoster === null)
