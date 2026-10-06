<script setup lang="ts">
import UiIcon from '@/components/ui/UiIcon.vue'
import type { IconName } from '@/components/ui/icons'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'brand' | 'spark' | 'ghost' | 'quiet' | 'danger' | 'ok'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    /** Ikona před popiskem. */
    icon?: IconName | ''
    /** Ikona za popiskem, typicky šipka, kam tlačítko vede. */
    iconAfter?: IconName | ''
    /**
     * Ukládá se. Tlačítko zůstane široké, jen popisek vystřídá kolečko:
     * kdyby se zúžilo, poskočí celý řádek pod ním.
     */
    loading?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
    icon: '',
    iconAfter: '',
    loading: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--loading': loading }]"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true"></span>
    <UiIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 'sm' : 'md'" />
    <span class="btn__label"><slot /></span>
    <UiIcon v-if="iconAfter && !loading" :name="iconAfter" :size="size === 'sm' ? 'sm' : 'md'" />
  </button>
</template>

<style scoped>
/* Tlačítko je kus papíru s inkoustovou hranou a tvrdým stínem. Při
   najetí se pootočí do stínu, při stisku se do něj zamáčkne celé. Tenhle
   pohyb je celá hravost rozhraní, nic dalšího se na tlačítko nekreslí. */
.btn {
  --btn-bg: var(--c-bg-card);
  --btn-fg: var(--c-text);
  --btn-line: var(--c-border);
  --btn-bg-hover: var(--c-bg-raised);
  --btn-shadow: var(--shadow-sm);
  --btn-press: var(--shadow-x-sm);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border: var(--border-w-strong) solid var(--btn-line);
  border-radius: var(--r-md);
  background: var(--btn-bg);
  color: var(--btn-fg);
  box-shadow: var(--btn-shadow);
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 900;
  line-height: 1.2;
  text-align: center;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    translate var(--dur-instant) var(--ease-out),
    box-shadow var(--dur-instant) var(--ease-out);
}

.btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
  translate: calc(var(--btn-press) / 2) calc(var(--btn-press) / 2);
  box-shadow: calc(var(--btn-press) / 2) calc(var(--btn-press) / 2) 0 var(--c-ink);
}
.btn:active:not(:disabled) {
  translate: var(--btn-press) var(--btn-press);
  box-shadow: var(--shadow-none);
}
.btn:disabled { opacity: 0.45; box-shadow: var(--shadow-none); }
/* Během ukládání nemá kurzor slibovat, že se dá kliknout. */
.btn--loading { cursor: progress; opacity: 1; }

.btn--brand {
  --btn-bg: var(--button-brand-bg);
  --btn-bg-hover: var(--button-brand-hover);
  --btn-fg: var(--c-on-accent);
}

.btn--spark {
  --btn-bg: var(--c-spark);
  --btn-bg-hover: var(--c-spark-mid);
  --btn-fg: var(--c-text-ink);
}

.btn--ok {
  --btn-bg: var(--c-ok-fill);
  --btn-bg-hover: var(--c-ok-fill);
  --btn-fg: var(--c-text-ink);
}

/* Destruktivní akce má mít stejnou váhu jako potvrzovací. Prázdný obrys
   vedle vyplněného „Uložit" čte oko jako slabší volbu, i když je to ta,
   po které se nic nevrátí. Bílý text na --c-bad-deep drží 8,9:1. */
.btn--danger {
  --btn-bg: var(--c-bad-deep);
  --btn-bg-hover: var(--c-bad);
  --btn-fg: var(--button-danger-text);
}

.btn--ghost { --btn-bg: transparent; --btn-bg-hover: var(--c-bg-card); }
/* Tiché tlačítko nemá obrys ani stín: patří do řádku vedle jiných
   prvků, kde by orámovaná tlačítka dělala plot. */
.btn--quiet {
  --btn-bg: transparent;
  --btn-bg-hover: var(--c-bg-active);
  --btn-line: transparent;
  --btn-fg: var(--c-text-muted);
  --btn-shadow: var(--shadow-none);
  padding-inline: var(--sp-3);
}
.btn--quiet:hover:not(:disabled),
.btn--quiet:active:not(:disabled) { --btn-fg: var(--c-text); translate: none; box-shadow: var(--shadow-none); }

.btn--sm { padding: var(--sp-2) var(--sp-3); font-size: var(--fs-sm); }
.btn--lg { padding: var(--sp-4) var(--sp-6); font-size: var(--fs-lg); border-radius: var(--r-lg); --btn-shadow: var(--shadow-md); --btn-press: var(--shadow-x-md); }
.btn--xl {
  padding: var(--sp-5) var(--sp-7);
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 900;
  border-radius: var(--r-lg);
  border-width: var(--border-w-heavy);
  --btn-shadow: var(--shadow-md);
  --btn-press: var(--shadow-x-md);
}

.btn--block { width: 100%; }

.btn__spinner {
  width: var(--icon-md);
  height: var(--icon-md);
  border: var(--border-w-strong) solid color-mix(in oklab, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: var(--r-full);
  animation: btn-spin var(--dur-spin) linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}

/* Kdo nechce pohyb, nedostane točící se kolečko. Stav ukládání nese
   `aria-busy` a kurzor, takže se informace neztratí. */
@media (prefers-reduced-motion: reduce) {
  .btn__spinner { animation: none; opacity: 0.6; }
}

/* Na dotyku musí i malé tlačítko nabídnout plochu, do které jde trefit. */
@media (pointer: coarse) {
  .btn--sm { min-height: var(--control-touch); padding-block: var(--sp-3); }
  .btn--quiet { min-height: var(--control-touch); }
}
</style>
