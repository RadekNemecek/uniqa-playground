import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import type {
  QuizAnswer,
  QuizPlayer,
  QuizReport,
  QuizReportSummary,
  QuizSession,
} from '@/games/kviz/types'
import type { AnswerDraft, QuizSessionDb, SessionInit, SessionPatch } from '@/lib/sessionDb'
import { firebaseHandle } from '@/lib/firebase'
import { randomCode } from '@/games/kviz/code'

/** Jak dlouho session žije, než ji uklidí TTL. Osm hodin pokryje i školení,
 *  které se protáhne, a zároveň nedrží kód zabraný do dalšího týdne. */
const LIFETIME_MS = 8 * 60 * 60 * 1000

/** Kolik se čeká na potvrzení odpovědi serverem. Na konferenční wifi je
 *  to dost i na pomalý telefon, a zároveň to nenechá hráče viset. */
const ANSWER_TIMEOUT = 12000

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

function toSession(data: DocumentData): QuizSession {
  return {
    schema: 1,
    code: String(data.code ?? ''),
    hostUid: String(data.hostUid ?? ''),
    createdAt: millis(data.createdAt) ?? 0,
    expiresAt: millis(data.expiresAt) ?? 0,
    acceptsPlayers: data.acceptsPlayers === true,
    round: Number(data.round ?? 1),
    total: Number(data.total ?? 0),
    index: Number(data.index ?? 0),
    qid: String(data.qid ?? ''),
    phase: data.phase ?? 'lobby',
    askedAt: millis(data.askedAt),
    preRollMs: Number(data.preRollMs ?? 0),
    limitMs: Number(data.limitMs ?? 0),
    ...(data.reveal ? { reveal: data.reveal } : {}),
    scores: (data.scores ?? {}) as Record<string, number>,
    top: (data.top ?? []) as QuizSession['top'],
  }
}

