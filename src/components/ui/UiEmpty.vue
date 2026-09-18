<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/icons'

/** Prázdný stav: co tu není a co s tím jde udělat. */
withDefaults(defineProps<{ title: string; text?: string; icon?: IconName }>(), {
  text: '',
  icon: 'info',
})
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true"><UiIcon :name="icon" size="lg" /></span>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="text" class="empty__text">{{ text }}</p>
    <div v-if="$slots.default" class="empty__actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: var(--sp-3);
  padding: var(--sp-8) var(--sp-5);
  text-align: center;
}
.empty__icon {
  display: grid;
  place-items: center;
  width: var(--control-lg);
  height: var(--control-lg);
  border-radius: var(--r-md);
  background: var(--c-bg-card);
  color: var(--c-text-faint);
}
.empty__title { font-size: var(--fs-lg); }
.empty__text {
  max-width: 32rem;
  font-size: var(--fs-sm);
  color: var(--c-text-faint);
  line-height: var(--lh-body);
}
.empty__actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-2); flex-wrap: wrap; justify-content: center; }
</style>
