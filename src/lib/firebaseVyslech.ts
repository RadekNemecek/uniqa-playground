import {
  Timestamp,
  collection,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import type {
  VyslechAnswers,
  VyslechForm,
  VyslechQuestion,
  VyslechReport,
  VyslechResponseRow,
  VyslechSession,
} from '@/vyslech/types'
import type { VyslechDb } from '@/lib/vyslechDb'
import { firebaseHandle } from '@/lib/firebase'
import { randomCode } from '@/games/kviz/code'

/** Jak dlouho sběr žije. Stejně jako kvíz: pokryje protažené školení
 *  a nedrží kód zabraný do dalšího týdne. */
const LIFETIME_MS = 8 * 60 * 60 * 1000

/** Kolik se čeká na potvrzení odeslaného dotazníku. */
const SUBMIT_TIMEOUT = 12000

const delay = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

function withTimeout<T>(op: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    op,
    delay(ms).then(() => {
      throw new Error(`${what} se nepotvrdilo včas.`)
    }),
  ]) as Promise<T>
}

function millis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null
}

function toSession(data: DocumentData): VyslechSession {
  return {
    schema: 1,
    code: String(data.code ?? ''),
    hostUid: String(data.hostUid ?? ''),
    title: String(data.title ?? ''),
    questions: (data.questions ?? []) as VyslechQuestion[],
    phase: data.phase === 'closed' ? 'closed' : 'open',
    createdAt: millis(data.createdAt) ?? 0,
    expiresAt: millis(data.expiresAt) ?? 0,
  }
}

function toRow(id: string, data: DocumentData): VyslechResponseRow {
  return { uid: id, answers: (data.answers ?? {}) as VyslechAnswers, at: millis(data.at) ?? 0 }
}

class FirestoreVyslechDb implements VyslechDb {
  readonly shared = true

  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
  ) {}

  myUid(): string {
    return this.uid
  }

  async resync(): Promise<void> {
    await disableNetwork(this.db)
    await enableNetwork(this.db)
  }

  /* --- Sady otázek ------------------------------------------------------- */

  watchForms(onChange: (forms: VyslechForm[]) => void, onDenied?: () => void): () => void {
    return onSnapshot(
      collection(this.db, 'vyslechForms'),
      (snap) => onChange(snap.docs.map((d) => d.data() as VyslechForm)),
      (err) => {
        // Sady čte jen odemčená správa. Listener po zamítnutí umře
        // a po odemčení se musí nasadit znovu.
        if (err.code === 'permission-denied') onDenied?.()
        else console.error('Čtení sad Výslechu selhalo:', err)
      },
    )
  }

  async saveForm(form: VyslechForm): Promise<void> {
    await withTimeout(setDoc(doc(this.db, 'vyslechForms', form.id), form), 12000, 'Uložení sady')
  }

  async deleteForm(formId: string): Promise<void> {
    await withTimeout(deleteDoc(doc(this.db, 'vyslechForms', formId)), 12000, 'Smazání sady')
  }

  /* --- Moderátorka ------------------------------------------------------- */

  async openSession(init: { title: string; questions: VyslechQuestion[] }): Promise<VyslechSession> {
    // Rozhoduje až zápis: pravidlo `create` platí jen na neexistující
    // dokument, takže souběh nad stejným kódem odmítne server.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode()
      const ref = doc(this.db, 'vyslech', code)
      const existing = await getDoc(ref)
      if (existing.exists() && (millis(existing.data().expiresAt) ?? 0) > Date.now()) continue

      const expiresAt = Timestamp.fromMillis(Date.now() + LIFETIME_MS)
      const payload = {
        schema: 1,
        code,
        hostUid: this.uid,
        title: init.title,
        questions: init.questions,
        phase: 'open' as const,
        createdAt: serverTimestamp(),
        expiresAt,
      }
      try {
        await withTimeout(setDoc(ref, payload), 12000, 'Založení sběru')
      } catch (e) {
        // Odmítnutí kvůli právům se opakováním nespraví.
        if ((e as { code?: string }).code === 'permission-denied') {
          throw new Error('Sběr se nepodařilo otevřít. Zkontroluj, že jsou ve Firebase publikovaná nová pravidla.')
        }
        continue
      }
      return { ...toSession(payload), createdAt: Date.now(), expiresAt: expiresAt.toMillis() }
    }
    throw new Error('Nepodařilo se zabrat kód. Zkus to znovu.')
  }

  async closeSession(code: string): Promise<void> {
    await withTimeout(updateDoc(doc(this.db, 'vyslech', code), { phase: 'closed' }), 12000, 'Ukončení sběru')
  }

  watchResponses(code: string, onChange: (rows: VyslechResponseRow[]) => void): () => void {
    return onSnapshot(
      collection(this.db, 'vyslech', code, 'responses'),
      (snap) => onChange(snap.docs.map((d) => toRow(d.id, d.data()))),
      (err) => console.error('Čtení odpovědí Výslechu selhalo:', err),
    )
  }

  async loadResponses(code: string): Promise<VyslechResponseRow[]> {
    const snap = await withTimeout(
      getDocsFromServer(collection(this.db, 'vyslech', code, 'responses')),
      15000,
      'Načtení odpovědí',
    )
    return snap.docs.map((d) => toRow(d.id, d.data()))
  }

  /** Podkolekce se mažou ručně, smazání rodiče je nechá viset. */
  async disposeSession(code: string): Promise<void> {
    const snap = await getDocs(collection(this.db, 'vyslech', code, 'responses'))
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(this.db)
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref)
      await batch.commit()
    }
    await deleteDoc(doc(this.db, 'vyslech', code))
  }

  /* --- Vyhodnocení ------------------------------------------------------- */

  async saveReport(report: VyslechReport): Promise<void> {
    await withTimeout(setDoc(doc(this.db, 'vyslechReports', report.id), report), 15000, 'Uložení vyhodnocení')
  }

  async listReports(): Promise<VyslechReport[]> {
    const snap = await getDocs(collection(this.db, 'vyslechReports'))
    return snap.docs
      .map((d) => d.data() as VyslechReport)
      .sort((a, b) => b.finishedAt - a.finishedAt)
  }

  async deleteReport(reportId: string): Promise<void> {
    await withTimeout(deleteDoc(doc(this.db, 'vyslechReports', reportId)), 12000, 'Smazání vyhodnocení')
  }

  /* --- Telefon ----------------------------------------------------------- */

  watchSession(
    code: string,
    onChange: (session: VyslechSession | null, fromCache: boolean) => void,
  ): () => void {
    return onSnapshot(
      doc(this.db, 'vyslech', code),
      { includeMetadataChanges: true },
      (snap) => onChange(snap.exists() ? toSession(snap.data()) : null, snap.metadata.fromCache),
      (err) => {
        console.error('Čtení sběru selhalo:', err)
        onChange(null, true)
      },
    )
  }

  async submit(code: string, answers: VyslechAnswers, expiresAt: number): Promise<void> {
    await withTimeout(
      setDoc(doc(this.db, 'vyslech', code, 'responses', this.uid), {
        answers,
        at: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(expiresAt),
      }),
      SUBMIT_TIMEOUT,
      'Odeslání',
    )
  }
}

export function createFirestoreVyslechDb(): VyslechDb | null {
  const handle = firebaseHandle()
  return handle ? new FirestoreVyslechDb(handle.db, handle.uid) : null
}
