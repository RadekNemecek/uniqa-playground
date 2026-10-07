<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import BrandTile from '@/components/BrandTile.vue'
import CodeField from '@/components/CodeField.vue'
import QuestionInput from '@/vyslech/components/QuestionInput.vue'
import { CODE_LENGTH, isCodeShaped, normalizeCode } from '@/games/kviz/code'
import { hasVyslechDb, isVyslechDbConnecting, vyslechDbWhenReady, type VyslechDb } from '@/lib/vyslechDb'
import { isAnswered, minutesFor } from '@/vyslech/questions'
import { count } from '@/lib/format'
import type { VyslechAnswers, VyslechSession } from '@/vyslech/types'

/**
 * Dotazník na telefonu účastníka.
 *
 * Celá sada najednou, pod sebou, a jedno tlačítko Odeslat. Na plátně
 * otázky neběží: každý vyplňuje svým tempem a kdo píše delší odpověď,
 * nezdržuje sál.
 *
 * Rozepsané odpovědi drží telefon, takže obnovení stránky nic nesmaže.
 * Odeslání se čeká na potvrzení serverem, naslepo se neposílá.
 */
const route = useRoute()
const router = useRouter()

const DRAFT_KEY = 'playground.vyslech.draft.v1'

interface Draft {
  code: string
  answers: VyslechAnswers
  sent: boolean
}

const code = computed(() => normalizeCode(String(route.params.code ?? '')))
const session = ref<VyslechSession | null>(null)
const missing = ref(false)
const noConnection = ref(false)
const answers = ref<VyslechAnswers>({})
const sent = ref(false)
/** Uživatel se po odeslání vrátil a upravuje. */
const editing = ref(false)
const send = ref<'idle' | 'sending' | 'failed'>('idle')
const sendError = ref('')
const tried = ref(false)

let conn: VyslechDb | null = null
let stop: (() => void) | null = null

/* --- Ruční zadání kódu ---------------------------------------------------- */

const typedCode = ref('')
const codeError = ref('')

function goToCode(): void {
  const next = normalizeCode(typedCode.value)
  if (!isCodeShaped(next)) {
    codeError.value = `Kód má ${CODE_LENGTH} znaků. Přepiš ho z plátna přesně.`
    return
  }
  codeError.value = ''
  void router.push({ name: 'vyslech-dotaznik', params: { code: next } })
}

function enterAnotherCode(): void {
  typedCode.value = ''
  void router.push({ name: 'vyslech-kod' })
}

/* --- Rozepsané odpovědi --------------------------------------------------- */

function readDraft(forCode: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const draft = raw ? (JSON.parse(raw) as Draft) : null
    return draft?.code === forCode ? draft : null
  } catch {
    return null
  }
}

function writeDraft(): void {
  try {
    const draft: Draft = { code: code.value, answers: answers.value, sent: sent.value }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* Soukromé okno. Vyplnit jde dál, jen obnovení stránky zapomene. */
  }
}

watch(answers, writeDraft, { deep: true })

/* --- Spojení -------------------------------------------------------------- */

async function attach(): Promise<void> {
  stop?.()
  stop = null
  session.value = null
  missing.value = false
  noConnection.value = false
  const draft = readDraft(code.value)
  answers.value = draft?.answers ?? {}
  sent.value = draft?.sent ?? false
  editing.value = false

  conn ??= await vyslechDbWhenReady()
  if (!conn) {
    noConnection.value = true
    return
  }
  stop = conn.watchSession(code.value, (next, fromCache) => {
    // „Sběr neběží" smí říct jen server. Prázdný snímek z mezipaměti
    // je typicky jen vypadlá wifi.
    if (next === null && fromCache) return
    // Smazaný sběr po uzavření je pořád uzavřený, ne neexistující.
    if (next === null && session.value) {
      session.value = { ...session.value, phase: 'closed' }
      return
    }
    missing.value = next === null
    session.value = next
  })
}

/**
 * Znovu se pokusit o spojení. Když se nenavázalo vůbec, pomůže jen
 * načíst stránku: spojení se zakládá jednou při startu.
 */
function retryConnect(): void {
  if (!hasVyslechDb() && !isVyslechDbConnecting()) {
    window.location.reload()
    return
  }
  void attach()
}

/* --- Vyplňování ----------------------------------------------------------- */

