import { computed, reactive, watch } from 'vue'
import { id } from '@/lib/id'
import { buildQuestions } from '@/games/kviz/questions'
import { buildReport } from '@/games/kviz/report'
import { pointsFor } from '@/games/kviz/scoring'
import { randomCode } from '@/games/kviz/code'
import { sessionDb, type QuizSessionDb, type SessionPatch } from '@/lib/sessionDb'
import type {
  QuizAnswer,
  QuizHostState,
  QuizPack,
  QuizPlayer,
  QuizQuestion,
  QuizReport,
  QuizSetup,
  QuizStanding,
} from '@/games/kviz/types'

const STORAGE_KEY = 'playground.kviz.host.v1'

/**
 * Předehra „připrav se".
 *
 * Telefon nemá znění otázky, takže hráč nezačíná číst ve chvíli, kdy mu
 * dorazí snímek, ale ve chvíli, kdy se otázka objeví na plátně. Kdyby
 * stopky běžely od doručení, hra by odměňovala pomalou wifi. Předehra
 * rozptyl doručení schová: plátno i telefony se rozsvítí naráz.
 *
 * Nástup patří jen před první otázku kola, tam místnost ztichne a ještě
 * se dojíždí připojování. Další otázky pouští moderátorka mezerníkem ve
 * chvíli, kdy je místnost připravená, a odpočet by jen zdržoval. Cenou je,
 * že se telefonům odemkne až s doručeným snímkem: pomalejší wifi tím
 * přijde o kus limitu. Body to nezkreslí, doba se počítá od serverového
 * razítka a zpoždění doručení se z ní odečte.
 */
const PRE_ROLL_MS = 5000

/** Kolik jmen nese průběžný žebříček. Bedna, ne celá listina: na plátně
 *  se delší seznam z posledního stolu nepřečte. */
const TOP_COUNT = 3

interface Wrapper {
  current: QuizHostState | null
  restored: boolean
}

/** Co přichází z listenerů. Neukládá se, po obnovení stránky se natáhne znovu. */
interface Live {
  players: QuizPlayer[]
  answers: QuizAnswer[]
  /** Snímky chodí z mezipaměti, tedy telefony nevidí, co se na plátně děje. */
  offline: boolean
  /** Vyhodnocení posledního dohraného kola. */
  report: QuizReport | null
  /** Podařilo se ho uložit do databáze? */
  reportSaved: boolean
}

const store = reactive<Wrapper>({ current: null, restored: false })
const live = reactive<Live>({
  players: [],
  answers: [],
  offline: false,
  report: null,
  reportSaved: false,
})

let conn: QuizSessionDb | null = null
let detach: Array<() => void> = []

/* --- Obnova po zavření nebo pádu prohlížeče ------------------------------ */

export function restoreQuizHost(): void {
  if (store.restored) return
  store.restored = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as QuizHostState
      // Hra rozehraná před avatary je pole nemá a bez něj by zápis
      // o kus dál spadl na nedefinovaném objektu.
      saved.avatars ??= {}
      store.current = saved
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Stav se ukládá po každé změně, aby hra přežila obnovení stránky
// i uprostřed otázky.
watch(
  () => store.current,
  (state) => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  },
  { deep: true },
)

/* --- Čtený stav ----------------------------------------------------------- */

export const quiz = computed(() => store.current)
export const hasQuiz = computed(() => store.current !== null)
export const players = computed(() => live.players)
export const offline = computed(() => live.offline)
export const report = computed(() => live.report)
export const reportSaved = computed(() => live.reportSaved)

export const currentQuestion = computed<QuizQuestion | null>(
  () => store.current?.questions[store.current.index] ?? null,
)

export const limitMs = computed(() => (store.current?.setup.limitSeconds ?? 0) * 1000)

/** Hraje se s telefony. Rozhoduje běžící session, ne přání z přípravy. */
export const withPhones = computed(() => store.current?.code !== null)

/** Kolik lidí na běžící otázku už odpovědělo. Rozložení moderátorka
 *  do zamčení nevidí, prozradila by se obličejem. */
export const answeredNow = computed(() => {
  const q = currentQuestion.value
  return q ? answersFor(q.qid).length : 0
})

