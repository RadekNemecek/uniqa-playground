<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import ImageField from './ImageField.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { BOOLEAN_LABELS, OPTION_COUNT, kindOf, quizOption } from '../options'
import type { QuizItem, QuizKind } from '../types'

const props = defineProps<{ item: QuizItem }>()
const promptEl = ref<HTMLTextAreaElement | null>(null)
const noteEl = ref<HTMLTextAreaElement | null>(null)
const slots = computed(() => Array.from({ length: OPTION_COUNT }, (_, i) => i))
const kind = computed(() => kindOf(props.item))
const kinds: { value: QuizKind; label: string }[] = [
  { value: 'choice', label: 'Čtyři možnosti' },
  { value: 'boolean', label: 'Ano, ne' },
]

function grow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Tvar i zachování rozepsaných možností odpovídají původnímu editoru.
function setKind(next: string | number): void {
  if (next !== 'choice' && next !== 'boolean') return
  if (kind.value === next) return
  props.item.kind = next
  if (next === 'boolean' && props.item.correctIndex > 1) props.item.correctIndex = 0
}

function setOption(i: number, value: string): void {
  const next = [...props.item.options]
  while (next.length < OPTION_COUNT) next.push('')
  next[i] = value
  props.item.options = next
}

function focusPrompt(): void { promptEl.value?.focus() }
defineExpose({ focusPrompt })
onMounted(async () => {
  await nextTick()
  grow(promptEl.value)
  grow(noteEl.value)
})
</script>

<template>
  <div class="item">
    <div class="item__kind">
      <p class="item__label">Tvar otázky</p>
      <UiSegmented :model-value="kind" :options="kinds" aria-label="Tvar otázky" @update:model-value="setKind" />
    </div>
    <UiField :label="kind === 'boolean' ? 'Znění tvrzení' : 'Znění otázky'" required hint="Tohle uvidí celá místnost.">
      <textarea ref="promptEl" v-model="item.prompt" rows="2" :placeholder="kind === 'boolean' ? 'Např. Povinné ručení kryje i škodu na vlastním voze.' : 'Např. Co kryje povinné ručení?'" @input="grow(promptEl)" />
    </UiField>

    <fieldset v-if="kind === 'boolean'" class="options">
      <legend>Platí to? Vyber správnou odpověď.</legend>
      <div class="boolean">
        <label v-for="(word, i) in BOOLEAN_LABELS" :key="word" class="boolean__option">
          <input type="radio" :name="`correct-${item.id}`" :checked="item.correctIndex === i" @change="item.correctIndex = i" />
          <span class="letter" :style="{ '--option-color': `var(${quizOption(i).color.cssVar})` }">{{ quizOption(i).letter }}</span>
          <strong>{{ word }}</strong>
          <UiIcon v-if="item.correctIndex === i" name="check" size="sm" />
        </label>
      </div>
      <p class="hint">ANO je vždy A, NE je B. Pořadí se ve hře nemíchá.</p>
    </fieldset>
    <fieldset v-else class="options">
      <legend>Možnosti · označ správnou</legend>
      <div v-for="i in slots" :key="i" class="option">
        <label class="option__radio">
          <input type="radio" :name="`correct-${item.id}`" :checked="item.correctIndex === i" :aria-label="`Správná je možnost ${quizOption(i).letter}`" @change="item.correctIndex = i" />
        </label>
        <span class="letter" :style="{ '--option-color': `var(${quizOption(i).color.cssVar})` }" aria-hidden="true">{{ quizOption(i).letter }}</span>
        <UiField :label="`Znění možnosti ${quizOption(i).letter}`" label-hidden>
          <input type="text" :value="item.options[i] ?? ''" :placeholder="`Možnost ${quizOption(i).letter}`" @input="setOption(i, ($event.target as HTMLInputElement).value)" />
        </UiField>
        <span class="option__correct">{{ item.correctIndex === i ? 'Správně' : '' }}</span>
      </div>
      <p class="hint">Pořadí možností se ve hře zamíchá.</p>
    </fieldset>

    <UiField label="Poučka (nepovinné)" hint="Ukáže se po odhalení odpovědi.">
      <textarea ref="noteEl" v-model="item.note" rows="2" placeholder="Co si mají hráči z odpovědi zapamatovat?" @input="grow(noteEl)" />
    </UiField>
    <details class="image" :open="!!item.imageId">
      <summary><UiIcon name="image" size="sm" /> {{ item.imageId ? 'Obrázek k otázce' : 'Přidat obrázek (nepovinné)' }}</summary>
      <ImageField :item="item" />
    </details>
  </div>
</template>

<style scoped>
.item { display: grid; gap: var(--sp-5); }
.item__kind { display: grid; gap: var(--sp-2); justify-items: start; }
.item__label { font-size: var(--fs-sm); color: var(--c-text-muted); font-weight: 700; }
.options { padding: 0; margin: 0; border: 0; min-width: 0; }
.options legend { font-weight: 700; font-size: var(--fs-sm); margin-bottom: var(--sp-3); }
.hint { font-size: var(--fs-sm); color: var(--c-text-faint); margin-top: var(--sp-3); }
.option { display: grid; grid-template-columns: var(--control-touch) var(--control-sm) minmax(0, 1fr) var(--sp-8); gap: var(--sp-2); align-items: center; margin-bottom: var(--sp-2); }
.option__radio { display: grid; place-items: center; min-height: var(--control-touch); cursor: pointer; }
.option__radio input, .boolean input { width: var(--control-check); height: var(--control-check); accent-color: var(--c-brand); margin: 0; flex: none; }
.letter { display: grid; place-items: center; background: var(--option-color); color: var(--c-text-ink); width: var(--control-sm); height: var(--control-sm); border-radius: var(--r-sm); font-weight: 900; }
.option__correct { color: var(--c-ok); font-size: var(--fs-xs); font-weight: 700; }
.boolean { display: flex; flex-wrap: wrap; gap: var(--sp-3); }
.boolean__option { display: flex; align-items: center; gap: var(--sp-3); min-height: var(--control-touch); padding: var(--sp-3); border: var(--border-w) solid var(--c-border-soft); cursor: pointer; }
.boolean__option:has(:checked) { border-color: var(--c-brand); background: var(--c-bg-active); }
.image { border-top: var(--border-w) solid var(--c-border-soft); }
.image summary { display: flex; align-items: center; gap: var(--sp-2); min-height: var(--control-touch); padding-block: var(--sp-3); cursor: pointer; color: var(--c-brand); font-size: var(--fs-sm); font-weight: 700; }
.image summary::after { content: '+'; margin-left: auto; }
.image[open] summary::after { content: '−'; }
@media (max-width: 560px) { .option { grid-template-columns: var(--control-touch) var(--control-sm) minmax(0, 1fr); } .option__correct { grid-column: 3; } .item__kind { justify-items: stretch; } }
@media (pointer: coarse) { .boolean__option { min-height: var(--control-touch); } }
</style>
