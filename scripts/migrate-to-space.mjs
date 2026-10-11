/**
 * Přesun dat z doby hesla do správy do prostoru týmu.
 *
 * Dřív ležely balíčky, obrázky, sady a výsledky v kolekcích nahoře
 * v databázi. Teď patří prostoru `spaces/{prostor}` a vidí je jen jeho
 * člen. Skript je zkopíruje, založí prostor a prvního admina, pošle mu
 * pozvánku a nakonec staré kolekce uklidí.
 *
 * Bez `--apply` jen vypíše, co by udělal. Kroky jdou spouštět opakovaně:
 * kopie nepřepíše dokument, který už v prostoru je.
 *
 *   node scripts/migrate-to-space.mjs --admin ty@example.com            # nanečisto
 *   node scripts/migrate-to-space.mjs --admin ty@example.com --apply    # kopie, prostor, admin
 *   node scripts/migrate-to-space.mjs --admin ty@example.com --invite   # pozvánka adminovi
 *   node scripts/migrate-to-space.mjs --cleanup                         # co by se smazalo
 *   node scripts/migrate-to-space.mjs --cleanup --apply                 # smazat staré
 *
 * Další volby: --space uniqa, --name UNIQA, --url https://kamucirna.cz
 * (kam vede pozvánka) a --emulator (místo ostré databáze emulátory na
 * tomhle počítači, viz `npm run dev:emu`).
 *
 * Ostrá databáze se čte a zapisuje s přihlášením `gcloud auth login`,
 * tedy s tvými právy v projektu. Pravidla Firestore se na to nevztahují.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const { values: opt } = parseArgs({
  options: {
    admin: { type: 'string' },
    space: { type: 'string', default: 'uniqa' },
    name: { type: 'string', default: 'UNIQA' },
    url: { type: 'string', default: 'https://kamucirna.cz' },
    project: { type: 'string', default: 'uniqa-playground' },
    apply: { type: 'boolean', default: false },
    invite: { type: 'boolean', default: false },
    cleanup: { type: 'boolean', default: false },
    emulator: { type: 'boolean', default: false },
  },
})

/** Co se kopíruje do prostoru. Běžící hry ne, ty žijí pár hodin. */
const COPIED = ['packs', 'quizPacks', 'quizImages', 'quizReports', 'vyslechForms', 'vyslechReports']
/** Pozůstatky hesla do správy. */
const PASSWORD = ['config', 'unlocks']
/** Běžící hry a sběry. Mažou se jen ty bez prostoru, tedy staré. */
const SESSIONS = { quiz: ['players', 'answers'], vyslech: ['responses'] }

const FIRESTORE = opt.emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com'
const ROOT = `projects/${opt.project}/databases/(default)/documents`
const API = `${FIRESTORE}/v1/${ROOT}`

const token = opt.emulator
  ? 'owner'
  : execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim()

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...(opt.emulator ? {} : { 'x-goog-user-project': opt.project }),
}

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${url}\n${JSON.stringify(body.error ?? body, null, 2)}`)
  return body
}

/** Všechny dokumenty kolekce, po stránkách. Cesta je relativní k ROOT. */
async function list(path) {
  const docs = []
  let pageToken = ''
  do {
    const q = new URLSearchParams({ pageSize: '100', ...(pageToken ? { pageToken } : {}) })
    const page = await call(`${API}/${path}?${q}`)
    docs.push(...(page.documents ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return docs
}

async function get(path) {
  const res = await fetch(`${API}/${path}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

const idOf = (doc) => doc.name.split('/').at(-1)
const sizeOf = (write) => JSON.stringify(write).length

/** Zápisy po dávkách. Firestore bere nejvýš 500 zápisů a 10 MB na jeden
 *  commit, a obrázky mají skoro megabajt každý. */
async function commit(writes) {
  let batch = []
  let bytes = 0
  const flush = async () => {
    if (batch.length === 0) return
    await call(`${API}:commit`, { method: 'POST', body: JSON.stringify({ writes: batch }) })
    batch = []
    bytes = 0
  }
  for (const w of writes) {
    if (batch.length >= 400 || bytes + sizeOf(w) > 8_000_000) await flush()
    batch.push(w)
    bytes += sizeOf(w)
  }
  await flush()
}

const space = `${ROOT}/spaces/${opt.space}`
const mode = opt.apply ? '' : ' (nanečisto, nic se nezapíše; zapíše až --apply)'
const where = opt.emulator ? 'emulátor' : `projekt ${opt.project}`

/* --- Kopie, prostor a admin ---------------------------------------------- */