function answersFor(qid: string): QuizAnswer[] {
  const s = store.current
  if (!s) return []
  return live.answers.filter((a) => a.round === s.round && a.qid === qid)
}

/** Kolik voleb padlo na kterou možnost u běžící otázky. Délka odpovídá
 *  otázce, tvrzení má dvě možnosti. Na plátno se pouští až po zamčení. */
export const choiceCounts = computed<number[]>(() => {
  const q = currentQuestion.value
  const out = Array.from({ length: q?.options.length ?? 0 }, () => 0)
  if (!q) return out
  for (const a of answersFor(q.qid)) {
    if (a.choice >= 0 && a.choice < out.length) out[a.choice]! += 1
  }
  return out
})

/** Kdo je na tom jak. Řadí se sestupně, při shodě podle přezdívky. */
export const standings = computed<QuizStanding[]>(() => {
  const s = store.current
  if (!s) return []
  return Object.entries(s.scores)
    .map(([uid, score]) => ({
      uid,
      nick: s.nicks[uid] ?? 'Hráč',
      avatar: s.avatars[uid] ?? '',
      score,
    }))
    .sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick, 'cs'))
})

/* --- Start a konec -------------------------------------------------------- */

function freshState(
  questions: QuizQuestion[],
  setup: QuizSetup,
  code: string | null,
  expiresAt: number,
): QuizHostState {
  return {
    id: id('k'),
    round: 1,
    setup,
    questions,
    usedQids: questions.map((q) => q.qid),
    index: 0,
    phase: code ? 'lobby' : 'question',
    askedAt: code ? null : Date.now(),
    code,
    expiresAt,
    scores: {},
    nicks: {},
    avatars: {},
    joinIndex: {},
    scoredQids: [],
    reportId: null,
    startedAt: Date.now(),
  }
}

export async function startQuiz(packs: QuizPack[], setup: QuizSetup): Promise<QuizHostState> {
  const questions = buildQuestions(packs, setup)
  let code: string | null = null
  let expiresAt = 0

  if (setup.withPhones) {
    conn = await sessionDb()
    if (conn) {
      const session = await conn.createSession({
        code: randomCode(),
        round: 1,
        total: questions.length,
        qid: questions[0]?.qid ?? '',
        kind: questions[0]?.kind ?? 'choice',
        preRollMs: PRE_ROLL_MS,
        limitMs: setup.limitSeconds * 1000,
      })
      code = session.code
      expiresAt = session.expiresAt
    }
  }

  store.current = freshState(questions, setup, code, expiresAt)
  if (code) attachSession()
  return store.current
}

/** Znovu naváže listenery po obnovení stránky. */
export async function attachSession(): Promise<void> {
  const s = store.current
  if (!s?.code) return
  conn ??= await sessionDb()
  if (!conn) return
  detachAll()

  const code = s.code
  detach = [
    conn.watchPlayers(code, (list) => {
      live.players = list
      // Přezdívka se zamrazí k uid, aby vyhodnocení přežilo i hráče,
      // kterého moderátorka mezitím vyhodila.
      const state = store.current
      if (!state) return
      for (const p of list) {
        state.nicks[p.uid] = p.nick
        state.avatars[p.uid] = p.avatar
        // Od které otázky kdo hraje. Kdo přišel později, se nesmí počítat
        // jako ten, kdo otázku před svým příchodem nezvládl.
        state.joinIndex[p.uid] ??= p.joinedAtIndex
      }
    }),
    conn.watchAnswers(code, (list) => {
      live.answers = list
    }),
    conn.watchSession(code, (_session, fromCache) => {
      live.offline = fromCache
    }),
  ]

  // Po obnovení stránky na vyhlášení musí jít vyhodnocení otevřít znovu.
  // Stav hry přežije v localStorage, vyhodnocení samo leží v databázi.
  if (s.phase === 'final' && s.reportId && !live.report) {
    try {
      live.report = await conn.loadReport(s.reportId)
      live.reportSaved = live.report !== null
    } catch (e) {
      console.error('Načtení vyhodnocení selhalo:', e)
    }
  }
}

function detachAll(): void {
  for (const off of detach) off()
  detach = []
}

