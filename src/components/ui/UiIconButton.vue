<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/icons'

/**
 * Tlačítko, které nese jen ikonu.
 *
 * Dřív si ho šest komponent nakreslilo zvlášť: tři různé poloměry, dvě
 * pojetí rámečku a čtyři z nich bez jakéhokoli přechodu. Když jedno
 * tlačítko na hover najíždí plynule a sousední skáče, je to vidět dřív,
 * než si toho někdo stihne všimnout vědomě.
 */
withDefaults(
  defineProps<{
    icon: IconName
    /** Povinný: bez textu na tlačítku je tohle jediné, co odečítač přečte. */
    label: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'ghost' | 'plain' | 'danger'
    disabled?: boolean
    /** Stisknutý stav přepínače (celá obrazovka, zvuk, pauza). */
    pressed?: boolean
  }>(),
  { size: 'md', variant: 'ghost', disabled: false, pressed: undefined },
)
</script>

<template>
  <button
    type="button"
    class="iconbtn"
    :class="[`iconbtn--${variant}`, `iconbtn--${size}`]"
    :disabled="disabled"
    :title="label"
    :aria-label="label"
    :aria-pressed="pressed"
  >
    <UiIcon :name="icon" :size="size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'" />
  </button>
</template>

<style scoped>
.iconbtn {
  display: grid;
  place-items: center;
  flex: none;
  border: var(--border-w) solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  transition: var(--tr-surface);
}

.iconbtn--sm { width: var(--control-sm); height: var(--control-sm); }
.iconbtn--md { width: var(--control-md); height: var(--control-md); }
.iconbtn--lg { width: var(--control-lg); height: var(--control-lg); }

.iconbtn--ghost {
  border-color: var(--c-border);
  background: color-mix(in oklab, var(--c-bg-card) 55%, transparent);
}
.iconbtn--ghost:hover:not(:disabled) {
  border-color: var(--c-bg-active);
  background: var(--c-bg-card);
  color: var(--c-text);
}

/* Bez rámečku. Patří do řádku, kde by orámovaná tlačítka dělala plot:
   nástroje u karty hráče, šipky u otázky v seznamu. */
.iconbtn--plain:hover:not(:disabled) {
  background: color-mix(in oklab, var(--c-bg-raised) 70%, transparent);
  color: var(--c-text);
}

.iconbtn--danger { color: var(--c-text-muted); }
.iconbtn--danger:hover:not(:disabled) {
  border-color: color-mix(in oklab, var(--c-bad) 45%, transparent);
  background: color-mix(in oklab, var(--c-bad) 14%, transparent);
  color: var(--c-bad);
}

.iconbtn[aria-pressed='true'] {
  border-color: var(--c-brand);
  background: var(--c-brand-wash);
  color: var(--c-brand);
}

.iconbtn:disabled { opacity: 0.42; }

/* Na dotyku musí i malé tlačítko nabídnout plochu, do které jde trefit. */
@media (pointer: coarse) {
  .iconbtn--sm,
  .iconbtn--md { width: var(--control-touch); height: var(--control-touch); }
}
</style>
