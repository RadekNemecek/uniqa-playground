import { shallowRef, watch } from 'vue'
import type {
  QuizAnswer,
  QuizKind,
  QuizPlayer,
  QuizReport,
  QuizReportSummary,
  QuizSession,
} from '@/games/kviz/types'

/**
 * Živá session kvízu.
 *
 * Záměrně to není součást `MucirnaDb`. To rozhraní popisuje balíčky
 * a zámek správy a `LocalDb` ho umí splnit celé. Živou session splnit
 * nemůže ani principiálně: telefon v cizím zařízení se k `localStorage`
 * moderátorčina notebooku nedostane. Kdyby tyhle metody byly v jednom
 * rozhraní, jedna implementace by je vždycky odmítala a aplikace by se
 * všude ptala, se kterou zrovna mluví.
 */
export interface QuizSessionDb {
  /** Anonymní identita zařízení. Přežívá obnovení stránky. */
  myUid(): string

  /**
   * Zahodí spojení a naváže nové.
   *
   * Firestore streamuje změny jedním dlouhým spojením. Když ho prohlížeč
   * uspí, přepne se síť nebo ho po cestě zahodí proxy, klient o tom
   * nemusí vědět: snímky prostě přestanou chodit a poslední fáze zůstane
   * na obrazovce, jako by se nic nedělo. Tohle je jediný spolehlivý
   * způsob, jak ho donutit začít znovu, bez obnovení stránky.
   */
  resync(): Promise<void>

  /* --- Moderátorka ------------------------------------------------------- */

  /** Zabere volný kód a založí session. Vrací obsazený kód. */
  createSession(init: SessionInit): Promise<QuizSession>
  updateSession(code: string, patch: SessionPatch): Promise<void>
  /** Sleduje soupisku. Vrací funkci pro odhlášení. */
  watchPlayers(code: string, onChange: (players: QuizPlayer[]) => void): () => void
  /** Sleduje došlé odpovědi celé session, tedy i minulá kola. */
  watchAnswers(code: string, onChange: (answers: QuizAnswer[]) => void): () => void
  kickPlayer(code: string, uid: string): Promise<void>
  renamePlayer(code: string, uid: string, nick: string): Promise<void>
  /** Smaže odpovědi, soupisku i session. Podkolekce nezmizí s rodičem. */
  disposeSession(code: string): Promise<void>

  /* --- Vyhodnocení ------------------------------------------------------- */

  /** Uloží vyhodnocení. Zapsané se už nemění. */
  saveReport(report: QuizReport): Promise<void>
  /** Seznam uložených vyhodnocení, bez matice. */
  listReports(): Promise<QuizReportSummary[]>
  loadReport(reportId: string): Promise<QuizReport | null>
  deleteReport(reportId: string): Promise<void>

  /* --- Telefon ----------------------------------------------------------- */

  /**
   * Sleduje běžící hru. Null znamená, že session neexistuje.
   *
   * `fromCache` říká, že snímek přišel z místní mezipaměti, ne ze serveru.
   * Pro moderátorku je to jediná spolehlivá zpráva o tom, že telefony
   * přestaly vidět, co se na plátně děje.
   */
  watchSession(
    code: string,
    onChange: (session: QuizSession | null, fromCache: boolean) => void,
  ): () => void
  joinAsPlayer(code: string, nick: string, avatar: string): Promise<void>
  /**
   * Sleduje vlastní kartu na soupisce. Cizí hráč se přečíst nedá, svoje
   * ano, a je to jediná spolehlivá odpověď na otázku, jestli je hráč ve
   * hře: koho moderátorka vyhodí, tomu karta zmizí a on se má vrátit
   * na začátek, ne mačkat tlačítka, která už nic nepošlou.
   */
  watchMe(code: string, onChange: (me: QuizPlayer | null) => void): () => void
  /**
   * Odešle odpověď a **počká na potvrzení serverem**. Naslepo se posílat
   * nesmí: Firestore ji lokálně v klidu přijme a server ji o pět minut
   * později odmítne, aniž by si toho kdokoli všiml.
   */
  sendAnswer(code: string, draft: AnswerDraft): Promise<void>
}

