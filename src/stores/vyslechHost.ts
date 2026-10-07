import { computed, reactive, watch } from 'vue'
import { vyslechDb, type VyslechDb } from '@/lib/vyslechDb'
import { id } from '@/lib/id'
import { freezeQuestions } from '@/vyslech/questions'
import type {
  VyslechForm,
  VyslechHostState,
  VyslechReport,
  VyslechResponseRow,
  VyslechRunMeta,
} from '@/vyslech/types'

const STORAGE_KEY = 'playground.vyslech.host.v1'

const store = reactive<{ current: VyslechHostState | null; restored: boolean }>({
  current: null,
  restored: false,
})

/** Co chodí z listeneru. Neukládá se, po obnovení stránky se natáhne znovu. */
const live = reactive<{ rows: VyslechResponseRow[]; closing: boolean }>({ rows: [], closing: false })

let conn: VyslechDb | null = null
let detach: (() => void) | null = null

/* --- Obnova po obnovení stránky ----------------------------------------- */

export function restoreVyslechHost(): void {
  if (store.restored) return
  store.restored = true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) store.current = JSON.parse(raw) as VyslechHostState
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

watch(
  () => store.current,
  (state) => {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* Soukromé okno. Sběr běží dál, jen obnovení stránky ho zapomene. */
    }
  },
  { deep: true },
)

/* --- Čtený stav ---------------------------------------------------------- */

export const run = computed(() => store.current)
export const hasRun = computed(() => store.current !== null)
export const closing = computed(() => live.closing)

/** Odeslané dotazníky v pořadí, jak dorazily. Plátno z nich staví dlaždice. */
export const responses = computed(() => [...live.rows].sort((a, b) => a.at - b.at))

/** Po uzavření se počet bere z vyhodnocení: listener je už odpojený. */
export const responseCount = computed(() => {
  const s = store.current
  if (s?.phase === 'closed') return s.report?.responses.length ?? 0
  return live.rows.length
})

/* --- Průběh -------------------------------------------------------------- */

async function connection(): Promise<VyslechDb> {
  conn ??= await vyslechDb()
  if (!conn) throw new Error('Výslech teď nemá spojení se sdílenou databází.')
  return conn
}

/** Nasadí listener odpovědí. Po obnovení stránky se volá znovu. */
export async function attachRun(): Promise<void> {
  const s = store.current
  if (!s || s.phase !== 'open') return
  const c = await connection().catch(() => null)
  if (!c) return
  detach?.()
  detach = c.watchResponses(s.code, (rows) => {
    live.rows = rows
  })
}

export function detachRun(): void {
  detach?.()
  detach = null
}

export async function startRun(form: VyslechForm, meta: VyslechRunMeta): Promise<void> {
  const questions = freezeQuestions(form)
  if (questions.length === 0) throw new Error('V sadě není žádná hotová otázka.')
  const c = await connection()
  const session = await c.openSession({ title: meta.title, questions })
  live.rows = []
  store.current = {
    code: session.code,
    meta,
    formId: form.id,
    formName: form.name,
    questions,
    startedAt: Date.now(),
    phase: 'open',
    report: null,
    reportSaved: false,
  }
  await attachRun()
}

/** Náhodné pořadí, aby se z řádku nedalo odhadnout, kdo odevzdal kdy. */
function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Ukončí sběr.
 *
 * Pořadí je důležité. Nejdřív se sběr zavře, aby server odmítl, co by
 * ještě přišlo. Teprve pak se odpovědi načtou ze serveru, ne z listeneru:
 * dotazník odeslaný vteřinu před ukončením by v mezipaměti mohl chybět.
 * Session se uklidí až po uložení vyhodnocení, jinak by odpovědi zmizely
 * dřív, než jsou v bezpečí.
 */
export async function closeRun(): Promise<void> {
  const s = store.current
  if (!s || s.phase !== 'open' || live.closing) return
  live.closing = true
  try {
    const c = await connection()
    await c.closeSession(s.code)
    let rows = live.rows
    try {
      rows = await c.loadResponses(s.code)
    } catch (e) {
      // Bez čerstvého načtení vezmeme to, co ukázal listener. Lepší
      // vyhodnocení bez posledního dotazníku než žádné.
      console.error('Načtení odpovědí ze serveru selhalo:', e)
    }
    detachRun()
    const report: VyslechReport | null = rows.length
      ? {
          schema: 1,
          id: id('vr'),
          hostUid: c.myUid(),
          title: s.meta.title,
          group: s.meta.group,
          trainer: s.meta.trainer,
          formId: s.formId,
          formName: s.formName,
          questions: s.questions,
          responses: shuffle(rows.map((r) => r.answers)),
          startedAt: s.startedAt,
          finishedAt: Date.now(),
        }
      : null
    s.phase = 'closed'
    s.report = report
    s.reportSaved = false
    live.rows = rows
    if (report) await saveReport()
    // Bez vyhodnocení není co ztratit a session se uklidí hned.
    else await c.disposeSession(s.code).catch((e) => console.error('Úklid sběru selhal:', e))
  } finally {
    live.closing = false
  }
}

/** Uloží vyhodnocení a teprve pak uklidí session s odpověďmi. */
export async function saveReport(): Promise<boolean> {
  const s = store.current
  if (!s?.report) return false
  try {
    const c = await connection()
    await c.saveReport(s.report)
    s.reportSaved = true
    await c.disposeSession(s.code).catch((e) => console.error('Úklid sběru selhal:', e))
    return true
  } catch (e) {
    console.error('Uložení vyhodnocení selhalo:', e)
    return false
  }
}

/**
 * Zavře obrazovku sběru a vrátí se na přípravu. Běžící sběr se při tom
 * zruší bez vyhodnocení: tudy se odchází, když byl otevřený omylem.
 */
export async function discardRun(): Promise<void> {
  const s = store.current
  if (!s) return
  detachRun()
  if (s.phase === 'open' || !s.reportSaved) {
    const c = await connection().catch(() => null)
    await c?.disposeSession(s.code).catch((e) => console.error('Úklid sběru selhal:', e))
  }
  live.rows = []
  store.current = null
}
