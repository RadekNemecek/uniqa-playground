<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from '@/components/ui/icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Škála z tokens.css. Jiná velikost než tyhle čtyři se nezavádí. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /**
     * Popisek pro odečítač. Bez něj je ikona dekorace: tak je to správně
     * všude, kde vedle ní stojí text, který říká totéž.
     */
    label?: string
  }>(),
  { size: 'md', label: '' },
)

const icon = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="icon"
    :class="[`icon--${size}`, { 'icon--filled': icon.filled }]"
    viewBox="0 0 24 24"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    v-html="icon.body"
  />
</template>

<style scoped>
/* Jedna tloušťka tahu a jedno zakončení pro celou aplikaci. Velikost
   určuje škála, ne autor komponenty. */
.icon {
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: var(--icon-stroke);
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Plná ikona kreslí výplní. Kříž ani fajfka se pak na malé velikosti
   nerozpadnou na vlásek. */
.icon--filled {
  fill: currentColor;
  stroke: none;
}

.icon--xs { width: var(--icon-xs); height: var(--icon-xs); }
.icon--sm { width: var(--icon-sm); height: var(--icon-sm); }
.icon--md { width: var(--icon-md); height: var(--icon-md); }
.icon--lg { width: var(--icon-lg); height: var(--icon-lg); }
.icon--xl { width: var(--icon-xl); height: var(--icon-xl); }
</style>
