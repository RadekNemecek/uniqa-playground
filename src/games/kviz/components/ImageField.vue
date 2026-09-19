<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import { IMAGE_ACCEPT, imageSizeLabel, prepareQuizImage } from '../image'
import { cachedImage, loadImage, putImage, removeImage } from '@/stores/quizImages'
import { confirmAction, toast } from '@/stores/ui'
import type { QuizItem } from '../types'

/**
 * Obrázek k otázce.
 *
 * Tři cesty dovnitř, protože každá je někdy ta nejrychlejší: výběr
 * souboru, přetažení a vložení ze schránky. Poslední jmenovaná je u výřezů
 * z interních systémů zdaleka nejčastější, a bez ní by se screenshot
 * musel nejdřív ukládat na disk.
 */
const props = defineProps<{ item: QuizItem }>()

const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const dragging = ref(false)

const image = computed(() => cachedImage(props.item.imageId))
const loading = computed(() => Boolean(props.item.imageId) && image.value === undefined)
const missing = computed(() => Boolean(props.item.imageId) && image.value === null)

function pick(): void {
  fileInput.value?.click()
}

async function onPick(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await accept(file)
}

async function accept(file: File): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    const next = await prepareQuizImage(file)
    await putImage(next)
    const previous = props.item.imageId
    props.item.imageId = next.id
    // Až po úspěšném uložení nového: kdyby zápis selhal, otázka pořád má
    // ten starý a nepřijde o nic.
    if (previous) await removeImage(previous)
    if (file.type === 'image/gif') {
      toast('Z animovaného GIFu zůstal první snímek.', 'info')
    } else {
      toast('Obrázek přidán.', 'ok')
    }
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Obrázek se nepodařilo přidat.', 'bad')
  } finally {
    busy.value = false
  }
}

async function drop(): Promise<void> {
  const target = props.item.imageId
  if (!target) return
  const ok = await confirmAction({
    title: 'Odebrat obrázek',
    text: 'Obrázek se odebere z otázky. Vrátit to nejde, ale nahrát znovu ano.',
    confirmLabel: 'Odebrat',
    danger: true,
  })
  if (!ok) return
  props.item.imageId = undefined
  await removeImage(target)
  toast('Obrázek odebrán.', 'ok')
}

/* --- Přetažení ------------------------------------------------------------ */

function onDragOver(event: DragEvent): void {
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = 'copy'
  dragging.value = true
}

async function onDrop(event: DragEvent): Promise<void> {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) await accept(file)
}

/* --- Vložení ze schránky --------------------------------------------------- */

/**
 * Ctrl+V kdekoli v otevřené otázce. Textová pole si vložení řeší sama,
 * takže se jim do něj neplete; jinde v editoru je obrázek to jediné,
 * co by vkládání mohlo znamenat.
 */
async function onPaste(event: ClipboardEvent): Promise<void> {
  const target = event.target as HTMLElement | null
  const tag = target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
  const file = Array.from(event.clipboardData?.files ?? [])[0]
  if (!file) return
  event.preventDefault()
  await accept(file)
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
  if (props.item.imageId) void loadImage(props.item.imageId)
})
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

watch(
  () => props.item.imageId,
  (next) => {
    if (next) void loadImage(next)
  },
)
</script>

<template>
  <div class="img">
    <p class="img__label">
      Obrázek <em>nepovinný, ukáže se na plátně s otázkou</em>
    </p>

    <input
      ref="fileInput"
      type="file"
      :accept="IMAGE_ACCEPT"
      class="img__file"
      @change="onPick"
    />

    <div
      class="img__zone"
      :class="{ 'img__zone--over': dragging, 'img__zone--busy': busy }"
      @dragover.prevent="onDragOver"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="image">
        <img class="img__thumb" :src="image.data" alt="" />
        <div class="img__meta">
          <p class="img__size">{{ image.w }} krát {{ image.h }} px, {{ imageSizeLabel(image.bytes) }}</p>
          <div class="img__tools">
            <UiButton size="sm" variant="ghost" :loading="busy" @click="pick">Vyměnit</UiButton>
            <UiButton size="sm" variant="danger" :disabled="busy" @click="drop">Odebrat</UiButton>
          </div>
        </div>
      </template>

      <p v-else-if="loading" class="img__state">Načítám obrázek…</p>

      <template v-else-if="missing">
        <p class="img__state img__state--bad">
          Obrázek se nenačetl. Zkontroluj připojení, nebo nahraj nový.
        </p>
        <UiButton size="sm" variant="ghost" :loading="busy" @click="pick">Nahrát jiný</UiButton>
      </template>

      <div v-else class="img__add">
        <UiButton size="sm" variant="ghost" icon="image" :loading="busy" @click="pick">Přidat obrázek</UiButton>
        <span class="img__add-hint">Přetáhni sem soubor nebo vlož ze schránky</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.img { display: grid; gap: var(--sp-2); }
.img__label {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text);
}
.img__label em { font-style: normal; font-size: var(--fs-xs); font-weight: 400; color: var(--c-text-faint); }

.img__file { display: none; }

.img__zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3);
  border: var(--border-w) dashed var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
  transition: var(--tr-surface);
}
.img__zone--over { border-color: var(--c-brand); background: color-mix(in oklab, var(--c-brand) 12%, transparent); }
.img__zone--busy { opacity: 0.7; }

/* Náhled sedí na světlé ploše, aby průhledné i tmavé obrázky byly vidět
   stejně jako na plátně, kde mají bílý podklad. */
.img__thumb {
  flex: none;
  width: var(--image-preview-w);
  height: var(--field-textarea-min);
  border-radius: var(--r-sm);
  background: var(--c-photo-mat);
  object-fit: contain;
}

.img__meta { display: grid; gap: var(--sp-2); min-width: 0; }
.img__size { font-size: var(--fs-xs); color: var(--c-text-faint); font-variant-numeric: tabular-nums; }
.img__tools { display: flex; flex-wrap: wrap; gap: var(--sp-2); }

.img__state { font-size: var(--fs-sm); color: var(--c-text-muted); }
.img__state--bad { color: var(--c-bad); }

.img__add {
  display: grid;
  justify-items: start;
  gap: var(--sp-1);
  width: 100%;
  padding: var(--sp-3);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  text-align: left;
  transition: var(--tr-surface);
}
.img__add-hint { font-size: var(--fs-xs); color: var(--c-text-faint); }

</style>
