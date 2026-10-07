<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { count } from '@/lib/format'
import { createDefaultForm, readyCount, reloadVyslechForms, vyslechForms } from '@/stores/vyslechForms'
import { minutesFor, freezeQuestions } from '../questions'
import type { VyslechForm, VyslechRunMeta } from '../types'

withDefaults(defineProps<{ busy?: boolean; shared?: boolean }>(), { busy: false, shared: true })
const emit = defineEmits<{ start: [form: VyslechForm, meta: VyslechRunMeta] }>()

/** Sady, ve kterých je aspoň jedna hotová otázka. */
const usable = computed(() => vyslechForms.forms.filter((f) => readyCount(f) > 0))

const LAST_FORM_KEY = 'playground.vyslech.form.v1'
const chosenId = ref(localStorage.getItem(LAST_FORM_KEY) ?? '')
const chosen = computed(() => usable.value.find((f) => f.id === chosenId.value) ?? null)

// Bez volby se vezme první sada. Obvykle je jediná a krok se jen potvrdí.
watch(
  usable,
  (list) => {
    if (!list.some((f) => f.id === chosenId.value)) chosenId.value = list[0]?.id ?? ''
  },
  { immediate: true },
)
watch(chosenId, (v) => {
  try {
    localStorage.setItem(LAST_FORM_KEY, v)
  } catch {
    /* soukromé okno */
  }
})

/**
 * Název školení je povinný. Bez něj je archiv seznam dat a srovnání
 * „které školení dopadlo líp" se nedá přečíst.
 */
const title = ref('')
const group = ref('')
const trainer = ref(localStorage.getItem('playground.vyslech.trainer.v1') ?? '')
watch(trainer, (v) => {
  try {
    localStorage.setItem('playground.vyslech.trainer.v1', v)
  } catch {
    /* soukromé okno */
  }
})
const tried = ref(false)
const titleError = computed(() => (tried.value && !title.value.trim() ? 'Bez názvu se výsledky nedají dohledat.' : ''))

const questions = computed(() => (chosen.value ? freezeQuestions(chosen.value) : []))
const minutes = computed(() => minutesFor(questions.value))
const canStart = computed(() => chosen.value !== null && title.value.trim().length > 0)

const creatingDefault = ref(false)
async function onCreateDefault(): Promise<void> {
  creatingDefault.value = true
  try {
    const form = await createDefaultForm()
    chosenId.value = form.id
  } finally {
    creatingDefault.value = false
  }
}

function start(): void {
  tried.value = true
  if (!canStart.value || !chosen.value) return
  emit('start', chosen.value, {
    title: title.value.trim(),
    group: group.value.trim(),
    trainer: trainer.value.trim(),
  })
}
</script>

<template>
  <main id="obsah" class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Výslech</p>
      <h1 class="setup__title">Zeptej se sálu.</h1>
      <p class="lead">Vyber otázky, pojmenuj školení a ukaž QR kód.</p>
    </header>

    <UiSkeleton v-if="!vyslechForms.loaded" :lines="5" />
    <UiEmpty v-else-if="vyslechForms.denied" title="Sady se nepodařilo načíst" text="Zkontroluj připojení a zkus to znovu.">
      <UiButton variant="brand" @click="reloadVyslechForms">Zkusit znovu</UiButton>
    </UiEmpty>
    <UiEmpty
      v-else-if="!usable.length"
      icon="chat"
      title="Zatím tu není žádná sada otázek"
      text="Připravená sada „Po školení“ má sedm otázek a vyplní se do dvou minut. Můžeš ji použít rovnou, nebo si ji upravit."
    >
      <UiButton variant="brand" :loading="creatingDefault" @click="onCreateDefault">Založit sadu Po školení</UiButton>
    </UiEmpty>

    <div v-else class="setup__grid">
      <form class="setup__form" novalidate @submit.prevent="start">
        <section class="section" aria-labelledby="vs-form">
          <div class="section__head">
            <h2 id="vs-form"><span class="section__num" aria-hidden="true">01</span> Na co se zeptáš</h2>
            <RouterLink to="/vyslech/sady" class="edit-link">Upravit sady</RouterLink>
          </div>
          <ul class="forms" role="radiogroup" aria-labelledby="vs-form">
            <li v-for="f in usable" :key="f.id">
              <label class="pick" :class="{ 'pick--on': f.id === chosenId }">
                <input v-model="chosenId" type="radio" name="vyslech-form" :value="f.id" />
                <span class="pick__text">
                  <strong>{{ f.name }}</strong>
                  <span class="hint">{{ count(readyCount(f), 'otázka', 'otázky', 'otázek') }}</span>
                </span>
              </label>
            </li>
          </ul>
          <ol v-if="questions.length" class="preview">
            <li v-for="q in questions" :key="q.id">{{ q.prompt }}</li>
          </ol>
        </section>

        <section class="section" aria-labelledby="vs-meta">
          <div class="section__head">
            <h2 id="vs-meta"><span class="section__num" aria-hidden="true">02</span> Jaké školení</h2>
          </div>
          <UiField label="Název školení" required :error="titleError" hint="Uvidí ho lidé nahoře v dotazníku a najdeš podle něj výsledky.">
            <input v-model="title" type="text" maxlength="80" placeholder="Např. Pojištění odpovědnosti pro začínající" />
          </UiField>
          <div class="pair">
            <UiField label="Skupina (nepovinné)">
              <input v-model="group" type="text" maxlength="60" placeholder="Např. Obchod Morava" />
            </UiField>
            <UiField label="Lektor/ka (nepovinné)">
              <input v-model="trainer" type="text" maxlength="60" placeholder="Jméno" />
            </UiField>
          </div>
          <p class="hint">Skupina a lektor se v dotazníku neukážou. Slouží k porovnání ve výsledcích.</p>
        </section>
        <button type="submit" class="vh" tabindex="-1">Vygenerovat QR kód</button>
      </form>

      <aside class="summary" aria-label="Shrnutí sběru">
        <p class="eyebrow">Tvůj sběr</p>
        <h2>{{ title.trim() || 'Bez názvu' }}</h2>
        <p class="summary__total" aria-live="polite">
          <strong>{{ questions.length }}</strong>
          <span>{{ questions.length === 1 ? 'otázka' : questions.length >= 2 && questions.length <= 4 ? 'otázky' : 'otázek' }} v dotazníku</span>
        </p>
        <dl>
          <dt>Sada</dt><dd>{{ chosen?.name ?? 'nevybraná' }}</dd>
          <dt>Vyplnění</dt><dd>asi {{ count(minutes, 'minuta', 'minuty', 'minut') }}</dd>
          <dt>Odpovědi</dt><dd>Anonymní</dd>
        </dl>
        <UiButton variant="brand" block :loading="busy" @click="start">Vygenerovat QR kód</UiButton>
        <p class="summary__next">
          {{ !title.trim() ? 'Doplň název školení.' : 'Na plátně se ukáže QR kód a počet odevzdaných dotazníků.' }}
        </p>
        <p v-if="!shared" class="summary__warn">
          Sdílená databáze teď není k dispozici. Dotazník půjde vyplnit jen v tomhle prohlížeči, telefony v sále se nepřipojí.
        </p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* Tvar je týž jako příprava obou her: číslované sekce v jednom sloupci
   a vpravo lepivé shrnutí s jediným hlavním tlačítkem. */
