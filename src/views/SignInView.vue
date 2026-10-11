<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AuthCard from '@/components/AuthCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { INVITE_DAYS, account, canUseSpace } from '@/stores/account'
import { count } from '@/lib/format'

/**
 * Přihlášení člena týmu.
 *
 * Registrace tu schválně není. Účet vzniká jen z pozvánky, kterou posílá
 * admin, takže kdo pozvaný není, nemá kde začít. Zapomenuté heslo se
 * obnoví mailem od Firebase.
 *
 * Po přihlášení se stránka načte znovu. Firestore se tím rozjede načisto
 * s ověřeným členstvím, místo aby se přepojovalo za chodu.
 */
const route = useRoute()
const router = useRouter()

/** Kam člověk mířil, než ho poslali sem. Jen cesta uvnitř aplikace. */
const next = computed(() => {
  const raw = route.query.dal
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
})

/** Kam se po přihlášení pokračuje, lidsky. Kdo klikl na kartu hry
 *  a ocitl se na formuláři, má vidět, že cesta nekončí tady. */
const nextTitle = computed(() => {
  if (next.value === '/') return ''
  const title = router.resolve(next.value).meta.title
  return title ? title.replace(/ \| /g, ' · ') : ''
})

const mode = ref<'signIn' | 'reset' | 'resetSent'>('signIn')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

const firebase = () => import('@/lib/firebase')

/** Bez sítě je to věc připojení. Se sítí odmítl ověření server a radit
 *  „zkontroluj připojení" by poslalo člověka hledat chybu u sebe. */
const unknownLead = computed(() =>
  navigator.onLine
    ? 'Server teď ověření neodpověděl. Zkus to za chvíli znovu, a když to nepomůže, napiš správci.'
    : 'Jsi bez připojení a tenhle počítač si tě ještě nepamatuje. Připoj se a zkus to znovu.',
)

// Kdo už dovnitř smí, tady nemá co dělat.
watchEffect(() => {
  if (canUseSpace()) void router.replace(next.value)
})

async function signIn(): Promise<void> {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Vyplň e-mail i heslo.'
    return
  }
  busy.value = true
  try {
    const fb = await firebase()
    await fb.signInWithPassword(email.value, password.value)
    // Členství se ověří hned. Kdo v týmu není, zůstane tady a dozví se
    // to, místo aby skončil na rozcestníku a nevěděl, proč nikam nesmí.
    await fb.refreshAccount()
    if (canUseSpace()) {
      window.location.assign(next.value)
      return
    }
    busy.value = false
  } catch (e) {
    error.value = (await firebase()).authErrorMessage(e)
    busy.value = false
  }
}

async function sendReset(): Promise<void> {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Vyplň e-mail, na který ti máme poslat odkaz.'
    return
  }
  busy.value = true
  try {
    const fb = await firebase()
    await fb.sendPasswordReset(email.value)
    mode.value = 'resetSent'
  } catch (e) {
    error.value = (await firebase()).authErrorMessage(e)
  } finally {
    busy.value = false
  }
}

async function retry(): Promise<void> {
  busy.value = true
  try {
    await (await firebase()).refreshAccount()
  } finally {
    busy.value = false
  }
}

async function signOut(): Promise<void> {
  busy.value = true
  try {
    await (await firebase()).signOutHere()
  } finally {
    window.location.assign(router.resolve({ name: 'prihlaseni', query: route.query }).href)
  }
}

function switchMode(to: 'signIn' | 'reset'): void {
  error.value = ''
  mode.value = to
}
</script>

