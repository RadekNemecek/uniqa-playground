import { shallowRef } from 'vue'
import type {
  QuizAnswer,
  QuizPlayer,
  QuizReport,
  QuizReportSummary,
  QuizSession,
} from '@/games/kviz/types'

/**
 * Živá session kvízu.
 *
 * Záměrně to není součást `PlaygroundDb`. To rozhraní popisuje balíčky
 * a zámek správy a `LocalDb` ho umí splnit celé. Živou session splnit
 * nemůže ani principiálně: telefon v cizím zařízení se k `localStorage`
 * moderátorčina notebooku nedostane. Kdyby tyhle metody byly v jednom
 * rozhraní, jedna implementace by je vždycky odmítala a aplikace by se
 * všude ptala, se kterou zrovna mluví.
 */
export interface QuizSessionDb {
  /** Anonymní identita zařízení. Přežívá obnovení stránky. */
  myUid(): string

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
  joinAsPlayer(code: string, nick: string): Promise<void>
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
  preRollMs: number
  limitMs: number
}

/** Co všechno smí moderátorka do běžící session zapsat. */
export interface SessionPatch {
  phase?: QuizSession['phase']
  index?: number
  qid?: string
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
  top?: QuizSession['top']
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

/** Registruje se z `main.ts`, jakmile je Firestore k dispozici. */
export function setSessionDbFactory(next: () => Promise<QuizSessionDb | null>): void {
  factory.value = next
}

/**
 * Vrací úložiště session, nebo null, když Firestore není k dispozici.
 * Kvíz pak jede v režimu bez telefonů, což není degradace, ale plnohodnotný
 * způsob, jak ho vést: promítaná hra s ručním bodováním.
 */
export async function sessionDb(): Promise<QuizSessionDb | null> {
  return factory.value ? factory.value() : null
}

export function hasSessionDb(): boolean {
  return factory.value !== null
}