export interface SessionInit {
  code: string
  round: number
  total: number
  qid: string
  kind: QuizKind
  preRollMs: number
  limitMs: number
}

/** Co všechno smí moderátorka do běžící session zapsat. */
export interface SessionPatch {
  phase?: QuizSession['phase']
  index?: number
  qid?: string
  kind?: QuizKind
  total?: number
  round?: number
  acceptsPlayers?: boolean
  limitMs?: number
  preRollMs?: number
  /** Nastaví se na čas serveru, ne na čas moderátorčina počítače. */
  stampAskedAt?: boolean
  /** Null pole z dokumentu odstraní. */
  reveal?: QuizSession['reveal'] | null
  scores?: Record<string, number>
}

export interface AnswerDraft {
  round: number
  qid: string
  choice: number
  elapsedMs: number
  /** Platnost se přebírá ze session, ne dopočítává: pravidlo nesmí pustit
   *  dokument, který by přežil hru, ke které patří. */
  expiresAt: number
}

/** Reaktivní, aby obrazovka přípravy nemusela hlídat pořadí importů
 *  a sama se srovnala, jakmile se spojení objeví. */
const factory = shallowRef<(() => Promise<QuizSessionDb | null>) | null>(null)

/**
 * Spojení se teprve navazuje.
 *
 * Telefon se ptá hned, jak hráč otevře odkaz z QR kódu, tedy skoro
 * vždycky dřív, než se stihne vrátit anonymní přihlášení od Googlu.
 * Bez tohohle rozlišení odpověděl `sessionDb()` prázdnem a hráč dostal
 * „Nemám spojení" na síti, která byla v pořádku, s tlačítkem, které to
 * nemohlo spravit.
 */
const connecting = shallowRef(false)

/** Jak dlouho se dá čekat na spojení, které se navazuje. Pojistka proti
 *  síti, která spojení ani nenaváže, ani neodmítne. */
const WAIT_MS = 15000

/** Registruje se z `main.ts`, jakmile je Firestore k dispozici. */
export function setSessionDbFactory(next: () => Promise<QuizSessionDb | null>): void {
  factory.value = next
  connecting.value = false
}

/** Ohlásí z `main.ts`, že se spojení navazuje. */
export function markSessionDbConnecting(): void {
  if (!factory.value) connecting.value = true
}

/** Ohlásí z `main.ts`, že se spojení navázat nepovedlo. */
export function markSessionDbFailed(): void {
  connecting.value = false
}

/**
 * Vrací úložiště session, nebo null, když Firestore není k dispozici.
 * Kvíz pak jede v režimu bez telefonů, což není degradace, ale plnohodnotný
 * způsob, jak ho vést: promítaná hra s ručním bodováním.
 */
export async function sessionDb(): Promise<QuizSessionDb | null> {
  return factory.value ? factory.value() : null
}

/**
 * Totéž, ale počká, pokud se spojení zrovna navazuje.
 *
 * Pro telefon hráče je to rozdíl mezi „ještě to nedorazilo" a „tady to
 * nepojede". První se spraví samo za vteřinu, druhé si žádá načíst
 * stránku znovu, a hráč před plnou místností musí dostat tu radu, která
 * platí.
 */
export async function sessionDbWhenReady(): Promise<QuizSessionDb | null> {
  if (!factory.value && connecting.value) {
    await new Promise<void>((resolve) => {
      let stop: (() => void) | null = null
      let timer = 0
      const done = (): void => {
        stop?.()
        window.clearTimeout(timer)
        resolve()
      }
      // Pojistka na síť, která spojení ani nenaváže, ani neodmítne.
      timer = window.setTimeout(done, WAIT_MS)
      stop = watch([factory, connecting], () => {
        if (factory.value || !connecting.value) done()
      })
    })
  }
  return sessionDb()
}

export function hasSessionDb(): boolean {
  return factory.value !== null
}

/** Spojení se navazuje a ještě není rozhodnuto. */
export function isSessionDbConnecting(): boolean {
  return connecting.value
}
