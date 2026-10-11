<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/icons'

/**
 * Karta přihlášení a pozvánky. Jedna obrazovka v několika stavech:
 * formulář, odeslaný mail, chybějící přístup. Tvar zůstává, mění se
 * jen obsah, aby se člověk při přechodu nemusel znovu rozkoukávat.
 */
defineProps<{
  icon: IconName
  title: string
  lead?: string
}>()
defineEmits<{ submit: [] }>()
</script>

<template>
  <div class="auth">
    <form class="auth__card" novalidate @submit.prevent="$emit('submit')">
      <span class="auth__icon" aria-hidden="true">
        <UiIcon :name="icon" size="xl" />
      </span>
      <h1 class="auth__title">{{ title }}</h1>
      <p v-if="lead" class="auth__lead">{{ lead }}</p>
      <slot />
    </form>
  </div>
</template>

<style scoped>
.auth { flex: 1; display: grid; place-items: center; padding: var(--sp-6) var(--sp-5) var(--sp-8); }
.auth__card {
  display: grid;
  gap: var(--sp-4);
  width: min(100%, 26rem);
  padding: var(--sp-6);
  border: var(--border-w-strong) solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.auth__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
  color: var(--c-brand);
}
.auth__title { font-size: var(--fs-2xl); }
.auth__lead { color: var(--c-text-muted); font-size: var(--fs-sm); line-height: var(--lh-body); }

/* Obsah karty skládají obrazovky, styly jejich částí jsou tady, aby
   přihlášení a pozvánka vypadaly stejně. */
.auth__card :deep(.auth__error) { color: var(--c-bad); font-size: var(--fs-sm); font-weight: 700; }
.auth__card :deep(.auth__note) { font-size: var(--fs-sm); line-height: var(--lh-body); }
.auth__card :deep(.auth__links) { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-2) var(--sp-5); }
.auth__card :deep(.auth__link) {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-touch);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-sm);
  text-decoration: none;
}
.auth__card :deep(.auth__link:hover) { color: var(--c-text); }

@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .auth__card { animation: none; } }
</style>
