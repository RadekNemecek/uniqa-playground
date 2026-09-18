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
    <img class="ava__art" :src="avatar.src" alt="" draggable="false" />
  </span>
</template>

<style scoped>
.ava {
  display: inline-grid;
  place-items: center;
  width: var(--ava-size, 2.5rem);
  aspect-ratio: 1;
  border-radius: var(--r-full);
  background: color-mix(in oklab, var(--tint) 32%, var(--c-surface));
  overflow: hidden;
}
.ava__art {
  display: block;
  width: 100%;
  height: 100%;
  padding: var(--sp-1);
  object-fit: contain;
  user-select: none;
}
</style>
