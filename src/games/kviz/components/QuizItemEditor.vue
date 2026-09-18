<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ImageField from './ImageField.vue'
import { BOOLEAN_LABELS, OPTION_COUNT, kindOf, quizOption } from '../options'
import type { QuizItem, QuizKind } from '../types'

const props = defineProps<{ item: QuizItem }>()
const emit = defineEmits<{ remove: []; collapse: [] }>()

const promptEl = ref<HTMLTextAreaElement | null>(null)
const noteEl = ref<HTMLTextAreaElement | null>(null)

/** Textové pole roste s obsahem, ať není potřeba scrollovat uvnitř políčka. */
function grow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 360)}px`
}

const slots = computed(() => Array.from({ length: OPTION_COUNT }, (_, i) => i))

const kind = computed(() => kindOf(props.item))

/**
 * Přepnutí tvaru otázky. Napsané možnosti se nemažou: tvrzení je nečte
 * a přepnutí zpátky je vrátí i s textem. Mění se jen správná odpověď,
 * u tvrzení jsou na výběr dvě.
 */
function setKind(next: QuizKind): void {
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

/** Na plátně se dlouhá otázka zmenší. Prahy odpovídají herní obrazovce. */
const promptNote = computed(() => {
  const n = props.item.prompt.trim().length
  if (n > 220) return 'Hodně dlouhá otázka. Na plátně bude drobná, zvaž zkrácení.'
  if (n > 140) return 'Delší otázka, na plátně se zobrazí menším písmem.'
  return ''
})

const longest = computed(() =>
  props.item.options.reduce((n, o) => Math.max(n, o.trim().length), 0),
)

onMounted(async () => {
  await nextTick()
  grow(promptEl.value)
  grow(noteEl.value)
  promptEl.value?.focus()
})

watch(() => props.item.id, async () => {
  await nextTick()
  grow(promptEl.value)
  grow(noteEl.value)
})
</script>

<template>
  <div class="item">
    <header class="item__head">
      <div class="kinds" role="group" aria-label="Tvar otázky">
        <button
          type="button"
          class="kinds__pick"
          :class="{ 'kinds__pick--on': kind === 'choice' }"
          :aria-pressed="kind === 'choice'"
          @click="setKind('choice')"
        >
          Čtyři možnosti
        </button>
        <button
          type="button"
          class="kinds__pick"
          :class="{ 'kinds__pick--on': kind === 'boolean' }"
          :aria-pressed="kind === 'boolean'"
          @click="setKind('boolean')"
        >
          Pravda, nepravda
        </button>
      </div>

      <div class="item__tools">
        <button type="button" class="tool" @click="emit('collapse')">Sbalit</button>
        <button type="button" class="tool tool--danger" @click="emit('remove')">Smazat</button>
      </div>
    </header>

    <label class="f">
      <span class="f__label">
        {{ kind === 'boolean' ? 'Tvrzení' : 'Otázka' }}
        <em>uvidí ho celá místnost</em>
      </span>
      <textarea
        ref="promptEl"
        v-model="item.prompt"
        rows="2"
        :placeholder="
          kind === 'boolean'
            ? 'Např. Povinné ručení kryje i škodu na vlastním voze.'
            : 'Např. Co kryje povinné ručení?'
        "
        @input="grow(promptEl)"
      />
      <span v-if="promptNote" class="f__note">{{ promptNote }}</span>
    </label>

    <ImageField :item="item" />

    <fieldset v-if="kind === 'boolean'" class="opts">
      <legend class="f__label">
        Platí to? <em>vyber, co je správně</em>
      </legend>

      <div class="two">
        <button
          v-for="(word, i) in BOOLEAN_LABELS"
          :key="word"
          type="button"
          class="two__pick"
          :class="{ 'two__pick--on': item.correctIndex === i }"
          :aria-pressed="item.correctIndex === i"
          :style="{ '--tint': `var(${quizOption(i).color.cssVar})` }"
          @click="item.correctIndex = i"
        >
          <span class="two__letter" aria-hidden="true">{{ quizOption(i).letter }}</span>
          {{ word }}
        </button>
      </div>

      <p class="f__note">
        Na telefonu jsou dvě tlačítka se slovy, Pravda je vždycky A. Pořadí
        se u tvrzení nemíchá, aby hráč po druhé otázce věděl, kam sáhnout.
      </p>
    </fieldset>

    <fieldset v-else class="opts">
      <legend class="f__label">
        Možnosti <em>tečku dej té správné</em>
      </legend>

      <div v-for="i in slots" :key="i" class="opt" :class="{ 'opt--on': item.correctIndex === i }">
        <label class="opt__radio">
          <input
            type="radio"
            :name="`correct-${item.id}`"
            :checked="item.correctIndex === i"
            :aria-label="`Správná je možnost ${quizOption(i).letter}`"
            @change="item.correctIndex = i"
          />
          <span class="opt__dot" aria-hidden="true"></span>
        </label>

        <span class="opt__letter" :style="{ color: `var(${quizOption(i).color.cssVar})` }" aria-hidden="true">
          {{ quizOption(i).letter }}
        </span>

        <input
          type="text"
          class="opt__text"
          :value="item.options[i] ?? ''"
          :aria-label="`Znění možnosti ${quizOption(i).letter}`"
          :placeholder="`Možnost ${quizOption(i).letter}`"
          @input="setOption(i, ($event.target as HTMLInputElement).value)"
        />
      </div>

      <p v-if="longest > 90" class="f__note">
        Dlouhé možnosti. Na plátně se čtou čtyři naráz, zkus je zkrátit.
      </p>
      <p class="f__note">Pořadí možností se ve hře zamíchá, tady na něm nezáleží.</p>
    </fieldset>

    <label class="f">
      <span class="f__label">Poučka <em>nepovinné, ukáže se po odhalení</em></span>
      <textarea
        ref="noteEl"
        v-model="item.note"
        rows="2"
        placeholder="Např. Povinné ručení kryje škodu způsobenou někomu jinému, nikdy vlastní vůz viníka."
        @input="grow(noteEl)"
      />
    </label>
  </div>
</template>

<style scoped>
.item { display: grid; gap: var(--sp-4); padding: var(--sp-5); }

.item__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sp-3); }

/* Tvar otázky. Přepínač je vlevo nahoře, protože rozhoduje o tom, co
   je pod ním, a autorka ho volí dřív než cokoli jiného. */
.kinds { display: inline-flex; padding: 2px; border: 1px solid var(--c-line); border-radius: var(--r-md); background: var(--c-sunken); }
.kinds__pick {
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-faint);
  font-size: var(--fs-xs);
  font-weight: 700;
  transition: var(--tr-surface);
}
.kinds__pick:hover { color: var(--c-text); }
.kinds__pick--on { background: var(--c-surface-2); color: var(--c-text); }

/* Pravda a nepravda. Nese je barva i písmeno, stejně jako na telefonu,
   aby se editor a hra shodly na tom, co je A. */
.two { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.two__pick {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text-muted);
  font-weight: 700;
  transition: var(--tr-surface);
}
.two__pick:hover { color: var(--c-text); border-color: var(--c-surface-3); }
.two__letter { font-family: var(--font-display); font-weight: 900; color: var(--tint); }
/* Zvolená není poznat jen barvou: má plnou plochu a tmavý text na ní. */
.two__pick--on {
  border-color: var(--tint);
  background: var(--tint);
  color: var(--c-text-ink);
}
.two__pick--on .two__letter { color: var(--c-text-ink); }
.item__tools { display: flex; gap: var(--sp-2); }
.tool {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-xs);
  font-weight: 600;
  transition: var(--tr-surface);
}
.tool:hover { color: var(--c-text); border-color: var(--c-surface-3); background: var(--c-surface-2); }
.tool--danger:hover {
  color: var(--c-bad);
  border-color: color-mix(in oklab, var(--c-bad) 45%, transparent);
}

.f { display: grid; gap: var(--sp-2); }
.f__label {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  padding: 0;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text);
}
.f__label em { font-style: normal; font-size: var(--fs-xs); font-weight: 500; color: var(--c-text-faint); }
.f__note { font-size: var(--fs-xs); line-height: 1.5; color: var(--c-text-faint); }

.f textarea,
.opt__text {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  color: var(--c-text);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.f textarea { resize: none; overflow: hidden; }
.f textarea:hover,
.opt__text:hover { border-color: var(--c-surface-3); }
/* Rámeček se obarví navíc, prstenec se neruší: zaměření je vidět vždy. */
.f textarea:focus,
.opt__text:focus { border-color: var(--c-brand); }
.f textarea::placeholder,
.opt__text::placeholder { color: var(--c-text-faint); }

/* Možnosti ----------------------------------------------------------------- */
.opts { display: grid; gap: var(--sp-2); border: 0; padding: 0; margin: 0; }
.opt { display: flex; align-items: center; gap: var(--sp-2); }

.opt__radio { flex: none; display: grid; place-items: center; cursor: pointer; }
.opt__radio input { position: absolute; opacity: 0; width: 0; height: 0; }
.opt__dot {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
  border: 2px solid var(--c-line);
  border-radius: var(--r-full);
  transition: var(--tr-surface);
}
.opt__radio:hover .opt__dot { border-color: var(--c-surface-3); }
.opt__radio input:focus-visible + .opt__dot { outline: var(--focus-ring-w) solid var(--focus-ring-c); outline-offset: var(--focus-ring-offset); }
.opt--on .opt__dot {
  border-color: var(--c-ok);
  background: radial-gradient(circle, var(--c-ok) 0 45%, transparent 46%);
}

.opt__letter {
  flex: none;
  width: 1.1rem;
  text-align: center;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 900;
}

/* Správná možnost je vidět i bez barvy: má puntík a silnější rámeček. */
.opt--on .opt__text { border-color: color-mix(in oklab, var(--c-ok) 55%, transparent); }

@media (pointer: coarse) {
  .tool { min-height: var(--control-touch); }
  .kinds__pick,
  .two__pick { min-height: var(--control-touch); }
  .opt__dot { width: 1.5rem; height: 1.5rem; }
  .opt__radio { min-width: var(--control-touch); min-height: var(--control-touch); }
}
</style>
