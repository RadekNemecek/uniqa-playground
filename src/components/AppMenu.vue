<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { GAMES, TOOLS } from '@/games/registry'
import { account } from '@/stores/account'

/**
 * Nabídka aplikace.
 *
 * Hry mají kartu na rozcestníku, nástroje ne: zpětná vazba není nic, co
 * by se v sále vybíralo, chystá ji manažerka před školením. Proto leží
 * tady, v hlavičce a v rohu rozcestníku, pod jedním tlačítkem.
 *
 * Dole je účet: kdo je přihlášený, tým a odhlášení. Hlavička na ně
 * vlastní místo nemá, na plátně by jen překážely.
 */
const router = useRouter()

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
  <UiMenu label="Nabídka" icon="menu">
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
            <span>Přihlášená adresa</span>
            <strong>{{ account.email }}</strong>
          </p>
          <button v-if="account.status === 'member'" type="button" role="menuitem" @click="go('/tym', close)">
            <UiIcon name="team" size="sm" />
            Tým
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
.who { display: grid; padding: var(--sp-2) var(--sp-3); font-size: var(--fs-xs); color: var(--c-text-muted); overflow-wrap: anywhere; }
.who strong { color: var(--c-text); font-size: var(--fs-sm); }
</style>