async function migrate() {
  if (!opt.admin) throw new Error('Chybí --admin s e-mailem prvního admina.')
  const admin = opt.admin.trim().toLowerCase()
  console.log(`Přesun do spaces/${opt.space}, ${where}${mode}\n`)

  const writes = []
  for (const col of COPIED) {
    const source = await list(col)
    const existing = new Set((await list(`spaces/${opt.space}/${col}`)).map(idOf))
    const fresh = source.filter((d) => !existing.has(idOf(d)))
    console.log(`  ${col.padEnd(15)} ${String(source.length).padStart(3)} ve staré, ${String(existing.size).padStart(3)} už v prostoru, ${fresh.length} ke zkopírování`)
    for (const d of fresh) writes.push({ update: { name: `${space}/${col}/${idOf(d)}`, fields: d.fields ?? {} } })
  }

  if (!(await get(`spaces/${opt.space}`))) {
    console.log(`  prostor         založit „${opt.name}"`)
    writes.push({ update: { name: space, fields: { name: { stringValue: opt.name } } } })
  } else {
    console.log('  prostor         už existuje')
  }

  if (!(await get(`spaces/${opt.space}/members/${admin}`))) {
    console.log(`  admin           zapsat ${admin}`)
    writes.push({
      update: {
        name: `${space}/members/${admin}`,
        fields: {
          email: { stringValue: admin },
          role: { stringValue: 'admin' },
          addedBy: { stringValue: admin },
        },
      },
      updateTransforms: [{ fieldPath: 'addedAt', setToServerValue: 'REQUEST_TIME' }],
    })
  } else {
    console.log(`  admin           ${admin} už v prostoru je`)
  }

  if (opt.apply) {
    await commit(writes)
    console.log(`\nZapsáno ${writes.length} dokumentů.`)
    console.log('Další krok: nasadit pravidla a aplikaci, pak --invite.')
  }
}

/* --- Pozvánka adminovi -------------------------------------------------- */

/**
 * Admin, kterého zapsal skript, nemá heslo ani účet. Dostane tutéž
 * pozvánku jako každý další člen: odkaz z mailu, na `/pozvanka` si
 * nastaví heslo.
 */
async function invite() {
  if (!opt.admin) throw new Error('Chybí --admin s e-mailem, kam pozvánku poslat.')
  const config = readFileSync(new URL('../src/lib/firebase.config.ts', import.meta.url), 'utf8')
  const apiKey = config.match(/apiKey:\s*'([^']+)'/)?.[1]
  if (!apiKey) throw new Error('V src/lib/firebase.config.ts chybí apiKey.')
  const auth = opt.emulator
    ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com'
    : 'https://identitytoolkit.googleapis.com'
  const res = await fetch(`${auth}/v1/accounts:sendOobCode?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestType: 'EMAIL_SIGNIN',
      email: opt.admin.trim().toLowerCase(),
      continueUrl: `${opt.url}/pozvanka`,
      canHandleCodeInApp: true,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Pozvánka neodešla: ${JSON.stringify(body.error ?? body)}`)
  console.log(`Pozvánka odešla na ${opt.admin}, vede na ${opt.url}/pozvanka.`)
}

/* --- Úklid --------------------------------------------------------------- */

/**
 * Smaže staré kolekce, ale jen když je všechno z nich v prostoru. Jinak
 * odmítne: smazání se vrátit nedá.
 */
async function cleanup() {
  console.log(`Úklid starých kolekcí, ${where}${mode}\n`)
  const deletes = []
  for (const col of COPIED) {
    const source = await list(col)
    const copied = new Set((await list(`spaces/${opt.space}/${col}`)).map(idOf))
    const missing = source.filter((d) => !copied.has(idOf(d)))
    if (missing.length) {
      throw new Error(`V ${col} je ${missing.length} dokumentů, které v prostoru chybí. Napřed --apply bez --cleanup.`)
    }
    console.log(`  ${col.padEnd(15)} smazat ${source.length}`)
    deletes.push(...source.map((d) => d.name))
  }
  for (const col of PASSWORD) {
    const docs = await list(col)
    console.log(`  ${col.padEnd(15)} smazat ${docs.length}`)
    deletes.push(...docs.map((d) => d.name))
  }
  for (const [col, subs] of Object.entries(SESSIONS)) {
    const old = (await list(col)).filter((d) => !d.fields?.spaceId)
    let children = 0
    for (const d of old) {
      for (const sub of subs) {
        const kids = await list(`${col}/${idOf(d)}/${sub}`)
        children += kids.length
        deletes.push(...kids.map((k) => k.name))
      }
      deletes.push(d.name)
    }
    console.log(`  ${col.padEnd(15)} smazat ${old.length} starých i s ${children} dokumenty pod nimi`)
  }

  if (opt.apply) {
    await commit(deletes.map((name) => ({ delete: name })))
    console.log(`\nSmazáno ${deletes.length} dokumentů.`)
  }
}

try {
  if (opt.cleanup) await cleanup()
  else if (opt.invite) await invite()
  else await migrate()
} catch (e) {
  console.error(`\n${e instanceof Error ? e.message : e}`)
  process.exit(1)
}