export async function endQuiz(cleanUp = false): Promise<void> {
  const code = store.current?.code
  detachAll()
  live.players = []
  live.answers = []
  live.offline = false
  store.current = null
  if (cleanUp && code && conn) {
    try {
      await conn.disposeSession(code)
    } catch (e) {
      console.error('Úklid hry selhal:', e)
    }
  }
}

/** Odveta. Losuje nové otázky ze stejného výběru, opakovat začne, až když
 *  nové dojdou. Nikdo se nemusí znovu připojovat, jen se vynulují body. */
export async function rematchQuiz(packs: QuizPack[]): Promise<void> {
  const prev = store.current
  if (!prev) return
  const questions = buildQuestions(packs, prev.setup, prev.usedQids)
  store.current = {
    ...prev,
    round: prev.round + 1,
    questions,
    usedQids: [...prev.usedQids, ...questions.map((q) => q.qid)],
    index: 0,
    phase: prev.code ? 'lobby' : 'question',
    askedAt: prev.code ? null : Date.now(),
    scores: {},
    // Kdo je v odvetě na soupisce, hraje ji celou od začátku. Bez tohohle
    // by si nesl pořadí otázky, u které se kdysi připojil.
    joinIndex: Object.fromEntries(live.players.map((p) => [p.uid, 0])),
    scoredQids: [],
    reportId: null,
    startedAt: Date.now(),
  }
  const next = store.current
  live.report = null
  live.reportSaved = false
  await push({
    round: next.round,
    total: questions.length,
    index: 0,
    qid: questions[0]?.qid ?? '',
    kind: questions[0]?.kind ?? 'choice',
    phase: next.phase === 'lobby' ? 'lobby' : 'question',
    acceptsPlayers: true,
    reveal: null,
    scores: {},
    top: [],
    preRollMs: PRE_ROLL_MS,
    stampAskedAt: next.phase !== 'lobby',
  })
}

/* --- Zápis do session ------------------------------------------------------ */

async function push(patch: SessionPatch): Promise<void> {
  const code = store.current?.code
  if (!code || !conn) return
  try {
    await conn.updateSession(code, patch)
  } catch (e) {
    console.error('Zápis do hry selhal:', e)
  }
}

/* --- Posun hrou ----------------------------------------------------------- */

/**
 * Jeden krok vpřed, tedy to, co udělá mezerník. Fáze jdou po sobě vždy
 * stejně, takže moderátorka nemusí hledat myš ani se učit nové klávesy.
 */
export function advance(): void {
  const s = store.current
  if (!s) return
  switch (s.phase) {
    case 'lobby':
      void beginPlay()
      break
    case 'question':
      // Odpočet je nástup otázky, ne část odpovídání. Opakovaný stisk
      // mezerníku během něj nesmí otázku zamknout dřív, než ji lidé uvidí.
      // Běží jen u první otázky, dál se na nic nečeká.
      if (s.index === 0 && s.askedAt && Date.now() < s.askedAt + PRE_ROLL_MS) break
      void lockAnswers()
      break
    case 'locked':
      void revealAnswer()
      break
    case 'reveal':
      // Žebříček má smysl jen s telefony. Bez nich by neměl co ukázat.
      if (s.code) void showScores()
      else void nextQuestion()
      break
    case 'scores':
      void nextQuestion()
      break
    case 'final':
      break
  }
}

/** Z čekárny do hry. Od téhle chvíle se nově příchozí zapojí až další otázkou. */
export async function beginPlay(): Promise<void> {
  const s = store.current
  if (!s || s.phase !== 'lobby') return
  // Mezerník nesmí pustit prázdnou čekárnu. Tlačítko je sice vypnuté,
  // klávesová zkratka ale prochází přímo sem.
  if (s.code && live.players.length === 0) return
  s.phase = 'question'
  s.askedAt = Date.now()
  await push({
    phase: 'question',
    index: s.index,
    qid: s.questions[s.index]?.qid ?? '',
    kind: s.questions[s.index]?.kind ?? 'choice',
    stampAskedAt: true,
  })
}

/** Zamknout odpovídání. Volá to i časomíra, když limit doběhne. */
export async function lockAnswers(): Promise<void> {
  const s = store.current
  if (s?.phase !== 'question') return
  s.phase = 'locked'
  await push({ phase: 'locked' })
}

