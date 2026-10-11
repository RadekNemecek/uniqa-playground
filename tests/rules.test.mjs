/**
 * Testy pravidel Firestore. Běží proti emulátoru, nikdy proti ostré
 * databázi: projekt `demo-…` emulátor pozná a ven se nepřipojí.
 *
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

const ADMIN = 'admin@uniqa.cz'
const EDITOR = 'editor@uniqa.cz'
const OUTSIDER = 'cizi@example.com'
const OTHER = 'jiny@example.com'

let env

const verified = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true }).firestore()
const admin = () => verified('u-admin', ADMIN)
const editor = () => verified('u-editor', EDITOR)
const outsider = () => verified('u-cizi', OUTSIDER)
// E-mail z tokenu, který odkaz z pošty neověřil. Třeba cizí poskytovatel.
const unverified = () => env.authenticatedContext('u-neovereny', { email: EDITOR, email_verified: false }).firestore()
const anon = (uid = 'u-hrac') =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
const nobody = () => env.unauthenticatedContext().firestore()

const inHour = () => Timestamp.fromMillis(Date.now() + 3600_000)

const member = (email, role) => ({ email, role, addedBy: ADMIN, addedAt: Timestamp.now() })

const report = (hostUid, hostEmail) => ({
  schema: 1,
  id: 'r2',
  hostUid,
  hostEmail,
  groupName: 'Nováčci',
  round: 1,
  packNames: ['Ukázka'],
  startedAt: 1,
  finishedAt: 2,
  questions: [],
  players: [],
  matrix: [],
})

const quizSession = (hostUid, spaceId) => ({
  schema: 1,
  code: 'ABCDE',
  hostUid,
  spaceId,
  phase: 'lobby',
  round: 1,
  index: 0,
  qid: 'q1',
  acceptsPlayers: true,
  askedAt: null,
  preRollMs: 0,
  limitMs: 20000,
  expiresAt: inHour(),
  scores: {},
})

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mucirna',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

after(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'spaces/uniqa'), { name: 'UNIQA' })
    await setDoc(doc(db, `spaces/uniqa/members/${ADMIN}`), member(ADMIN, 'admin'))
    await setDoc(doc(db, `spaces/uniqa/members/${EDITOR}`), member(EDITOR, 'editor'))
    await setDoc(doc(db, 'spaces/uniqa/quizPacks/kp1'), { name: 'Ukázka' })
    await setDoc(doc(db, 'spaces/uniqa/packs/p1'), { name: 'Deska' })
    await setDoc(doc(db, 'spaces/uniqa/quizImages/i1'), { id: 'i1', data: 'x' })
    await setDoc(doc(db, 'spaces/uniqa/quizReports/r1'), report('u-admin', ADMIN))
    await setDoc(doc(db, 'spaces/uniqa/vyslechReports/v1'), { title: 'Výslech' })
    await setDoc(doc(db, 'spaces/jiny'), { name: 'Jiný tým' })
    await setDoc(doc(db, `spaces/jiny/members/${OTHER}`), member(OTHER, 'admin'))
    await setDoc(doc(db, 'spaces/jiny/quizPacks/kp9'), { name: 'Cizí' })
    // Pozůstatky z doby hesla do správy.
    await setDoc(doc(db, 'packs/p1'), { name: 'Starý' })
    await setDoc(doc(db, 'quizPacks/kp1'), { name: 'Starý' })
    await setDoc(doc(db, 'config/admin'), { keyHash: 'abc' })
  })
})

describe('data prostoru', () => {
  it('člen čte balíčky, obrázky i výsledky', async () => {
    for (const db of [admin(), editor()]) {
      await assertSucceeds(getDoc(doc(db, 'spaces/uniqa/quizPacks/kp1')))
      await assertSucceeds(getDocs(collection(db, 'spaces/uniqa/packs')))
      await assertSucceeds(getDoc(doc(db, 'spaces/uniqa/quizImages/i1')))
      await assertSucceeds(getDocs(collection(db, 'spaces/uniqa/quizReports')))
      await assertSucceeds(getDocs(collection(db, 'spaces/uniqa/vyslechReports')))
    }
  })

  it('nikdo jiný do prostoru nevidí', async () => {
    for (const db of [outsider(), unverified(), anon(), nobody()]) {
      await assertFails(getDoc(doc(db, 'spaces/uniqa/quizPacks/kp1')))
      await assertFails(getDocs(collection(db, 'spaces/uniqa/quizPacks')))
      await assertFails(getDoc(doc(db, 'spaces/uniqa')))
    }
  })

  it('člen jednoho prostoru nevidí do druhého', async () => {
    await assertFails(getDoc(doc(admin(), 'spaces/jiny/quizPacks/kp9')))
    await assertFails(setDoc(doc(admin(), 'spaces/jiny/quizPacks/kp10'), { name: 'x' }))
  })

  it('editorka upravuje a maže balíčky, cizí ne', async () => {
    await assertSucceeds(setDoc(doc(editor(), 'spaces/uniqa/quizPacks/kp2'), { name: 'Nový' }))
    await assertSucceeds(deleteDoc(doc(editor(), 'spaces/uniqa/packs/p1')))
    await assertFails(setDoc(doc(outsider(), 'spaces/uniqa/quizPacks/kp3'), { name: 'x' }))
    await assertFails(setDoc(doc(anon(), 'spaces/uniqa/quizPacks/kp3'), { name: 'x' }))
  })

  it('obrázek má strop velikosti a sedící id', async () => {
    await assertSucceeds(setDoc(doc(editor(), 'spaces/uniqa/quizImages/i2'), { id: 'i2', data: 'x'.repeat(1000) }))
    await assertFails(setDoc(doc(editor(), 'spaces/uniqa/quizImages/i3'), { id: 'i3', data: 'x'.repeat(900_001) }))
    await assertFails(setDoc(doc(editor(), 'spaces/uniqa/quizImages/i4'), { id: 'jine', data: 'x' }))
    await assertSucceeds(deleteDoc(doc(editor(), 'spaces/uniqa/quizImages/i1')))
  })

  it('vyhodnocení kvízu nese, kdo školil, a zpětně se nemění', async () => {
    await assertSucceeds(setDoc(doc(editor(), 'spaces/uniqa/quizReports/r2'), report('u-editor', EDITOR)))
    await assertFails(setDoc(doc(editor(), 'spaces/uniqa/quizReports/r3'), report('u-editor', ADMIN)))
    await assertFails(setDoc(doc(editor(), 'spaces/uniqa/quizReports/r4'), report('u-admin', EDITOR)))
    await assertFails(updateDoc(doc(admin(), 'spaces/uniqa/quizReports/r1'), { groupName: 'Jiná' }))
    await assertSucceeds(deleteDoc(doc(editor(), 'spaces/uniqa/quizReports/r1')))
  })

  it('staré kolekce z doby hesla jsou zavřené', async () => {
    for (const db of [admin(), anon(), nobody()]) {
      await assertFails(getDoc(doc(db, 'packs/p1')))
      await assertFails(getDoc(doc(db, 'quizPacks/kp1')))
      await assertFails(getDoc(doc(db, 'config/admin')))
      await assertFails(setDoc(doc(db, 'unlocks/u-admin'), { keyHash: 'abc' }))
    }
  })
})

describe('prostor a členové', () => {
  it('admin prostor přejmenuje, editorka ne, založit ho nesmí nikdo', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'spaces/uniqa'), { name: 'UNIQA KAM' }))
    await assertFails(updateDoc(doc(editor(), 'spaces/uniqa'), { name: 'x' }))
    await assertFails(updateDoc(doc(admin(), 'spaces/uniqa'), { owner: 'x' }))
    await assertFails(setDoc(doc(admin(), 'spaces/novy'), { name: 'Nový' }))
  })

  it('členy vidí admin i editorka', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'spaces/uniqa/members')))
    await assertSucceeds(getDocs(collection(editor(), 'spaces/uniqa/members')))
    await assertFails(getDocs(collection(outsider(), 'spaces/uniqa/members')))
  })

  it('admin přidá kolegyni', async () => {
    const email = 'nova@uniqa.cz'
    await assertSucceeds(
      setDoc(doc(admin(), `spaces/uniqa/members/${email}`), {
        email,
        role: 'editor',
        name: 'Nová kolegyně',
        addedBy: ADMIN,
        addedAt: serverTimestamp(),
      }),
    )
  })

  it('editorka členy nepřidává', async () => {
    const email = 'nova@uniqa.cz'
    await assertFails(
      setDoc(doc(editor(), `spaces/uniqa/members/${email}`), {
        email,
        role: 'editor',
        addedBy: EDITOR,
        addedAt: serverTimestamp(),
      }),
    )
  })

  it('člen musí mít platný tvar', async () => {
    const add = (id, data) =>
      setDoc(doc(admin(), `spaces/uniqa/members/${id}`), {
        email: id,
        role: 'editor',
        addedBy: ADMIN,
        addedAt: serverTimestamp(),
        ...data,
      })
    await assertFails(add('Nova@uniqa.cz', {}))
    await assertFails(add('nova@uniqa.cz', { email: 'jina@uniqa.cz' }))
    await assertFails(add('nova@uniqa.cz', { role: 'owner' }))
    await assertFails(add('nova@uniqa.cz', { addedBy: EDITOR }))
    await assertFails(add('nova@uniqa.cz', { superuser: true }))
    await assertFails(add('nova@uniqa.cz', { name: 'x'.repeat(81) }))
  })

  it('admin mění roli a odebírá, sám sebe ne', async () => {
    await assertSucceeds(updateDoc(doc(admin(), `spaces/uniqa/members/${EDITOR}`), { role: 'admin' }))
    await assertFails(updateDoc(doc(admin(), `spaces/uniqa/members/${EDITOR}`), { email: 'x@uniqa.cz' }))
    await assertFails(updateDoc(doc(admin(), `spaces/uniqa/members/${ADMIN}`), { role: 'editor' }))
    await assertFails(deleteDoc(doc(admin(), `spaces/uniqa/members/${ADMIN}`)))
    await assertSucceeds(deleteDoc(doc(admin(), `spaces/uniqa/members/${EDITOR}`)))
  })

  it('admin znovu pošle pozvánku, razítko dává server', async () => {
    await assertSucceeds(updateDoc(doc(admin(), `spaces/uniqa/members/${EDITOR}`), { invitedAt: serverTimestamp() }))
    await assertFails(
      updateDoc(doc(admin(), `spaces/uniqa/members/${EDITOR}`), { invitedAt: Timestamp.fromMillis(1) }),
    )
    await assertFails(updateDoc(doc(editor(), `spaces/uniqa/members/${ADMIN}`), { invitedAt: serverTimestamp() }))
  })

  it('člen si jednou zapíše přijetí pozvánky, za jiného ne', async () => {
    await assertFails(updateDoc(doc(editor(), `spaces/uniqa/members/${ADMIN}`), { joinedAt: serverTimestamp() }))
    await assertFails(
      updateDoc(doc(editor(), `spaces/uniqa/members/${EDITOR}`), { joinedAt: Timestamp.fromMillis(1) }),
    )
    await assertFails(
      updateDoc(doc(editor(), `spaces/uniqa/members/${EDITOR}`), { joinedAt: serverTimestamp(), role: 'admin' }),
    )
    await assertSucceeds(updateDoc(doc(editor(), `spaces/uniqa/members/${EDITOR}`), { joinedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(editor(), `spaces/uniqa/members/${EDITOR}`), { joinedAt: serverTimestamp() }))
  })

  it('editorka si roli nezvýší', async () => {
    await assertFails(updateDoc(doc(editor(), `spaces/uniqa/members/${EDITOR}`), { role: 'admin' }))
  })

  it('po přihlášení se dá zjistit, kam patřím, ale ne kam patří ostatní', async () => {
    const mine = query(collectionGroup(editor(), 'members'), where('email', '==', EDITOR))
    const snap = await assertSucceeds(getDocs(mine))
    if (snap.size !== 1 || snap.docs[0].ref.parent.parent.id !== 'uniqa') throw new Error('čekal jsem uniqa')
    await assertSucceeds(getDocs(query(collectionGroup(outsider(), 'members'), where('email', '==', OUTSIDER))))
    await assertFails(getDocs(query(collectionGroup(outsider(), 'members'), where('email', '==', ADMIN))))
    await assertFails(getDocs(collectionGroup(editor(), 'members')))
  })
})

describe('živá hra kvízu', () => {
  it('hru otevře jen člen prostoru, ze kterého je', async () => {
    await assertSucceeds(setDoc(doc(editor(), 'quiz/ABCDE'), quizSession('u-editor', 'uniqa')))
    await assertFails(setDoc(doc(anon(), 'quiz/ABCDF'), { ...quizSession('u-hrac', 'uniqa'), code: 'ABCDF' }))
    await assertFails(setDoc(doc(outsider(), 'quiz/ABCDG'), { ...quizSession('u-cizi', 'uniqa'), code: 'ABCDG' }))
    await assertFails(setDoc(doc(editor(), 'quiz/ABCDH'), { ...quizSession('u-editor', 'jiny'), code: 'ABCDH' }))
    await assertFails(setDoc(doc(editor(), 'quiz/ABCDI'), (({ spaceId, ...rest }) => ({ ...rest, code: 'ABCDI' }))(quizSession('u-editor', 'uniqa'))))
  })

  it('seznam běžících her nedostane nikdo', async () => {
    await assertFails(getDocs(collection(admin(), 'quiz')))
  })

  it('hráč se připojí a odpoví, pozdě ani podruhé ne', async () => {
    const host = editor()
    await setDoc(doc(host, 'quiz/ABCDE'), quizSession('u-editor', 'uniqa'))
    await assertFails(updateDoc(doc(host, 'quiz/ABCDE'), { spaceId: 'jiny' }))

    const phone = anon('u-hrac')
    const late = anon('u-hrac2')
    const s = await assertSucceeds(getDoc(doc(phone, 'quiz/ABCDE')))
    const join = (db, uid, nick) =>
      setDoc(doc(db, `quiz/ABCDE/players/${uid}`), {
        nick,
        avatar: 'badger',
        joinedAt: serverTimestamp(),
        joinedAtIndex: 0,
        expiresAt: s.data().expiresAt,
      })
    await assertSucceeds(join(phone, 'u-hrac', 'Jezevec'))
    await assertSucceeds(join(late, 'u-hrac2', 'Liška'))
    await assertFails(join(late, 'u-hrac', 'Podvodník'))

    await assertSucceeds(updateDoc(doc(host, 'quiz/ABCDE'), { phase: 'question', askedAt: serverTimestamp() }))
    await new Promise((r) => setTimeout(r, 20))
    const answer = {
      uid: 'u-hrac',
      round: 1,
      qid: 'q1',
      choice: 2,
      elapsedMs: 1500,
      at: serverTimestamp(),
      expiresAt: s.data().expiresAt,
    }
    await assertSucceeds(setDoc(doc(phone, 'quiz/ABCDE/answers/1_q1_u-hrac'), answer))
    await assertFails(setDoc(doc(phone, 'quiz/ABCDE/answers/1_q1_u-hrac'), { ...answer, choice: 3 }))

    await assertFails(getDocs(collection(phone, 'quiz/ABCDE/answers')))
    await assertSucceeds(getDocs(collection(host, 'quiz/ABCDE/answers')))

    await updateDoc(doc(host, 'quiz/ABCDE'), { phase: 'reveal' })
    await assertFails(setDoc(doc(late, 'quiz/ABCDE/answers/1_q1_u-hrac2'), { ...answer, uid: 'u-hrac2' }))
  })
})

describe('Výslech', () => {
  const sber = (hostUid, spaceId) => ({
    schema: 1,
    code: 'VWXYZ',
    hostUid,
    spaceId,
    phase: 'open',
    title: 'Po školení',
    questions: [],
    expiresAt: inHour(),
  })

  it('sběr otevře jen člen, telefon odpoví anonymně', async () => {
    await assertFails(setDoc(doc(anon(), 'vyslech/VWXYZ'), sber('u-hrac', 'uniqa')))
    await assertFails(setDoc(doc(outsider(), 'vyslech/VWXYZ'), sber('u-cizi', 'uniqa')))
    await assertSucceeds(setDoc(doc(admin(), 'vyslech/VWXYZ'), sber('u-admin', 'uniqa')))

    const phone = anon('u-telefon')
    const s = await assertSucceeds(getDoc(doc(phone, 'vyslech/VWXYZ')))
    await assertSucceeds(
      setDoc(doc(phone, 'vyslech/VWXYZ/responses/u-telefon'), {
        answers: { q1: 5 },
        at: serverTimestamp(),
        expiresAt: s.data().expiresAt,
      }),
    )
    await assertFails(getDocs(collection(phone, 'vyslech/VWXYZ/responses')))
    await assertSucceeds(getDocs(collection(admin(), 'vyslech/VWXYZ/responses')))
  })
})
