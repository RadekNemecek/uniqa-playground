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

export const player = state

/* --- Identita ------------------------------------------------------------- */

interface Saved {
  code: string
  nick: string
  avatar?: string
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
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
  conn ??= await sessionDb()
  if (!conn) {
    state.missing = true
    return
  }
  state.uid = conn.myUid()
  detach()
  stop = [
    conn.watchSession(code, (session) => {
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
  window.clearTimeout(unlockTimer)
  window.clearTimeout(expiryTimer)
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

/* --- Průběh hry ------------------------------------------------------------ */

function onSession(session: QuizSession | null): void {
  const previous = state.session
  state.session = session
  if (!session) return

  // Nová otázka: zahodit minulou volbu a naplánovat odemčení tlačítek.
  const changed = session.qid !== previous?.qid || session.round !== previous?.round
  if (changed) {
    state.choice = null
    state.send = 'idle'
    state.answeredQid = ''
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

/** Pořadí. Při shodě bodů dostanou všichni to lepší místo, jako ve sportu. */
export const myRank = computed(() => {
  const s = state.session
  if (!s) return 0
  const scores = Object.values(s.scores).sort((a, b) => b - a)
  const at = scores.indexOf(myScore.value)
  return at < 0 ? scores.length + 1 : at + 1
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