/**
 * Odhalit správnou možnost. Teprve tady se připisují body, protože až
 * po zamčení jsou všechny odpovědi na stole.
 */
export async function revealAnswer(): Promise<void> {
  const s = store.current
  if (!s || (s.phase !== 'locked' && s.phase !== 'question')) return
  const q = s.questions[s.index]
  if (!q) return

  const counts = choiceCounts.value
  const mine = answersFor(q.qid)

  // Každý na soupisce má mít skóre, i když neodpověděl. Jinak by mu na
  // telefonu vyšlo nulté místo z jednoho a ve vyhodnocení by chyběl.
  for (const p of live.players) s.scores[p.uid] ??= 0

  // Bodovat se smí jednou. Kdyby moderátorka odhalení zopakovala po
  // obnovení stránky, body by se jinak připsaly podruhé.
  if (!s.scoredQids.includes(q.qid)) {
    for (const a of mine) {
      const points = pointsFor(a.choice === q.correctIndex, a.elapsedMs, limitMs.value)
      s.scores[a.uid] = (s.scores[a.uid] ?? 0) + points
    }
    s.scoredQids.push(q.qid)
  }

  s.phase = 'reveal'
  await push({
    phase: 'reveal',
    reveal: { correctIndex: q.correctIndex, note: q.note, counts },
    scores: { ...s.scores },
    top: standings.value.slice(0, TOP_COUNT),
  })
}

export async function showScores(): Promise<void> {
  const s = store.current
  if (!s || s.phase !== 'reveal') return
  s.phase = 'scores'
  await push({ phase: 'scores' })
}

export async function nextQuestion(): Promise<void> {
  const s = store.current
  if (!s) return
  if (s.index >= s.questions.length - 1) {
    s.phase = 'final'
    s.askedAt = null
    await push({ phase: 'final', reveal: null })
    await finishRound()
    return
  }
  s.index += 1
  s.phase = 'question'
  s.askedAt = Date.now()
  await push({
    phase: 'question',
    index: s.index,
    qid: s.questions[s.index]?.qid ?? '',
    kind: s.questions[s.index]?.kind ?? 'choice',
    preRollMs: 0,
    reveal: null,
    stampAskedAt: true,
  })
}

/**
 * Sestaví vyhodnocení a uloží ho. Bez telefonů nemá co vyhodnocovat,
 * protože nikdo neodpovídal.
 */
async function finishRound(): Promise<void> {
  const s = store.current
  live.report = null
  live.reportSaved = false
  if (!s?.code || !conn || Object.keys(s.scores).length === 0) return

  const built = buildReport(s, live.answers, conn.myUid())
  live.report = built
  s.reportId = built.id
  try {
    await conn.saveReport(built)
    live.reportSaved = true
  } catch (e) {
    // Stáhnout do souboru jde pořád, takže o výsledky se nepřijde.
    console.error('Uložení vyhodnocení selhalo:', e)
  }
}

/* --- Soupiska -------------------------------------------------------------- */

export async function setAcceptsPlayers(open: boolean): Promise<void> {
  await push({ acceptsPlayers: open })
}

export async function kickPlayer(uid: string): Promise<void> {
  const code = store.current?.code
  if (!code || !conn) return
  await conn.kickPlayer(code, uid)
}

export async function renamePlayer(uid: string, nick: string): Promise<void> {
  const code = store.current?.code
  if (!code || !conn) return
  await conn.renamePlayer(code, uid, nick.slice(0, 20))
}

/**
 * Dohrát bez telefonů. Session se přestane zapisovat a kvíz dojede jako
 * promítaná hra. Body za dobu výpadku se dobodovat nedají a hráči to musí
 * vědět, proto to není automatické.
 */
export function dropPhones(): void {
  const s = store.current
  if (!s) return
  detachAll()
  s.code = null
  live.players = []
  live.answers = []
  live.offline = false
}

/** Předehra v milisekundách. Patří jen před první otázku kola a bez
 *  telefonů není co synchronizovat. */
export const preRollMs = computed(() =>
  store.current?.code && store.current.index === 0 ? PRE_ROLL_MS : 0,
)
