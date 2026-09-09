<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Question } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { formatScore } from '@/lib/teams'

const props = defineProps<{
  question: Question
  categoryName: string
  position: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  remaining: number
  saveState: 'idle' | 'saving' | 'saved'
}>()

const emit = defineEmits<{ prev: []; next: []; nextEmpty: []; close: [] }>()

const promptEl = ref<HTMLTextAreaElement | null>(null)
const answerEl = ref<HTMLTextAreaElement | null>(null)
const noteOpen = ref(false)
const previewOpen = ref(false)

/** Textové pole roste s obsahem, ať není potřeba scrollovat uvnitř políčka. */
function grow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 420)}px`
}

function growAll(): void {
  grow(promptEl.value)
  grow(answerEl.value)
}

watch(
  () => props.question.id,
  async () => {
    noteOpen.value = !!props.question.note
    await nextTick()
    growAll()
    promptEl.value?.focus()
    promptEl.value?.setSelectionRange(props.question.prompt.length, props.question.prompt.length)
  },
  { immediate: true },
)

const ready = computed(
  () => props.question.prompt.trim().length > 0 && props.question.answer.trim().length > 0,
)

/** Na plátně se dlouhá otázka zmenší. Prahy odpovídají herní obrazovce. */
const promptNote = computed(() => {
  const n = props.question.prompt.trim().length
  if (n > 260) return { tone: 'warn', text: 'Hodně dlouhá otázka. Na plátně bude drobná, zvaž zkrácení.' }
  if (n > 160) return { tone: 'info', text: 'Delší otázka, na plátně se zobrazí menším písmem.' }
  return null
})

const answerNote = computed(() =>
  props.question.answer.trim().length > 140
    ? 'Dlouhá odpověď. Stačí klíčové znění, zbytek řekneš nahlas.'
    : '',
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    if (props.remaining > 0) emit('nextEmpty')
    else emit('next')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="qe">
    <header class="qe__head">
      <div class="qe__id">
        <p class="qe__cat">{{ categoryName || 'Bez názvu' }}</p>
        <p class="qe__value">{{ formatScore(question.value) }}</p>
      </div>

      <div class="qe__nav">
        <span class="qe__pos">{{ position }} z {{ total }}</span>
        <button type="button" :disabled="!hasPrev" aria-label="Předchozí otázka" @click="emit('prev')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <button type="button" :disabled="!hasNext" aria-label="Další otázka" @click="emit('next')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 5 7 7-7 7" /></svg>
        </button>
        <button type="button" class="qe__close" aria-label="Zavřít editor" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </header>

    <div class="qe__body">
      <label class="f">
        <span class="f__label">
          Otázka
          <em>uvidí ji celá místnost</em>
        </span>
        <textarea
          ref="promptEl"
          v-model="question.prompt"
          rows="3"
          placeholder="Např. Jak se odborně říká částce, kterou si klient hradí z každé pojistné události sám?"
          @input="grow(promptEl)"
        />
        <span v-if="promptNote" class="f__note" :class="`f__note--${promptNote.tone}`">
          {{ promptNote.text }}
        </span>
      </label>

      <label class="f">
        <span class="f__label">
          Správná odpověď
          <em>odhalí se až na tvůj povel</em>
        </span>
        <textarea
          ref="answerEl"
          v-model="question.answer"
          rows="2"
          placeholder="Např. Spoluúčast"
          @input="grow(answerEl)"
        />
        <span v-if="answerNote" class="f__note f__note--info">{{ answerNote }}</span>
      </label>

      <div class="extras">
        <button type="button" class="toggle" :aria-expanded="noteOpen" @click="noteOpen = !noteOpen">
          <span class="toggle__sign" aria-hidden="true">{{ noteOpen ? '−' : '+' }}</span>
          Poznámka pro moderátora
          <em v-if="!noteOpen && question.note" class="toggle__dot" aria-hidden="true"></em>
        </button>
        <label v-if="noteOpen" class="f f--tight">
          <textarea
            v-model="question.note"
            rows="2"
            placeholder="Např. čím odpověď doplnit, na co navázat. Hráči to nikdy neuvidí."
          />
        </label>

        <button type="button" class="toggle" :aria-expanded="previewOpen" @click="previewOpen = !previewOpen">
          <span class="toggle__sign" aria-hidden="true">{{ previewOpen ? '−' : '+' }}</span>
          Náhled na plátně
        </button>
        <div v-if="previewOpen" class="preview">
          <p class="preview__prompt">{{ question.prompt || 'Sem přijde otázka' }}</p>
          <p class="preview__answer">{{ question.answer || 'Sem přijde odpověď' }}</p>
        </div>
      </div>
    </div>

    <footer class="qe__foot">
      <p class="qe__state" :data-state="saveState">
        <span v-if="saveState === 'saving'">Ukládám…</span>
        <span v-else-if="saveState === 'saved'" class="qe__saved">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          Uloženo
        </span>
        <span v-else-if="!ready">Chybí otázka nebo odpověď</span>
      </p>

      <div class="qe__actions">
        <UiButton size="sm" variant="ghost" @click="emit('close')">Zavřít</UiButton>
        <UiButton v-if="remaining > 0" size="sm" variant="gold" @click="emit('nextEmpty')">
          Další nevyplněná
        </UiButton>
        <UiButton v-else-if="hasNext" size="sm" variant="gold" @click="emit('next')">
          Další otázka
        </UiButton>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.qe { display: flex; flex-direction: column; min-height: 0; }

/* Hlavička ---------------------------------------------------------------- */
.qe__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--c-line-soft);
}
.qe__cat {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-muted);
}
.qe__value {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  line-height: 1.1;
  color: var(--c-gold);
  font-variant-numeric: tabular-nums;
}

.qe__nav { display: flex; align-items: center; gap: var(--sp-1); }
.qe__pos {
  margin-right: var(--sp-2);
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
  font-variant-numeric: tabular-nums;
}
.qe__nav button {
  display: grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  transition: all var(--dur-fast) var(--ease-out);
}
.qe__nav button:hover:not(:disabled) { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface-2); }
.qe__nav button:disabled { opacity: 0.3; cursor: not-allowed; }
.qe__close { margin-left: var(--sp-2); }
.qe__close:hover { color: var(--c-bad) !important; border-color: color-mix(in oklab, var(--c-bad) 45%, transparent) !important; }

/* Tělo -------------------------------------------------------------------- */
.qe__body { display: grid; gap: var(--sp-4); padding: var(--sp-5); overflow-y: auto; }

.f { display: grid; gap: var(--sp-2); }
.f--tight { margin-top: calc(var(--sp-1) * -1); }
.f__label {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text);
}
.f__label em { font-style: normal; font-size: var(--fs-xs); font-weight: 500; color: var(--c-text-faint); }

.f textarea {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-abyss);
  color: var(--c-text);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  resize: none;
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.f textarea:hover { border-color: var(--c-surface-3); }
.f textarea:focus { border-color: var(--c-gold); outline: none; }
.f textarea::placeholder { color: var(--c-text-faint); }

.f__note { font-size: var(--fs-xs); line-height: 1.5; }
.f__note--info { color: var(--c-text-faint); }
.f__note--warn { color: var(--c-gold); }

/* Rozbalovací části -------------------------------------------------------- */
.extras { display: grid; gap: var(--sp-3); }
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  justify-self: start;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.toggle:hover { color: var(--c-text); }
.toggle__sign {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-sm);
  font-size: var(--fs-sm);
  line-height: 1;
}
.toggle__dot { width: 6px; height: 6px; border-radius: var(--r-full); background: var(--c-gold); }

.preview {
  display: grid;
  gap: var(--sp-3);
  padding: var(--sp-5) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, var(--c-surface) 0%, var(--c-abyss) 100%);
  text-align: center;
}
.preview__prompt {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: 700;
  line-height: var(--lh-snug);
  text-wrap: balance;
}
.preview__answer {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid color-mix(in oklab, var(--c-ok) 40%, transparent);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-ok) 9%, transparent);
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 700;
  text-wrap: balance;
}

/* Patička ----------------------------------------------------------------- */
.qe__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid var(--c-line-soft);
  background: color-mix(in oklab, var(--c-abyss) 40%, transparent);
}
.qe__state { font-size: var(--fs-xs); color: var(--c-text-faint); }
.qe__saved { display: inline-flex; align-items: center; gap: var(--sp-1); color: var(--c-ok); }
.qe__actions { display: flex; gap: var(--sp-2); }
</style>