class FirestoreSessionDb implements QuizSessionDb {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
  ) {}

  myUid(): string {
    return this.uid
  }

  /* --- Moderátorka ------------------------------------------------------- */

  async createSession(init: SessionInit): Promise<QuizSession> {
    // Volný kód si napřed ověříme čtením, ale rozhoduje až zápis: pravidlo
    // pro `create` platí jen na neexistující dokument, takže souběh dvou
    // školitelek nad stejným kódem odmítne server, ne tenhle if.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = attempt === 0 && init.code ? init.code : randomCode()
      const ref = doc(this.db, 'quiz', code)
      const existing = await getDoc(ref)
      if (existing.exists() && (millis(existing.data().expiresAt) ?? 0) > Date.now()) continue

      const expiresAt = Timestamp.fromMillis(Date.now() + LIFETIME_MS)
      const payload = {
        schema: 1,
        code,
        hostUid: this.uid,
        createdAt: serverTimestamp(),
        expiresAt,
        acceptsPlayers: true,
        round: init.round,
        total: init.total,
        index: 0,
        qid: init.qid,
        phase: 'lobby' as const,
        askedAt: null,
        preRollMs: init.preRollMs,
        limitMs: init.limitMs,
        scores: {},
        top: [],
      }
      try {
        await withTimeout(setDoc(ref, payload), 12000, 'Založení hry')
      } catch {
        continue
      }
      return { ...toSession(payload), createdAt: Date.now(), expiresAt: expiresAt.toMillis() }
    }
    throw new Error('Nepodařilo se zabrat kód hry. Zkus to znovu.')
  }

  async updateSession(code: string, patch: SessionPatch): Promise<void> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'stampAskedAt' || value === undefined) continue
      // Null u odhalení znamená pole odstranit. Pravidlo zakazuje, aby
      // `reveal` v dokumentu bylo, dokud otázka běží.
      out[key] = key === 'reveal' && value === null ? deleteField() : value
    }
    if (patch.stampAskedAt) out.askedAt = serverTimestamp()
    if (Object.keys(out).length === 0) return
    await updateDoc(doc(this.db, 'quiz', code), out)
  }

  watchPlayers(code: string, onChange: (players: QuizPlayer[]) => void): () => void {
    return onSnapshot(
      collection(this.db, 'quiz', code, 'players'),
      (snap) =>
        onChange(
          snap.docs.map((d) => ({
            uid: d.id,
            nick: String(d.data().nick ?? ''),
            joinedAt: millis(d.data().joinedAt) ?? 0,
            joinedAtIndex: Number(d.data().joinedAtIndex ?? 0),
            expiresAt: millis(d.data().expiresAt) ?? 0,
          })),
        ),
      (err) => console.error('Čtení soupisky selhalo:', err),
    )
  }

  watchAnswers(code: string, onChange: (answers: QuizAnswer[]) => void): () => void {
    return onSnapshot(
      collection(this.db, 'quiz', code, 'answers'),
      (snap) =>
        onChange(
          snap.docs.map((d) => ({
            id: d.id,
            // Hráč je vlastní pole. Z id se vyčíst nedá, protože
            // identifikátor otázky sám obsahuje podtržítko.
            uid: String(d.data().uid ?? ''),
            round: Number(d.data().round ?? 0),
            qid: String(d.data().qid ?? ''),
            choice: Number(d.data().choice ?? -1),
            elapsedMs: Number(d.data().elapsedMs ?? 0),
            at: millis(d.data().at) ?? 0,
          })),
        ),
      (err) => console.error('Čtení odpovědí selhalo:', err),
    )
  }

  async kickPlayer(code: string, uid: string): Promise<void> {
    await deleteDoc(doc(this.db, 'quiz', code, 'players', uid))
  }

  async renamePlayer(code: string, uid: string, nick: string): Promise<void> {
    await updateDoc(doc(this.db, 'quiz', code, 'players', uid), { nick })
  }

  /**
   * Smazání rodičovského dokumentu ve Firestore **nemaže podkolekce**.
   * Osiřelé odpovědi a soupiska by se v konzoli ani neukázaly a tiše
   * zůstaly navždy, proto se mažou ručně, a teprve pak session sama.
   */
  async disposeSession(code: string): Promise<void> {
    for (const name of ['answers', 'players']) {
      const snap = await getDocs(collection(this.db, 'quiz', code, name))
      // Dávka Firestore unese pět set zápisů, proto se dělí po částech.
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(this.db)
        for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref)
        await batch.commit()
      }
    }
    await deleteDoc(doc(this.db, 'quiz', code))
  }

  /* --- Vyhodnocení ------------------------------------------------------- */

  async saveReport(report: QuizReport): Promise<void> {
    await withTimeout(
      setDoc(doc(this.db, 'quizReports', report.id), report),
      12000,
      'Uložení vyhodnocení',
    )
  }

  /**
   * Seznam bez matice. Ta je zdaleka největší část dokumentu a v přehledu
   * není k ničemu, takže se stahuje až při otevření.
   */
  async listReports(): Promise<QuizReportSummary[]> {
    const snap = await getDocs(collection(this.db, 'quizReports'))
    return snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          finishedAt: Number(data.finishedAt ?? 0),
          round: Number(data.round ?? 1),
          packNames: (data.packNames ?? []) as string[],
          questionCount: (data.questions ?? []).length,
          playerCount: (data.players ?? []).length,
        }
      })
      .sort((a, b) => b.finishedAt - a.finishedAt)
  }

  async loadReport(reportId: string): Promise<QuizReport | null> {
    const snap = await getDoc(doc(this.db, 'quizReports', reportId))
    return snap.exists() ? (snap.data() as QuizReport) : null
  }

  async deleteReport(reportId: string): Promise<void> {
    await deleteDoc(doc(this.db, 'quizReports', reportId))
  }

  /* --- Telefon ----------------------------------------------------------- */

  watchSession(
    code: string,
    onChange: (session: QuizSession | null, fromCache: boolean) => void,
  ): () => void {
    return onSnapshot(
      doc(this.db, 'quiz', code),
      { includeMetadataChanges: true },
      (snap) => onChange(snap.exists() ? toSession(snap.data()) : null, snap.metadata.fromCache),
      (err) => {
        console.error('Čtení hry selhalo:', err)
        onChange(null, true)
      },
    )
  }

  async joinAsPlayer(code: string, nick: string): Promise<void> {
    const session = await getDoc(doc(this.db, 'quiz', code))
    if (!session.exists()) throw new Error('Taková hra neběží. Zkontroluj kód.')
    const data = session.data()
    if (data.acceptsPlayers !== true) throw new Error('Hra už nepřijímá další hráče.')

    await withTimeout(
      setDoc(doc(this.db, 'quiz', code, 'players', this.uid), {
        nick: nick.slice(0, 20),
        joinedAt: serverTimestamp(),
        joinedAtIndex: Number(data.index ?? 0),
        expiresAt: data.expiresAt,
      }),
      12000,
      'Připojení',
    )
  }

  watchMe(code: string, onChange: (me: QuizPlayer | null) => void): () => void {
    return onSnapshot(
      doc(this.db, 'quiz', code, 'players', this.uid),
      (snap) =>
        onChange(
          snap.exists()
            ? {
                uid: this.uid,
                nick: String(snap.data().nick ?? ''),
                joinedAt: millis(snap.data().joinedAt) ?? 0,
                joinedAtIndex: Number(snap.data().joinedAtIndex ?? 0),
                expiresAt: millis(snap.data().expiresAt) ?? 0,
              }
            : null,
        ),
      (err) => console.error('Čtení vlastní karty selhalo:', err),
    )
  }

  /**
   * Odpověď se **nesmí odeslat naslepo**. Firestore ji lokálně přijme
   * a server ji později odmítne, aniž by si toho kdokoli
   * všiml, takže hráč musí na potvrzení počkat a při neúspěchu to vidět.
   */
  async sendAnswer(code: string, draft: AnswerDraft): Promise<void> {
    // Složené id dělá z druhé odpovědi na tutéž otázku přepis, a ten
    // pravidla nikomu kromě moderátorky nedovolí. Dvojitá odpověď je tím
    // vyloučená bez jediné podmínky navíc.
    const id = `${draft.round}_${draft.qid}_${this.uid}`
    await withTimeout(
      setDoc(doc(this.db, 'quiz', code, 'answers', id), {
        uid: this.uid,
        round: draft.round,
        qid: draft.qid,
        choice: draft.choice,
        elapsedMs: Math.max(0, Math.round(draft.elapsedMs)),
        at: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(draft.expiresAt),
      }),
      ANSWER_TIMEOUT,
      'Odeslání odpovědi',
    )
  }
}

export function createQuizSessionDb(): QuizSessionDb | null {
  const handle = firebaseHandle()
  return handle ? new FirestoreSessionDb(handle.db, handle.uid) : null
}