.setup { max-width: var(--content-reading); padding-block: var(--sp-6) var(--sp-8); }
.setup__head { margin-bottom: var(--sp-6); }
.setup__title { font-size: var(--fs-work-title); letter-spacing: -0.045em; margin-top: var(--sp-2); }
.lead { color: var(--c-text-muted); margin-top: var(--sp-3); font-size: var(--fs-md); }
.setup__grid { display: grid; grid-template-columns: minmax(0, 1fr) var(--content-sidebar); gap: var(--sp-7); align-items: start; }
.setup__form { display: grid; gap: var(--sp-8); min-width: 0; }
.section { display: grid; gap: var(--sp-4); }
.section__head { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: space-between; align-items: center; }
.section__head h2 { display: flex; align-items: baseline; gap: var(--sp-3); font-size: var(--fs-xl); }
.section__num {
  align-self: center;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  background: var(--c-ink);
  color: var(--c-on-ink);
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
  rotate: -4deg;
}
.edit-link { display: inline-flex; align-items: center; min-height: var(--control-touch); font-size: var(--fs-sm); font-weight: 700; }
.hint { font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--c-text-faint); }

.forms {
  list-style: none;
  padding: 0;
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.forms li + li { border-top: var(--border-w) solid var(--c-border-soft); }
.pick { display: flex; align-items: center; gap: var(--sp-3); min-height: var(--control-touch); padding: var(--sp-4); cursor: pointer; }
.pick input { flex: none; width: var(--control-check); height: var(--control-check); margin: 0; accent-color: var(--c-brand); }
.pick:hover { background: var(--c-brand-wash); }
.pick__text { display: grid; gap: var(--sp-1); overflow-wrap: anywhere; }

/* Otázky vybrané sady, aby bylo vidět, na co se sál bude ptát. */
.preview {
  display: grid;
  gap: var(--sp-2);
  margin: 0;
  padding-left: var(--sp-6);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
  line-height: var(--lh-snug);
}
.preview li::marker { font-weight: 900; color: var(--c-brand); font-variant-numeric: tabular-nums; }

.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sp-4); }

.summary {
  position: sticky; top: var(--sp-5); padding: var(--sp-5);
  border: var(--border-w-heavy) solid var(--c-border); border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-lg);
}
.summary .eyebrow { color: var(--c-text); }
.summary h2 { margin-top: var(--sp-2); font-size: var(--fs-xl); overflow-wrap: anywhere; }
.summary__total { display: grid; margin-block: var(--sp-5); }
.summary__total strong { font-size: var(--fs-work-number); font-weight: 900; line-height: var(--lh-tight); font-variant-numeric: tabular-nums; }
.summary__total span { font-size: var(--fs-sm); margin-top: var(--sp-2); }
.summary dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-3); margin-block: var(--sp-5); font-size: var(--fs-sm); }
.summary dd { margin: 0; font-weight: 700; text-align: right; overflow-wrap: anywhere; }
.summary__next { font-size: var(--fs-sm); margin-top: var(--sp-3); color: var(--c-text-muted); }
.summary__warn {
  margin-top: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w-strong) solid var(--c-border);
  border-radius: var(--r-md);
  background: var(--c-bad-fill);
  color: var(--c-text-ink);
  font-size: var(--fs-xs);
  line-height: var(--lh-body);
}

@media (max-width: 960px) { .setup__grid { gap: var(--sp-5); grid-template-columns: minmax(0, 1fr) minmax(0, .65fr); } .pair { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 720px) { .setup__grid { grid-template-columns: minmax(0, 1fr); } .summary { position: static; } .section__head h2 { font-size: var(--fs-lg); } }
</style>
