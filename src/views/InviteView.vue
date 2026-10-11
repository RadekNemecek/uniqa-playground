<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AuthCard from '@/components/AuthCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { account, canUseSpace } from '@/stores/account'

/**
 * Přijetí pozvánky.
 *
 * Sem vede odkaz z mailu, který poslal admin. Kliknutím na něj člověk
 * dokázal, že adresa je jeho, a tady si nastaví heslo. Dál se přihlašuje
 * heslem, odkaz už nepotřebuje.
 *
 * E-mail je předvyplněný z odkazu, odkaz skoro vždycky otevírá jiný
 * prohlížeč, než ze kterého admin zval. Bezpečnost tím neklesá: doklad
 * je odkaz sám, kdo ho má, přihlásí se i bez předvyplnění. Proto se
 * pozvánka nepřeposílá. Po nastavení hesla se stránka načte znovu bez
 * odkazu, takže v historii prohlížeče nezůstane.
 */
const state = ref<'checking' | 'form' | 'notLink'>('checking')
const email = ref(new URLSearchParams(window.location.search).get('email') ?? '')
const password = ref('')
const repeat = ref('')
const error = ref('')
const busy = ref(false)

/** Heslo na sdílený notebook v zasedačce. Firebase sám pustí šest znaků,
 *  to je na tohle málo. */
const MIN_PASSWORD = 8

const firebase = () => import('@/lib/firebase')

onMounted(async () => {
  if (account.status === 'local') {
    state.value = 'notLink'
    return
  }
  const fb = await firebase()
  state.value = fb.isInviteLink(window.location.href) ? 'form' : 'notLink'
})

async function accept(): Promise<void> {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Vyplň e-mail, na který ti pozvánka přišla.'
    return
  }
  if (password.value.length < MIN_PASSWORD) {
    error.value = `Heslo musí mít aspoň ${MIN_PASSWORD} znaků.`
    return
  }
  if (password.value !== repeat.value) {
    error.value = 'Hesla se neshodují.'
    return
  }

  busy.value = true
  const fb = await firebase()
  try {
    await fb.acceptInvite(email.value, password.value, window.location.href)
    // Načíst znovu bez odkazu v adrese. Jednorázový kód by jinak zůstal
    // v historii a Firestore se rozjede načisto s ověřeným členstvím.
    window.location.replace('/')
  } catch (e) {
    // Adresu, která k odkazu nepatří, Firebase hlásí jako neplatnou.
    error.value =
      (e as { code?: string }).code === 'auth/invalid-email'
        ? 'Tahle adresa k pozvánce nepatří. Zadej tu, na kterou ti pozvánka přišla.'
        : fb.authErrorMessage(e)
    busy.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <AppHeader prep tools="none" />

    <main id="obsah" class="body">
      <div v-if="state === 'checking'" class="wait">
        <UiSkeleton :lines="4" />
      </div>

      <AuthCard
        v-else-if="state === 'notLink'"
        icon="mail"
        title="Pozvánka se otevírá z mailu"
        lead="Klikni na odkaz v mailu s pozvánkou. Když už účet máš, stačí se přihlásit."
      >
        <UiButton v-if="canUseSpace()" variant="brand" size="lg" block @click="$router.push('/')">
          Do Mučírny
        </UiButton>
        <UiButton v-else variant="brand" size="lg" block @click="$router.push('/prihlaseni')">
          Přihlásit se
        </UiButton>
      </AuthCard>

      <AuthCard
        v-else
        icon="team"
        title="Vítej v týmu"
        lead="Ještě si nastav heslo. Příště se jím přihlásíš na kterémkoli počítači."
        @submit="accept"
      >
        <UiField label="E-mail" hint="Ten, na který ti pozvánka přišla.">
          <input v-model="email" type="email" autocomplete="username" inputmode="email" required />
        </UiField>
        <UiField label="Heslo" :hint="`Aspoň ${MIN_PASSWORD} znaků.`">
          <input v-model="password" type="password" autocomplete="new-password" required />
        </UiField>
        <UiField label="Heslo znovu">
          <input v-model="repeat" type="password" autocomplete="new-password" required />
        </UiField>
        <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
        <UiButton type="submit" variant="brand" size="lg" block :loading="busy">Nastavit heslo a vstoupit</UiButton>
      </AuthCard>
    </main>
  </div>
</template>

<style scoped>
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { flex: 1; display: flex; flex-direction: column; }
.wait { width: min(100%, 26rem); margin: var(--sp-8) auto; padding-inline: var(--sp-5); }
</style>
