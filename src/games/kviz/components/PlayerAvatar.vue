<script setup lang="ts">
import { computed } from 'vue'
import { avatarFor } from '../avatars'

const props = withDefaults(
  defineProps<{
    /** Identifikátor zvířete. Neznámý padne na první z nabídky. */
    id: string | undefined
    /** Jméno se čtečce hlásí spolu s přezdívkou, tak ať se neopakuje. */
    decorative?: boolean
  }>(),
  { decorative: true },
)

const avatar = computed(() => avatarFor(props.id))
</script>

<template>
  <span
    class="ava"
    :style="{ '--tint': `var(${avatar.cssVar})` }"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : avatar.label"
  >
    <!-- Kresba je konstantní řetězec z `avatars.ts`, nikdy nic, co by
         přišlo od hráče nebo z databáze. -->
    <svg class="ava__art" viewBox="0 0 64 64" aria-hidden="true" v-html="avatar.art" />
  </span>
</template>

<style scoped>
.ava {
  display: inline-grid;
  place-items: center;
  width: var(--ava-size, 2.5rem);
  aspect-ratio: 1;
  border-radius: var(--r-full);
  background: var(--tint);
  overflow: hidden;
}
.ava__art { width: 100%; height: 100%; display: block; }

/* Kresba stojí na dvou barvách: inkoust a plocha kruhu. Výřez i čára
   se musí obarvit přes :deep(), obsah `v-html` scoped styly nedostane. */
.ava__art :deep(*) { fill: var(--c-text-ink); }
.ava__art :deep(.cut) { fill: var(--tint); }
.ava__art :deep(.ink-line),
.ava__art :deep(.cut-line) {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ava__art :deep(.ink-line) { stroke: var(--c-text-ink); }
.ava__art :deep(.cut-line) { stroke: var(--tint); }
.ava__art :deep(.thick) { stroke-width: 7; }
</style>
