<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { GAMES, TOOLS } from '@/games/registry'
import { account, shortName } from '@/stores/account'

/**
 * Nabídka aplikace.
 *
 * Hry mají kartu na rozcestníku, nástroje ne: zpětná vazba není nic, co
 * by se v sále vybíralo, chystá ji manažerka před školením. Proto leží
 * tady, v hlavičce a v rohu rozcestníku, pod jedním tlačítkem.
 *
 * Dole je účet: kdo je přihlášený, tým a odhlášení. Přihlášeného člena
 * nese i samo tlačítko nabídky, štítkem s křestním jménem: notebook bývá
 * sdílený a bez toho nebylo poznat, pod kým se právě chystá. Celé jméno
 * ani adresa na štítek nepatří, příprava často běží na plátně.
 */
const router = useRouter()

const member = computed(() => account.status === 'member')
const first = computed(() => shortName())
const initial = computed(() => first.value.charAt(0).toLocaleUpperCase('cs'))
const ROLE_LABEL = { admin: 'admin', editor: 'editor' } as const

function go(route: string, close: () => void): void {
  close()
  void router.push(route)
}

/** Po odhlášení se stránka načte znovu, ať v ní nezůstane nic z týmu. */
async function signOut(close: () => void): Promise<void> {
  close()
  try {
    const { signOutHere } = await import('@/lib/firebase')
    await signOutHere()
  } finally {
    window.location.assign('/')
  }
}
</script>

<template>
  <UiMenu :label="member ? `Nabídka, přihlášený účet ${first}` : 'Nabídka'" icon="menu">
    <template v-if="member" #trigger="{ open, toggle, onKeyDown }">
      <button
        type="button"
        class="who-chip"
        :aria-label="`Nabídka, přihlášený účet ${first}`"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="toggle"
        @keydown.down.prevent="onKeyDown"
      >
        <span class="who-chip__tile" aria-hidden="true">{{ initial }}</span>
        <span class="who-chip__name">{{ first }}</span>
        <UiIcon name="menu" size="sm" />
      </button>
    </template>

    <template #default="{ close }">
      <button
        v-for="g in GAMES"
        :key="g.slug"
        type="button"
        role="menuitem"
        @click="go(g.route, close)"
      >
        <UiIcon name="play" size="sm" />
        {{ g.title }}
      </button>
      <hr />
      <button
        v-for="t in TOOLS"
        :key="t.slug"
        type="button"
        role="menuitem"
        @click="go(t.route, close)"
      >
        <UiIcon name="chat" size="sm" />
        <span class="tool">
          <strong>{{ t.title }}</strong>
          <span>{{ t.tagline }}</span>
        </span>
      </button>

      <template v-if="account.status !== 'local' && account.status !== 'loading'">
        <hr />
        <template v-if="account.email">
          <p class="who">
            <strong>{{ account.name || account.email }}</strong>
            <span v-if="account.name">{{ account.email }}</span>
            <span v-if="member">{{ account.spaceName || 'Tým' }} · {{ account.role ? ROLE_LABEL[account.role] : '' }}</span>
          </p>
          <!-- Bez jména se lektor v přípravě nepředvyplní a v hlavičce
               stojí začátek adresy. Doplnit ho má být po ruce. -->
          <button v-if="member && !account.name" type="button" role="menuitem" @click="go('/tym?jmeno=1', close)">
            <UiIcon name="edit" size="sm" />
            Doplnit jméno
          </button>
          <button v-if="member" type="button" role="menuitem" @click="go('/tym', close)">
            <UiIcon name="team" size="sm" />
            Tým a můj účet
          </button>
          <button type="button" role="menuitem" @click="signOut(close)">
            <UiIcon name="sign-out" size="sm" />
            Odhlásit se
          </button>
        </template>
        <button v-else type="button" role="menuitem" @click="go('/prihlaseni', close)">
          <UiIcon name="sign-in" size="sm" />
          Přihlásit se
        </button>
      </template>
    </template>
  </UiMenu>
</template>

<style scoped>
.tool { display: grid; }
.tool span { font-size: var(--fs-xs); font-weight: 400; color: var(--c-text-muted); }
.who { display: grid; gap: var(--sp-1); padding: var(--sp-2) var(--sp-3); font-size: var(--fs-xs); color: var(--c-text-muted); overflow-wrap: anywhere; }
.who strong { color: var(--c-text); font-size: var(--fs-sm); }

/* Štítek přihlášeného. Tvar i stín jako orámované ikonové tlačítko,
   aby vedle celé obrazovky a nastavení nevypadal jako cizí prvek. */
.who-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--control-md);
  max-width: var(--menu-width);
  padding: 0 var(--sp-3) 0 var(--sp-1);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-card);
  color: var(--c-text);
  box-shadow: var(--shadow-sm);
  font-size: var(--fs-sm);
  font-weight: 900;
  transition: translate var(--dur-instant) var(--ease-out);
}
.who-chip:hover {
  translate: calc(var(--shadow-x-sm) / 2) calc(var(--shadow-x-sm) / 2);
  box-shadow: calc(var(--shadow-x-sm) / 2) calc(var(--shadow-x-sm) / 2) 0 var(--c-ink);
}
.who-chip:active { translate: var(--shadow-x-sm) var(--shadow-x-sm); box-shadow: var(--shadow-none); }
.who-chip[aria-expanded='true'] { background: var(--c-brand-wash); }
.who-chip__tile {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--control-check);
  height: var(--control-check);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--c-bg-active);
  font-size: var(--fs-xs);
  line-height: 1;
}
.who-chip__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 559px) {
  .who-chip__name { display: none; }
  .who-chip { padding-right: var(--sp-2); }
}
@media (pointer: coarse) {
  .who-chip { height: var(--control-touch); }
}
</style>
