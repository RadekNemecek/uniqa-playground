<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@/types'
import UiField from '@/components/ui/UiField.vue'
import { formatScore } from '@/lib/teams'

const props = defineProps<{ question: Question; categoryName: string }>()

/** Na projektoru se dlouhá otázka zalomí do nečitelna. Prahy odpovídají
 *  velikostem, na které přepíná herní obrazovka. */
const promptWarning = computed(() => {
  const n = props.question.prompt.trim().length
  if (n > 260) return 'Hodně dlouhá otázka. Na projektoru bude drobná, zvaž zkrácení.'
  if (n > 160) return 'Delší otázka. Na plátně se zobrazí menším písmem.'
  return ''
})

const answerWarning = computed(() =>
  props.question.answer.trim().length > 140
    ? 'Dlouhá odpověď. Stačí klíčové znění, zbytek řekneš nahlas.'
    : '',
)
</script>

<template>
  <div class="qe">
    <header class="qe__head">
      <p class="eyebrow">{{ categoryName }}</p>
      <p class="qe__value">{{ formatScore(question.value) }}</p>
    </header>

    <UiField label="Otázka" hint="Uvidí ji celá místnost na plátně.">
      <textarea
        v-model="question.prompt"
        rows="4"
        placeholder="Například: Jak se odborně říká částce, kterou si klient hradí sám?"
      />
    </UiField>
    <p v-if="promptWarning" class="qe__warn">{{ promptWarning }}</p>

    <UiField label="Správná odpověď" hint="Odhalí se až na tvůj povel.">
      <textarea v-model="question.answer" rows="3" placeholder="Například: Spoluúčast" />
    </UiField>
    <p v-if="answerWarning" class="qe__warn">{{ answerWarning }}</p>

    <UiField label="Poznámka pro moderátora" hint="Nepovinné. Hráči ji nikdy neuvidí.">
      <textarea v-model="question.note" rows="2" placeholder="Doplňující vysvětlení, na co navázat" />
    </UiField>
  </div>
</template>

<style scoped>
.qe { display: grid; gap: var(--sp-4); }
.qe__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); }
.qe__value {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  color: var(--c-gold);
  font-variant-numeric: tabular-nums;
}
.qe__warn {
  margin-top: calc(var(--sp-3) * -1);
  font-size: var(--fs-xs);
  color: var(--c-gold);
  line-height: 1.5;
}
</style>