const questions = computed(() => session.value?.questions ?? [])
const answeredCount = computed(() => questions.value.filter((q) => isAnswered(answers.value[q.id])).length)
const missingIds = computed(() =>
  questions.value.filter((q) => q.required && !isAnswered(answers.value[q.id])).map((q) => q.id),
)
const minutes = computed(() => minutesFor(questions.value))

const view = computed(() => {
  if (!code.value) return 'code'
  if (noConnection.value) return 'offline'
  if (missing.value) return sent.value ? 'thanks' : 'missing'
  if (!session.value) return 'loading'
  if (session.value.phase === 'closed') return sent.value ? 'thanks' : 'closed'
  if (sent.value && !editing.value) return 'thanks'
  return 'form'
})

/** Jen vyplněné odpovědi, texty oříznuté. Prázdné pole se neposílá. */
function cleaned(): VyslechAnswers {
  const out: VyslechAnswers = {}
  for (const q of questions.value) {
    const v = answers.value[q.id]
    if (!isAnswered(v)) continue
    out[q.id] = typeof v === 'string' ? v.trim() : v!
  }
  return out
}

async function submit(): Promise<void> {
  tried.value = true
  sendError.value = ''
  if (missingIds.value.length > 0) {
    await nextTick()
    document.getElementById(`q-${missingIds.value[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (!conn || !session.value || send.value === 'sending') return
  send.value = 'sending'
  try {
    await conn.submit(code.value, cleaned(), session.value.expiresAt)
    sent.value = true
    editing.value = false
    send.value = 'idle'
    writeDraft()
    window.scrollTo({ top: 0 })
  } catch (e) {
    send.value = 'failed'
    const denied = (e as { code?: string }).code === 'permission-denied'
    sendError.value = denied
      ? 'Sběr mezitím skončil a odpovědi se už neuložily.'
      : 'Neodesláno. Zkontroluj připojení a zkus to znovu.'
    // Po vypadlém spojení se další pokus pustí do čerstvého.
    if (!denied) void conn.resync().catch(() => undefined)
  }
}

function editAgain(): void {
  editing.value = true
  tried.value = false
  window.scrollTo({ top: 0 })
}

onMounted(() => {
  if (code.value) void attach()
})
watch(code, (next) => {
  if (next) void attach()
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <main id="obsah" class="fill">
    <!-- Zadání kódu --------------------------------------------------------- -->
    <form v-if="view === 'code'" class="card" @submit.prevent="goToCode">
      <p class="brand"><BrandTile class="brand__mark" /> Výslech</p>
      <h1 class="card__title">Zadej kód</h1>
      <p class="card__lead">Je na plátně, velkými písmeny.</p>
      <CodeField v-model="typedCode" label="Kód dotazníku" />
      <p v-if="codeError" class="card__error">{{ codeError }}</p>
      <UiButton type="submit" variant="brand" size="lg" block>Otevřít dotazník</UiButton>
    </form>

    <section v-else-if="view === 'offline'" class="card">
      <h1 class="card__title">Nemám spojení</h1>
      <p class="card__lead">Telefon se nedostal k internetu. Zkontroluj wifi nebo data a načti stránku znovu.</p>
      <UiButton variant="brand" size="lg" block @click="retryConnect">Načíst znovu</UiButton>
    </section>

    <section v-else-if="view === 'missing'" class="card">
      <h1 class="card__title">Tenhle dotazník neběží</h1>
      <p class="card__lead">Zkontroluj kód na plátně. Pokud sedí, sběr už skončil.</p>
      <p class="card__code">{{ code }}</p>
      <UiButton variant="ghost" @click="enterAnotherCode">Zadat jiný kód</UiButton>
    </section>

    <section v-else-if="view === 'loading'" class="card">
      <p class="card__lead">Hledám dotazník…</p>
    </section>

    <section v-else-if="view === 'closed'" class="card">
      <h1 class="card__title">Sběr skončil</h1>
      <p class="card__lead">Odpovědi se už nepřijímají. Díky, že ses chtěl/a ozvat.</p>
    </section>

    <!-- Díky ---------------------------------------------------------------- -->
    <section v-else-if="view === 'thanks'" class="card thanks">
      <p class="thanks__sticker">Máme to</p>
      <h1 class="card__title">Díky!</h1>
      <p class="card__lead">Tvoje odpovědi dorazily. Můžeš telefon schovat.</p>
      <UiButton
        v-if="session?.phase === 'open'"
        variant="ghost"
        icon="edit"
        @click="editAgain"
      >Upravit odpovědi</UiButton>
    </section>

    <!-- Dotazník ------------------------------------------------------------ -->
    <form v-else class="form" novalidate @submit.prevent="submit">
      <header class="form__head">
        <p class="brand brand--small"><BrandTile class="brand__mark" /> Výslech</p>
        <h1 class="form__title">{{ session?.title }}</h1>
        <p class="form__lead">
          Řekni nám rovnou, jak to šlo. Odpovědi jsou <strong>anonymní</strong>,
          jméno nikde nevyplňuješ. Zabere to asi {{ count(minutes, 'minutu', 'minuty', 'minut') }}.
        </p>
      </header>

      <QuestionInput
        v-for="(q, i) in questions"
        :id="`q-${q.id}`"
        :key="q.id"
        v-model="answers[q.id]"
        :question="q"
        :index="i"
        :missing="tried && missingIds.includes(q.id)"
      />

      <!-- Tlačítko je pořád na dosah palce a řádek nad ním říká, kolik
           zbývá. Kdo dojede dolů a něco vynechal, dozví se to dřív, než
           ťukne. -->
      <footer class="form__foot">
        <p class="form__progress" aria-live="polite">
          <template v-if="sendError">{{ sendError }}</template>
          <template v-else-if="tried && missingIds.length">
            Chybí {{ count(missingIds.length, 'povinná odpověď', 'povinné odpovědi', 'povinných odpovědí') }}
          </template>
          <template v-else>Vyplněno {{ answeredCount }} z {{ questions.length }}</template>
        </p>
        <UiButton
          type="submit"
          :variant="send === 'failed' ? 'danger' : 'brand'"
          size="lg"
          block
          :loading="send === 'sending'"
        >
          {{ send === 'failed' ? 'Zkusit odeslat znovu' : editing ? 'Odeslat znovu' : 'Odeslat' }}
        </UiButton>
      </footer>
    </form>
  </main>
</template>

<style scoped>
/* Telefon účastníka je běžné rozhraní, ne herní plocha: nastavení
   velikosti písma sem nepatří, čte se zblízka a ovládá palcem. */
.fill {
  min-height: 100dvh;
  display: grid;
  padding: var(--sp-4);
  background: var(--c-base);
}

.card {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--sp-3);
  padding: var(--sp-5);
  text-align: center;
}
.card__title { font-size: var(--fs-2xl); font-weight: 900; letter-spacing: -0.02em; }
.card__lead { max-width: 22rem; color: var(--c-text-muted); line-height: var(--lh-body); }
.card__error { color: var(--c-bad); font-size: var(--fs-sm); font-weight: 700; }
.card__code {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 900;
  letter-spacing: 0.15em;
  color: var(--c-brand);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  font-size: var(--fs-lg);
  font-weight: 900;
}
.brand__mark { width: var(--mark-size); height: var(--mark-size); }
.brand--small { margin-bottom: 0; font-size: var(--fs-sm); color: var(--c-text-muted); }

/* Poděkování je nálepka, stejný jazyk jako verdikt v kvízu. */
.thanks__sticker {
  padding: var(--sp-1) var(--sp-5);
  border: var(--border-w-heavy) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-ok-fill);
  box-shadow: var(--shadow-md);
  color: var(--c-text-ink);
  font-size: var(--fs-xl);
  font-weight: 900;
  rotate: -3deg;
  animation: stamp var(--dur-pop) var(--ease-back) both;
}
@keyframes stamp {
  from { opacity: 0; transform: scale(1.6) rotate(8deg); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .thanks__sticker { animation: none; }
}

/* Dotazník ------------------------------------------------------------------ */
.form {
  display: grid;
  align-content: start;
  gap: var(--sp-4);
  width: min(100%, var(--content-narrow));
  margin-inline: auto;
}
.form__head { display: grid; gap: var(--sp-2); padding-block: var(--sp-2) var(--sp-3); }
.form__title { font-size: var(--fs-2xl); font-weight: 900; letter-spacing: -0.02em; line-height: var(--lh-tight); }
.form__lead { color: var(--c-text-muted); line-height: var(--lh-body); }
.form__lead strong { color: var(--c-text); }

.form__foot {
  position: sticky;
  bottom: 0;
  display: grid;
  gap: var(--sp-2);
  margin-inline: calc(var(--sp-4) * -1);
  padding: var(--sp-3) var(--sp-4) var(--sp-4);
  border-top: var(--border-w-strong) solid var(--c-border);
  background: var(--c-base);
}
.form__progress { font-size: var(--fs-sm); font-weight: 700; text-align: center; color: var(--c-text-muted); }
</style>
