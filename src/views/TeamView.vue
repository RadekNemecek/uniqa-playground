<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiField from '@/components/ui/UiField.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import type { Segment } from '@/components/ui/segmented'
import type { TeamMember } from '@/lib/firebase'
import { account, isSpaceAdmin, type Role } from '@/stores/account'
import { confirmAction, toast } from '@/stores/ui'

/**
 * Tým: kdo smí k otázkám, Výslechu a výsledkům.
 *
 * Seznam vidí každý člen, měnit ho smí jen admin. Nový člen dostane
 * pozvánku mailem, nastaví si heslo a pak se přihlašuje sám. Kdo
 * pozvánku ještě nepřijal, je v seznamu poznat, a dá se mu poslat znovu,
 * protože odkaz po čase propadne.
 */
const firebase = () => import('@/lib/firebase')

const members = ref<TeamMember[]>([])
const loaded = ref(false)
const loadError = ref('')
let stop: (() => void) | null = null

const admin = computed(() => isSpaceAdmin())
const local = computed(() => account.status === 'local')

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', editor: 'Editor' }
const roleOptions: Segment<Role>[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

/** Admini napřed, uvnitř skupiny podle jména, jak je člověk hledá očima. */
const sorted = computed(() =>
  [...members.value].sort(
    (a, b) =>
      Number(b.role === 'admin') - Number(a.role === 'admin') ||
      label(a).localeCompare(label(b), 'cs'),
  ),
)

function label(m: TeamMember): string {
  return m.name || m.email
}

const dateFormat = new Intl.DateTimeFormat('cs', { day: 'numeric', month: 'numeric', year: 'numeric' })
/** Datum se nesmí rozlomit na dva řádky, „11. 10." a „2026" zvlášť
 *  se čtou jako dvě věci. */
const day = (ms: number) => (ms ? dateFormat.format(ms).replace(/ /g, '\u00a0') : '')

function status(m: TeamMember): string {
  if (m.joinedAt) return `V týmu od ${day(m.joinedAt)}`
  return m.invitedAt ? `Pozvánka odeslaná ${day(m.invitedAt)}, zatím nepřijatá` : 'Pozvánka zatím nepřijatá'
}

onMounted(async () => {
  if (local.value) {
    loaded.value = true
    return
  }
  const fb = await firebase()
  stop = fb.watchMembers(
    (list) => {
      members.value = list
      loaded.value = true
      loadError.value = ''
    },
    (message) => {
      loadError.value = message
      loaded.value = true
    },
  )
})
onBeforeUnmount(() => stop?.())

/* --- Pozvání ------------------------------------------------------------ */

const inviteOpen = ref(false)
const inviteEmail = ref('')
const inviteName = ref('')
const inviteRole = ref<Role>('editor')
const inviteError = ref('')
const inviting = ref(false)

// Stará chyba k jiné adrese by mátla.
watch(inviteEmail, () => {
  inviteError.value = ''
})

function openInvite(): void {
  inviteEmail.value = ''
  inviteName.value = ''
  inviteRole.value = 'editor'
  inviteError.value = ''
  inviteOpen.value = true
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function invite(): Promise<void> {
  inviteError.value = ''
  const email = inviteEmail.value.trim().toLowerCase()
  if (!EMAIL.test(email)) {
    inviteError.value = 'Tohle nevypadá jako e-mailová adresa.'
    return
  }
  if (members.value.some((m) => m.email === email)) {
    inviteError.value = 'Tahle adresa už v týmu je.'
    return
  }
  inviting.value = true
  const fb = await firebase()
  try {
    await fb.inviteMember(email, inviteName.value, inviteRole.value)
    inviteOpen.value = false
    toast(`Pozvánka odešla na ${email}.`, 'ok', 5000)
  } catch (e) {
    console.error('Pozvání selhalo:', e)
    // Zápis do týmu prošel, ale mail ne. Člen v seznamu je a pozvánka
    // se dá poslat znovu z jeho řádku.
    if (members.value.some((m) => m.email === email) || (e as { code?: string }).code?.startsWith('auth/')) {
      inviteOpen.value = false
      toast(`${email} je v týmu, ale pozvánka neodešla. ${fb.authErrorMessage(e)} Pošli ji znovu z nabídky u řádku.`, 'bad')
    } else {
      inviteError.value = 'Pozvání se nepovedlo. Zkontroluj připojení a zkus to znovu.'
    }
  } finally {
    inviting.value = false
  }
}

/* --- Akce u řádku ------------------------------------------------------- */

async function resend(m: TeamMember): Promise<void> {
  const fb = await firebase()
  try {
    await fb.resendInvite(m.email)
    toast(`Nová pozvánka odešla na ${m.email}.`, 'ok', 5000)
  } catch (e) {
    console.error('Opětovné odeslání pozvánky selhalo:', e)
    toast(`Pozvánka neodešla. ${fb.authErrorMessage(e)}`, 'bad')
  }
}

async function changeRole(m: TeamMember, role: Role): Promise<void> {
  const fb = await firebase()
  try {
    await fb.updateMember(m.email, { role })
    toast(`${label(m)} je teď ${ROLE_LABEL[role].toLowerCase()}.`, 'ok')
  } catch (e) {
    console.error('Změna role selhala:', e)
    toast('Roli se nepodařilo změnit. Zkontroluj připojení.', 'bad')
  }
}

async function remove(m: TeamMember): Promise<void> {
  const ok = await confirmAction({
    // Jméno zůstává v prvním pádě. Skloňovat cizí jména automaticky
    // nejde a „Odebrat Jana Editorka" zní hůř než žádné jméno.
    title: 'Odebrat z týmu?',
    text: `${label(m)} přestane vidět otázky, Výslech i výsledky. Účet zůstane, takže jde kdykoli pozvat zpátky.`,
    confirmLabel: 'Odebrat',
    danger: true,
  })
  if (!ok) return
  const fb = await firebase()
  try {
    await fb.removeMember(m.email)
    toast(`${label(m)} už v týmu není.`, 'ok')
  } catch (e) {
    console.error('Odebrání selhalo:', e)
    toast('Odebrat se nepovedlo. Zkontroluj připojení.', 'bad')
  }
}
</script>

<template>
  <div class="page-wrap">
    <AppHeader prep />

    <main id="obsah" class="body page">
      <section class="team">
        <header class="team__head">
          <div>
            <p class="eyebrow">{{ account.spaceName || 'Tým' }}</p>
            <h1 class="team__title">Kdo může dovnitř.</h1>
            <p class="team__lead">
              Členové týmu vidí a upravují otázky, Výslech i výsledky. Admin navíc zve a odebírá členy.
            </p>
          </div>
          <div v-if="admin" class="team__actions">
            <UiButton size="sm" variant="brand" icon="plus" @click="openInvite">Pozvat</UiButton>
          </div>
        </header>

        <UiEmpty
          v-if="local"
          icon="info"
          title="Bez sdílené databáze tým není"
          text="Aplikace teď jede jen z tohoto počítače. Členy jde spravovat, až bude spojení se sdílenou databází."
        />

        <UiSkeleton v-else-if="!loaded" :lines="4" />

        <UiEmpty v-else-if="loadError" icon="warning" title="Tým se nepodařilo načíst" :text="loadError" />

        <ul v-else class="team__items">
          <li v-for="(m, i) in sorted" :key="m.email" class="row">
            <span class="row__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="row__main">
              <span class="row__name">{{ label(m) }}</span>
              <span class="row__badge" :class="{ 'row__badge--admin': m.role === 'admin' }">
                {{ ROLE_LABEL[m.role] }}
              </span>
              <span class="row__meta">
                <template v-if="m.name">{{ m.email }} · </template>{{ status(m) }}
              </span>
            </div>

            <span v-if="m.email === account.email" class="row__self">To jsi ty</span>
            <UiMenu v-else-if="admin" :label="`Akce člena ${label(m)}`" v-slot="{ close }">
              <button v-if="!m.joinedAt" type="button" role="menuitem" @click="resend(m); close()">
                Poslat pozvánku znovu
              </button>
              <button
                type="button"
                role="menuitem"
                @click="changeRole(m, m.role === 'admin' ? 'editor' : 'admin'); close()"
              >
                {{ m.role === 'admin' ? 'Změnit na editora' : 'Změnit na admina' }}
              </button>
              <button type="button" role="menuitem" class="danger" @click="remove(m); close()">Odebrat z týmu</button>
            </UiMenu>
          </li>
        </ul>
      </section>
    </main>

    <UiModal :open="inviteOpen" title="Pozvat do týmu" size="sm" @close="inviteOpen = false">
      <form class="invite" novalidate @submit.prevent="invite">
        <UiField label="E-mail" required :error="inviteError">
          <template #default="{ describedBy }">
            <input
              v-model="inviteEmail"
              type="email"
              inputmode="email"
              autocomplete="off"
              required
              :aria-describedby="describedBy"
            />
          </template>
        </UiField>
        <UiField label="Jméno" hint="Nepovinné. V seznamu se pak ukáže místo e-mailu.">
          <input v-model="inviteName" type="text" maxlength="80" autocomplete="off" />
        </UiField>
        <div class="invite__role">
          <span class="invite__label">Role</span>
          <UiSegmented v-model="inviteRole" :options="roleOptions" aria-label="Role" />
          <p class="invite__hint">
            {{ inviteRole === 'admin'
              ? 'Admin může všechno, včetně zvaní a odebírání členů.'
              : 'Editor může všechno kromě správy členů.' }}
          </p>
        </div>
        <!-- Enter v poli odešle formulář, tlačítko v patičce okna je mimo něj. -->
        <button type="submit" hidden></button>
      </form>
      <template #footer>
        <UiButton size="sm" variant="ghost" @click="inviteOpen = false">Zrušit</UiButton>
        <UiButton size="sm" variant="brand" :loading="inviting" @click="invite">Poslat pozvánku</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
/* Týž tvar jako knihovny balíčků: nadpis, pod ním linkovaný seznam
   a na každém řádku nabídka akcí. */
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { flex: 1; padding-block: var(--sp-6) var(--sp-8); }

.team { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.team__head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--sp-5); }
.team__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.team__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); color: var(--c-text-muted); font-size: var(--fs-sm); line-height: var(--lh-body); }
.team__actions { display: flex; gap: var(--sp-3); }

.team__items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.row__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.row__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); align-items: baseline; }
.row__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.row__meta { grid-column: 1 / -1; font-size: var(--fs-sm); color: var(--c-text-muted); overflow-wrap: anywhere; }
.row__badge { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-muted); }
.row__badge--admin { color: var(--c-brand); }
.row__self { font-size: var(--fs-sm); color: var(--c-text-faint); }

.invite { display: grid; gap: var(--sp-4); }
.invite__role { display: grid; gap: var(--sp-2); }
.invite__label { font-size: var(--fs-sm); font-weight: 700; }
.invite__hint { font-size: var(--fs-sm); color: var(--c-text-muted); }

@media (max-width: 559px) {
  .row { grid-template-columns: minmax(0, 1fr) auto; }
  .row__index { display: none; }
}
</style>