<template>
  <div class="page-wrap">
    <AppHeader prep tools="none" />

    <main id="obsah" class="body">
      <div v-if="account.status === 'loading' || canUseSpace()" class="wait">
        <UiSkeleton :lines="4" />
      </div>

      <!-- Přihlášený, ale v žádném týmu. Typicky pozvánka ještě nedorazila,
           nebo se přihlásila jinou adresou, než na kterou přišla. -->
      <AuthCard
        v-else-if="account.status === 'noAccess'"
        icon="lock"
        title="Sem zatím nemáš přístup"
        :lead="`Adresa ${account.email} není v žádném týmu. Napiš správci, ať tě pozve. Jestli ti pozvánka přišla na jinou adresu, přihlas se tou.`"
      >
        <UiButton variant="brand" size="lg" block :loading="busy" @click="retry">Zkusit znovu</UiButton>
        <div class="auth__links">
          <button type="button" class="auth__link" @click="signOut">Odhlásit a přihlásit jinak</button>
        </div>
      </AuthCard>

      <!-- Pozvánka propadla dřív, než ji přijal. Poslat novou umí jen admin,
           lhůta se počítá od posledního odeslání. -->
      <AuthCard
        v-else-if="account.status === 'expired'"
        icon="mail"
        title="Pozvánka propadla"
        :lead="`Pozvánka pro ${account.email} platila ${count(INVITE_DAYS, 'den', 'dny', 'dní')} a nikdo ji mezitím nepřijal. Napiš správci, ať ti pošle novou.`"
      >
        <UiButton variant="brand" size="lg" block :loading="busy" @click="retry">Zkusit znovu</UiButton>
        <div class="auth__links">
          <button type="button" class="auth__link" @click="signOut">Odhlásit se</button>
        </div>
      </AuthCard>

      <AuthCard
        v-else-if="account.status === 'unknown'"
        icon="warning"
        title="Přístup se nepodařilo ověřit"
        :lead="unknownLead"
      >
        <UiButton variant="brand" size="lg" block :loading="busy" @click="retry">Zkusit znovu</UiButton>
        <div class="auth__links">
          <button type="button" class="auth__link" @click="signOut">Odhlásit se</button>
        </div>
      </AuthCard>

      <AuthCard
        v-else-if="mode === 'resetSent'"
        icon="mail"
        title="Mrkni do pošty"
        :lead="`Jestli k adrese ${email.trim()} existuje účet, přišel na ni odkaz na nové heslo. Když ho nevidíš, podívej se i do nevyžádané pošty.`"
      >
        <UiButton variant="brand" size="lg" block @click="switchMode('signIn')">Zpět na přihlášení</UiButton>
      </AuthCard>

      <AuthCard
        v-else-if="mode === 'reset'"
        icon="mail"
        title="Zapomenuté heslo"
        lead="Pošleme ti odkaz, kterým si nastavíš nové."
        @submit="sendReset"
      >
        <UiField label="E-mail">
          <input v-model="email" type="email" autocomplete="username" inputmode="email" required />
        </UiField>
        <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
        <UiButton type="submit" variant="brand" size="lg" block :loading="busy">Poslat odkaz</UiButton>
        <div class="auth__links">
          <button type="button" class="auth__link" @click="switchMode('signIn')">Zpět na přihlášení</button>
        </div>
      </AuthCard>

      <AuthCard
        v-else
        icon="sign-in"
        title="Přihlášení"
        lead="Otázky, Výslech a výsledky jsou jen pro tým. Účet dostaneš pozvánkou od správce."
        @submit="signIn"
      >
        <p v-if="nextTitle" class="auth__note">Potom pokračuješ do: <strong>{{ nextTitle }}</strong></p>
        <UiField label="E-mail">
          <input v-model="email" type="email" autocomplete="username" inputmode="email" required />
        </UiField>
        <UiField label="Heslo">
          <input v-model="password" type="password" autocomplete="current-password" required />
        </UiField>
        <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
        <UiButton type="submit" variant="brand" size="lg" block :loading="busy">Přihlásit se</UiButton>
        <div class="auth__links">
          <button type="button" class="auth__link" @click="switchMode('reset')">Zapomenuté heslo</button>
          <RouterLink to="/" class="auth__link">Zpět do Mučírny</RouterLink>
        </div>
      </AuthCard>
    </main>
  </div>
</template>

<style scoped>
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { flex: 1; display: flex; flex-direction: column; }
.wait { width: min(100%, 26rem); margin: var(--sp-8) auto; padding-inline: var(--sp-5); }
</style>
