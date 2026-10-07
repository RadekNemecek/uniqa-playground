<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { GAMES, TOOLS } from '@/games/registry'

/**
 * Nabídka aplikace.
 *
 * Hry mají kartu na rozcestníku, nástroje ne: zpětná vazba není nic, co
 * by se v sále vybíralo, chystá ji manažerka a je za heslem. Proto leží
 * tady, v hlavičce a v rohu rozcestníku, pod jedním tlačítkem.
 */
const router = useRouter()

function go(route: string, close: () => void): void {
  close()
  void router.push(route)
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
    </template>
  </UiMenu>
</template>

<style scoped>
.tool { display: grid; }
.tool span { font-size: var(--fs-xs); font-weight: 400; color: var(--c-text-muted); }
</style>
