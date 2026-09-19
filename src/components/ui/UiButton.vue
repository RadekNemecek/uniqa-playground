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
  </button>
</template>

<style scoped>
.btn {
  --btn-bg: var(--c-bg-raised);
  --btn-fg: var(--c-text);
  --btn-line: var(--c-border);
  --btn-bg-hover: var(--c-bg-active);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border: var(--border-w) solid var(--btn-line);
  border-radius: var(--r-md);
  background: var(--btn-bg);
  color: var(--btn-fg);
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-align: center;
  transition:
    background var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-instant) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

/* Hover mění plochu, ne filtr přes celé tlačítko. `brightness()` rozjasní
   i stín pod gradientovými variantami, takže tlačítko na chvíli ztratí
   hmotu. */
.btn:hover:not(:disabled) { background: var(--btn-bg-hover); border-color: var(--c-bg-active); }
.btn:active:not(:disabled) { transform: translateY(1px) scale(0.995); }
.btn:disabled { opacity: 0.42; }
/* Během ukládání nemá kurzor slibovat, že se dá kliknout. */
.btn--loading { cursor: progress; opacity: 1; }

.btn--brand {
  --btn-bg: linear-gradient(180deg, var(--c-brand) 0%, var(--c-brand-deep) 100%);
  --btn-bg-hover: linear-gradient(180deg, var(--c-brand-soft) 0%, var(--c-brand) 100%);
  --btn-fg: var(--c-on-accent);
  --btn-line: transparent;
  box-shadow: 0 6px 20px -8px var(--c-brand-glow);
}

.btn--spark {
  --btn-bg: linear-gradient(180deg, var(--c-spark) 0%, var(--c-spark-mid) 100%);
  --btn-bg-hover: linear-gradient(180deg, var(--c-spark) 0%, var(--c-spark) 100%);
  --btn-fg: var(--c-text-ink);
  --btn-line: transparent;
  box-shadow: 0 6px 22px -8px var(--c-spark-glow);
}

.btn--ok {
  --btn-bg: linear-gradient(180deg, var(--c-ok) 0%, var(--c-ok-deep) 100%);
  --btn-bg-hover: linear-gradient(180deg, var(--c-ok) 0%, var(--c-ok) 100%);
  --btn-fg: var(--c-on-accent);
  --btn-line: transparent;
}

/* Destruktivní akce má mít stejnou váhu jako potvrzovací. Prázdný obrys
   vedle vyplněného „Uložit" čte oko jako slabší volbu, i když je to ta,
   po které se nic nevrátí.

   Plocha je plná, ne přechod: tmavý text na --c-bad drží 8,1:1, ale na
   --c-bad-deep spadne na 3,0:1, takže spodek přechodu by text pohltil. */
.btn--danger {
  --btn-bg: var(--c-bad);
  --btn-bg-hover: color-mix(in oklab, var(--c-bad) 85%, var(--c-bad-deep));  /* 7,0:1 */
  --btn-fg: var(--c-text-ink);
  --btn-line: transparent;
}

.btn--ghost { --btn-bg: transparent; --btn-bg-hover: var(--c-bg-card); --btn-line: var(--c-border); }
.btn--quiet {
  --btn-bg: transparent;
  --btn-bg-hover: color-mix(in oklab, var(--c-bg-raised) 70%, transparent);
  --btn-line: transparent;
  --btn-fg: var(--c-text-muted);
  padding-inline: var(--sp-3);
}
.btn--quiet:hover:not(:disabled) { --btn-fg: var(--c-text); border-color: transparent; }

.btn--sm { padding: var(--sp-2) var(--sp-3); font-size: var(--fs-sm); }
.btn--lg { padding: var(--sp-4) var(--sp-6); font-size: var(--fs-lg); border-radius: var(--r-lg); }
.btn--xl {
  padding: var(--sp-5) var(--sp-7);
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 700;
  border-radius: var(--r-lg);
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
