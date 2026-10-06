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
  border: var(--border-w-strong) solid transparent;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    translate var(--dur-instant) var(--ease-out),
    box-shadow var(--dur-instant) var(--ease-out);
}

.iconbtn--sm { width: var(--control-sm); height: var(--control-sm); }
.iconbtn--md { width: var(--control-md); height: var(--control-md); }
.iconbtn--lg { width: var(--control-lg); height: var(--control-lg); }

/* Orámované ikonové tlačítko se chová jako velké: stín a zamáčknutí. */
.iconbtn--ghost {
  border-color: var(--c-border);
  background: var(--c-bg-card);
  color: var(--c-text);
  box-shadow: var(--shadow-sm);
}
.iconbtn--ghost:hover:not(:disabled) {
  translate: calc(var(--shadow-x-sm) / 2) calc(var(--shadow-x-sm) / 2);
  box-shadow: calc(var(--shadow-x-sm) / 2) calc(var(--shadow-x-sm) / 2) 0 var(--c-ink);
}
.iconbtn--ghost:active:not(:disabled) {
  translate: var(--shadow-x-sm) var(--shadow-x-sm);
  box-shadow: var(--shadow-none);
}

/* Bez rámečku. Patří do řádku, kde by orámovaná tlačítka dělala plot:
   nástroje u karty hráče, šipky u otázky v seznamu. */
.iconbtn--plain:hover:not(:disabled) {
  background: var(--c-bg-active);
  color: var(--c-text);
}

.iconbtn--danger { color: var(--c-text-muted); }
.iconbtn--danger:hover:not(:disabled) {
  border-color: var(--c-bad);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
}

.iconbtn[aria-pressed='true'] {
  border-color: var(--c-border);
  background: var(--c-brand);
  color: var(--c-on-accent);
}

.iconbtn:disabled { opacity: 0.45; box-shadow: var(--shadow-none); }

/* Na dotyku musí i malé tlačítko nabídnout plochu, do které jde trefit. */
@media (pointer: coarse) {
  .iconbtn--sm,
  .iconbtn--md { width: var(--control-touch); height: var(--control-touch); }
}
</style>
