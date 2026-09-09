<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { settings, SCALE_STEPS, scaleLabel } from '@/stores/settings'
import { sfx } from '@/lib/sound'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function pickScale(v: number) {
  settings.scale = v
}

function toggleSound() {
  settings.sound = !settings.sound
  if (settings.sound) sfx.correct()
}
</script>

<template>
  <UiModal :open="open" title="Nastavení" size="sm" @close="emit('close')">
    <div class="stack">
      <section>
        <h3 class="head">Velikost písma ve hře</h3>
        <p class="note">Zvětši, když promítáš do větší místnosti. Ovládání aplikace zůstane stejné.</p>
        <div class="steps">
          <button
            v-for="s in SCALE_STEPS"
            :key="s"
            type="button"
            class="step"
            :class="{ 'step--on': settings.scale === s }"
            :aria-pressed="settings.scale === s"
            @click="pickScale(s)"
          >
            <span class="step__glyph" :style="{ fontSize: `${0.7 + (s - 0.9) * 1.1}rem` }">A</span>
            <span class="step__label">{{ scaleLabel(s) }}</span>
          </button>
        </div>
      </section>

      <section>
        <h3 class="head">Zvuk</h3>
        <p class="note">Krátké tóny při otevření otázky a připsání bodů.</p>
        <UiButton :variant="settings.sound ? 'brand' : 'ghost'" block @click="toggleSound">
          {{ settings.sound ? 'Zvuk zapnutý' : 'Zvuk vypnutý' }}
        </UiButton>
      </section>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Hotovo</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.head { font-size: var(--fs-md); margin-bottom: var(--sp-1); }
.note { font-size: var(--fs-sm); color: var(--c-text-faint); margin-bottom: var(--sp-3); }

.steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-2); }
.step {
  display: grid;
  gap: var(--sp-1);
  justify-items: center;
  padding: var(--sp-3) var(--sp-1);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text-muted);
  transition: all var(--dur-fast) var(--ease-out);
}
.step:hover { border-color: var(--c-surface-3); color: var(--c-text); }
.step--on { border-color: var(--c-brand); color: var(--c-text); background: color-mix(in oklab, var(--c-brand) 12%, transparent); }
.step__glyph { font-family: var(--font-display); font-weight: 700; line-height: 1; }
.step__label { font-size: 0.625rem; letter-spacing: 0.02em; }
</style>
