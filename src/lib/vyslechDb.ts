import { shallowRef, watch } from 'vue'
import type {
  VyslechAnswers,
  VyslechForm,
  VyslechQuestion,
  VyslechReport,
  VyslechResponseRow,
  VyslechSession,
} from '@/vyslech/types'

/**
 * Úložiště Výslechu.
 *
 * Vlastní rozhraní, ne metody navíc v `MucirnaDb` ani v `QuizSessionDb`.
 * Sady otázek, běžící sběr i vyhodnocení patří k sobě a nikam jinam,
 * a celé je chrání heslo do správy, takže nemají co dělat vedle balíčků,
 * které čte kdokoli.
 *
 * Implementace jsou dvě. Firestore je ta skutečná. Lokální drží všechno
 * v tomhle prohlížeči a slouží ke zkoušení (`npm run dev:local`): sběr
 * se dá vyplnit z jiné karty téhož prohlížeče, telefon v sále se k němu
 * nedostane. Proto `shared`, aby to příprava řekla nahlas.
 */
export interface VyslechDb {
  /** Dostanou se ke sběru telefony v sále? */
  readonly shared: boolean
  myUid(): string
  /** Zahodí spojení a naváže nové. Viz `QuizSessionDb.resync()`. */
  resync(): Promise<void>

  /* --- Sady otázek ------------------------------------------------------- */

  /** `onDenied` se ozve, když čtení odmítne server, typicky před odemčením. */
  watchForms(onChange: (forms: VyslechForm[]) => void, onDenied?: () => void): () => void
  saveForm(form: VyslechForm): Promise<void>
  deleteForm(formId: string): Promise<void>

  /* --- Moderátorka ------------------------------------------------------- */

  /** Zabere volný kód a otevře sběr. Vrací založenou session. */
  openSession(init: { title: string; questions: VyslechQuestion[] }): Promise<VyslechSession>
  /** Přestane přijímat odpovědi. Telefony to uvidí hned. */
  closeSession(code: string): Promise<void>
  watchResponses(code: string, onChange: (rows: VyslechResponseRow[]) => void): () => void
  /** Odpovědi načtené ze serveru, ne z mezipaměti. Na ně se spoléhá
   *  vyhodnocení, takže nesmí chybět poslední dotazník. */
  loadResponses(code: string): Promise<VyslechResponseRow[]>
  /** Smaže odpovědi i session. Podkolekce nezmizí s rodičem. */
  disposeSession(code: string): Promise<void>

  /* --- Vyhodnocení ------------------------------------------------------- */

  saveReport(report: VyslechReport): Promise<void>
  listReports(): Promise<VyslechReport[]>
  deleteReport(reportId: string): Promise<void>

  /* --- Telefon ----------------------------------------------------------- */

  /** Null znamená, že sběr neexistuje. `fromCache` viz `QuizSessionDb`. */
  watchSession(code: string, onChange: (session: VyslechSession | null, fromCache: boolean) => void): () => void
  /**
   * Odešle dotazník a **počká na potvrzení serverem**. Firestore by ho
   * jinak lokálně přijal a server ho mohl odmítnout, aniž by si toho
   * kdokoli všiml. Druhé odeslání téhož telefonu přepíše první.
   */
  submit(code: string, answers: VyslechAnswers, expiresAt: number): Promise<void>
}

const factory = shallowRef<(() => Promise<VyslechDb | null>) | null>(null)
const connecting = shallowRef(false)

/** Stejný strop jako u kvízu: pojistka na síť, která spojení ani
 *  nenaváže, ani neodmítne. */
const WAIT_MS = 15000

export function setVyslechDbFactory(next: () => Promise<VyslechDb | null>): void {
  factory.value = next
  connecting.value = false
}

export function markVyslechDbConnecting(): void {
  if (!factory.value) connecting.value = true
}

export function markVyslechDbFailed(): void {
  connecting.value = false
}

export async function vyslechDb(): Promise<VyslechDb | null> {
  return factory.value ? factory.value() : null
}

/**
 * Počká, pokud se spojení zrovna navazuje. Telefon otevře odkaz z QR
 * kódu dřív, než se vrátí anonymní přihlášení, a „nemám spojení"
 * v tu chvíli není pravda.
 */
export async function vyslechDbWhenReady(): Promise<VyslechDb | null> {
  if (!factory.value && connecting.value) {
    await new Promise<void>((resolve) => {
      let stop: (() => void) | null = null
      let timer = 0
      const done = (): void => {
        stop?.()
        window.clearTimeout(timer)
        resolve()
      }
      timer = window.setTimeout(done, WAIT_MS)
      stop = watch([factory, connecting], () => {
        if (factory.value || !connecting.value) done()
      })
    })
  }
  return vyslechDb()
}

export function hasVyslechDb(): boolean {
  return factory.value !== null
}

export function isVyslechDbConnecting(): boolean {
  return connecting.value
}
