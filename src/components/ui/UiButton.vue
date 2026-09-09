<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'gold' | 'spark' | 'ghost' | 'quiet' | 'danger' | 'ok'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', block: false, disabled: false, type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]"
  >
    <span class="btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.btn {
  --btn-bg: var(--c-surface-2);
  --btn-fg: var(--c-text);
  --btn-line: var(--c-line);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border: 1px solid var(--btn-line);
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
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-instant) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.btn:hover:not(:disabled) { border-color: var(--c-surface-3); filter: brightness(1.12); }
.btn:active:not(:disabled) { transform: translateY(1px) scale(0.995); }
.btn:disabled { opacity: 0.42; }

.btn--primary { --btn-bg: var(--c-surface-2); --btn-line: var(--c-line); }

.btn--gold {
  --btn-bg: linear-gradient(180deg, var(--c-gold) 0%, var(--c-gold-deep) 100%);
  --btn-fg: var(--c-text-ink);
  --btn-line: transparent;
  box-shadow: 0 6px 20px -8px var(--c-gold-glow);
}

.btn--spark {
  --btn-bg: linear-gradient(180deg, var(--c-spark) 0%, var(--c-spark-deep) 100%);
  --btn-fg: var(--c-text-ink);
  --btn-line: transparent;
  box-shadow: 0 6px 22px -8px var(--c-spark-glow);
}

.btn--ok {
  --btn-bg: linear-gradient(180deg, var(--c-ok) 0%, var(--c-ok-deep) 100%);
  --btn-fg: #04220F;
  --btn-line: transparent;
}

.btn--danger {
  --btn-bg: transparent;
  --btn-fg: var(--c-bad);
  --btn-line: color-mix(in oklab, var(--c-bad) 45%, transparent);
}
.btn--danger:hover:not(:disabled) { --btn-bg: color-mix(in oklab, var(--c-bad) 14%, transparent); }

.btn--ghost { --btn-bg: transparent; --btn-line: var(--c-line); }
.btn--quiet {
  --btn-bg: transparent;
  --btn-line: transparent;
  --btn-fg: var(--c-text-muted);
  padding-inline: var(--sp-3);
}
.btn--quiet:hover:not(:disabled) { --btn-fg: var(--c-text); }

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
</style>
