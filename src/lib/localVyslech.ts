import type {
  VyslechAnswers,
  VyslechForm,
  VyslechQuestion,
  VyslechReport,
  VyslechResponseRow,
  VyslechSession,
} from '@/vyslech/types'
import type { VyslechDb } from '@/lib/vyslechDb'
import { randomCode } from '@/games/kviz/code'
import { id } from '@/lib/id'

const KEY_FORMS = 'playground.vyslech.forms.v1'
const KEY_REPORTS = 'playground.vyslech.reports.v1'
const KEY_SESSION = 'playground.vyslech.session.v1.'
const KEY_RESPONSES = 'playground.vyslech.responses.v1.'
const KEY_UID = 'playground.vyslech.uid.v1'

const LIFETIME_MS = 8 * 60 * 60 * 1000

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Výslech v tomhle prohlížeči.
 *
 * Na zkoušení bez sdílené databáze. Každá karta má vlastní identitu
 * (`sessionStorage`), takže se dá otevřít pět karet s dotazníkem a každá
 * odpoví za jiného člověka. Změny z jiných karet se sem dostanou přes
 * událost `storage`, ze stejné karty přímým oznámením.
 */
class LocalVyslechDb implements VyslechDb {
  readonly shared = false
  private readonly uid: string
  private listeners = new Map<string, Set<() => void>>()

  constructor() {
    let uid = sessionStorage.getItem(KEY_UID)
    if (!uid) {
      uid = id('u')
      sessionStorage.setItem(KEY_UID, uid)
    }
    this.uid = uid
    window.addEventListener('storage', (e) => {
      if (e.key) this.emit(e.key)
    })
  }

  private on(key: string, fn: () => void): () => void {
    let set = this.listeners.get(key)
    if (!set) {
      set = new Set()
      this.listeners.set(key, set)
    }
    set.add(fn)
    fn()
    return () => set.delete(fn)
  }

  private emit(key: string): void {
    for (const fn of this.listeners.get(key) ?? []) fn()
  }

  private put(key: string, value: unknown): void {
    write(key, value)
    this.emit(key)
  }

  myUid(): string {
    return this.uid
  }

  async resync(): Promise<void> {}

  watchForms(onChange: (forms: VyslechForm[]) => void): () => void {
    return this.on(KEY_FORMS, () => onChange(read<VyslechForm[]>(KEY_FORMS, [])))
  }

  async saveForm(form: VyslechForm): Promise<void> {
    const forms = read<VyslechForm[]>(KEY_FORMS, [])
    const at = forms.findIndex((f) => f.id === form.id)
    if (at >= 0) forms[at] = form
    else forms.push(form)
    this.put(KEY_FORMS, forms)
  }

  async deleteForm(formId: string): Promise<void> {
    this.put(KEY_FORMS, read<VyslechForm[]>(KEY_FORMS, []).filter((f) => f.id !== formId))
  }

  async openSession(init: { title: string; questions: VyslechQuestion[] }): Promise<VyslechSession> {
    const session: VyslechSession = {
      schema: 1,
      code: randomCode(),
      hostUid: this.uid,
      title: init.title,
      questions: init.questions,
      phase: 'open',
      createdAt: Date.now(),
      expiresAt: Date.now() + LIFETIME_MS,
    }
    this.put(KEY_SESSION + session.code, session)
    return session
  }

  async closeSession(code: string): Promise<void> {
    const session = read<VyslechSession | null>(KEY_SESSION + code, null)
    if (session) this.put(KEY_SESSION + code, { ...session, phase: 'closed' })
  }

  private rows(code: string): VyslechResponseRow[] {
    return Object.values(read<Record<string, VyslechResponseRow>>(KEY_RESPONSES + code, {}))
  }

  watchResponses(code: string, onChange: (rows: VyslechResponseRow[]) => void): () => void {
    return this.on(KEY_RESPONSES + code, () => onChange(this.rows(code)))
  }

  async loadResponses(code: string): Promise<VyslechResponseRow[]> {
    return this.rows(code)
  }

  async disposeSession(code: string): Promise<void> {
    localStorage.removeItem(KEY_RESPONSES + code)
    localStorage.removeItem(KEY_SESSION + code)
    this.emit(KEY_SESSION + code)
  }

  async saveReport(report: VyslechReport): Promise<void> {
    const reports = read<VyslechReport[]>(KEY_REPORTS, []).filter((r) => r.id !== report.id)
    try {
      write(KEY_REPORTS, [...reports, report])
    } catch {
      throw new Error('V prohlížeči došlo místo. Stáhni si tabulku.')
    }
  }

  async listReports(): Promise<VyslechReport[]> {
    return read<VyslechReport[]>(KEY_REPORTS, []).sort((a, b) => b.finishedAt - a.finishedAt)
  }

  async deleteReport(reportId: string): Promise<void> {
    write(KEY_REPORTS, read<VyslechReport[]>(KEY_REPORTS, []).filter((r) => r.id !== reportId))
  }

  watchSession(code: string, onChange: (session: VyslechSession | null, fromCache: boolean) => void): () => void {
    return this.on(KEY_SESSION + code, () => onChange(read<VyslechSession | null>(KEY_SESSION + code, null), false))
  }

  /** Stejná pravidla jako na serveru: jen do otevřeného sběru. */
  async submit(code: string, answers: VyslechAnswers): Promise<void> {
    const session = read<VyslechSession | null>(KEY_SESSION + code, null)
    if (!session || session.phase !== 'open') throw new Error('Sběr už skončil.')
    const all = read<Record<string, VyslechResponseRow>>(KEY_RESPONSES + code, {})
    all[this.uid] = { uid: this.uid, answers, at: Date.now() }
    this.put(KEY_RESPONSES + code, all)
  }
}

let instance: LocalVyslechDb | null = null

export function createLocalVyslechDb(): VyslechDb {
  instance ??= new LocalVyslechDb()
  return instance
}
