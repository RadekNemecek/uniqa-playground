<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import type { Segment } from '@/components/ui/segmented'
import { settings, SCALE_STEPS, scaleLabel } from '@/stores/settings'
import { playSample, primeAudio, sfx, type SoundSet } from '@/lib/sound'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function pickScale(v: number) {
  settings.scale = v
}

/**
 * Velikost ukázkového „A" roste se stupněm.
 *
 * Počítá se tady, ne v šabloně: prezentační konstanta zapsaná přímo do
 * `:style` obchází celou škálu a nikdo ji tam nenajde.
 */
function glyphSize(step: number): string {
  return `${0.7 + (step - 0.9) * 1.1}rem`
}

// Zvuk se po zapnutí ozve, aby bylo slyšet, co se právě zapnulo.
watch(
  () => settings.sound,
  (on) => {
    if (on) sfx.correct()
  },
)

const SOUND_SETS: Segment<SoundSet>[] = [
  { value: 'stul', label: 'Stůl' },
  { value: 'hala', label: 'Hala' },
]

/** Ukázka celé sady: otevření, hlasy, odhalení, body, konec času,
 *  stupně a vyhlášení. Nová ukázka zruší tu rozehranou. */
let sample: number[] = []
function listen(): void {
  sample.forEach((t) => window.clearTimeout(t))
  primeAudio()
  sample = playSample()
}
watch(() => settings.soundSet, () => {
  if (settings.sound) sfx.correct()
})
onBeforeUnmount(() => sample.forEach((t) => window.clearTimeout(t)))
</script>

<template>
  <UiModal :open="open" title="Nastavení" size="sm" @close="emit('close')">
    <div class="stack">
      <section>
        <h3 class="head">Velikost písma ve hře</h3>
        <p class="note">Zvětši, když promítáš do větší místnosti. Ovládání aplikace zůstane stejné.</p>
        <!-- radiogroup, ne pět nezávislých tlačítek: odečítač pak ohlásí
             jednu volbu z pěti, ne pětkrát „stisknuto". -->
        <div class="steps" role="radiogroup" aria-label="Velikost písma ve hře">
          <button
            v-for="s in SCALE_STEPS"
            :key="s"
            type="button"
            role="radio"
            class="step"
            :class="{ 'step--on': settings.scale === s }"
            :aria-checked="settings.scale === s"
            @click="pickScale(s)"
          >
            <span class="step__glyph" :style="{ fontSize: glyphSize(s) }">A</span>
            <span class="step__label">{{ scaleLabel(s) }}</span>
          </button>
        </div>
      </section>

      <section>
        <h3 class="head">Zvuk</h3>
        <UiSwitch
          v-model="settings.sound"
          label="Zvuková odezva"
          hint="Krátké zvuky při otevření otázky, odhalení, připsání bodů a vyhlášení."
        />
        <div v-if="settings.sound" class="sound-set">
          <UiSegmented v-model="settings.soundSet" :options="SOUND_SETS" aria-label="Sada zvuků" />
          <UiButton size="sm" icon="play" @click="listen">Poslechnout</UiButton>
        </div>
        <p v-if="settings.sound" class="note">
          Stůl jsou suché údery dřeva a marimby. Hala jsou měkčí tóny s dozvukem.
        </p>
      </section>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Hotovo</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.sound-set { display: flex; align-items: center; gap: var(--sp-3); margin-top: var(--sp-4); }
.sound-set :deep(.seg) { flex: 1; }
.sound-set + .note { margin-top: var(--sp-3); }
.head { font-size: var(--fs-md); margin-bottom: var(--sp-1); }
.note { font-size: var(--fs-sm); color: var(--c-text-faint); margin-bottom: var(--sp-3); }

.steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-2); }
.step {
  display: grid;
  gap: var(--sp-1);
  justify-items: center;
  padding: var(--sp-3) var(--sp-1);
  border: var(--border-w) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bg-field);
  color: var(--c-text-muted);
  transition: var(--tr-surface);
}
.step:hover { color: var(--c-text); box-shadow: var(--shadow-sm); }
.step--on {
  border-color: var(--c-border);
  color: var(--c-text);
  background: var(--c-brand-wash);
  box-shadow: var(--shadow-sm);
}
.step__glyph { font-family: var(--font-display); font-weight: 700; line-height: 1; }
.step__label { font-size: var(--fs-2xs); letter-spacing: 0.02em; }

@media (pointer: coarse) {
  .step { min-height: var(--control-touch); }
}
</style>
