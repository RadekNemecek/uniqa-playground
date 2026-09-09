<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import PackEditor from '@/components/admin/PackEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { db } from '@/lib/db'
import {
  createDemoPack,
  createPack,
  deletePack,
  duplicatePack,
  packProgress,
  packs,
  playableCategories,
} from '@/stores/packs'
import { toast } from '@/stores/ui'

const unlocked = ref(db().isUnlocked())
const currentId = ref<string>('')

const current = computed(() => packs.packs.find((p) => p.id === currentId.value))

watch(
  () => packs.packs,
  (list) => {
    if (!currentId.value || !list.some((p) => p.id === currentId.value)) {
      currentId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true, deep: true },
)

async function onCreate() {
  const pack = await createPack()
  currentId.value = pack.id
  toast('Balíček založen. Pojmenuj ho a vyplň otázky.', 'ok')
}

async function onDuplicate() {
  if (!current.value) return
  const copy = await duplicatePack(current.value)
  currentId.value = copy.id
  toast('Kopie vytvořena.', 'ok')
}

async function onRemove() {
  if (!current.value) return
  const name = current.value.name
  await deletePack(current.value.id)
  toast(`Balíček „${name}" smazán.`, 'ok')
}

async function onCreateDemo() {
  const pack = await createDemoPack()
  currentId.value = pack.id
  toast('Ukázkový balíček založen. Klidně ho přepiš vlastními otázkami.', 'ok')
}

function lock() {
  db().lock()
  unlocked.value = false
}
</script>

<template>
  <div class="admin">
    <template v-if="!unlocked">
      <AppHeader />
      <AdminGate @unlocked="unlocked = true" />
    </template>

    <template v-else>
      <AppHeader>
        <template #tools>
          <UiButton size="sm" variant="quiet" @click="lock">Zamknout</UiButton>
        </template>
      </AppHeader>

      <main class="admin__body page">
        <aside class="list">
          <div class="list__head">
            <h2 class="list__title">Balíčky</h2>
            <UiButton size="sm" variant="brand" @click="onCreate">Nový</UiButton>
          </div>

          <div v-if="packs.packs.length === 0" class="list__blank">
            <p class="list__empty">
              Zatím tu není žádný balíček. Založ prázdný tlačítkem Nový, nebo si
              napřed prohlédni ukázku.
            </p>
            <UiButton size="sm" variant="ghost" block @click="onCreateDemo">
              Vytvořit ukázkový balíček
            </UiButton>
          </div>

          <ul v-else class="list__items">
            <li v-for="p in packs.packs" :key="p.id">
              <button
                type="button"
                class="item"
                :class="{ 'item--on': p.id === currentId }"
                :aria-current="p.id === currentId"
                @click="currentId = p.id"
              >
                <span class="item__name">{{ p.name }}</span>
                <span class="item__meta">
                  {{ packProgress(p).done }} z {{ packProgress(p).total }} otázek,
                  {{ playableCategories(p).length }} hratelných kategorií
                </span>
                <span class="item__bar" aria-hidden="true">
                  <span
                    :style="{
                      width: `${packProgress(p).total ? (packProgress(p).done / packProgress(p).total) * 100 : 0}%`,
                    }"
                  />
                </span>
              </button>
            </li>
          </ul>
        </aside>

        <section class="editor">
          <PackEditor
            v-if="current"
            :key="current.id"
            :pack="current"
            @duplicate="onDuplicate"
            @remove="onRemove"
          />
          <p v-else class="editor__empty">Vyber nebo založ balíček.</p>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.admin { min-height: 100dvh; display: flex; flex-direction: column; }

.admin__body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
  padding-block: var(--sp-4) var(--sp-8);
}

.list {
  display: grid;
  gap: var(--sp-3);
  align-content: start;
  position: sticky;
  top: var(--sp-4);
}
.list__head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.list__title { font-size: var(--fs-lg); }
.list__blank { display: grid; gap: var(--sp-3); }
.list__empty { font-size: var(--fs-sm); color: var(--c-text-faint); line-height: var(--lh-body); }
.list__items { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }

.item {
  width: 100%;
  display: grid;
  gap: var(--sp-1);
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  color: var(--c-text);
  transition: all var(--dur-fast) var(--ease-out);
}
.item:hover { border-color: var(--c-surface-3); }
.item--on { border-color: var(--c-brand); background: color-mix(in oklab, var(--c-brand) 9%, var(--c-surface)); }
.item__name { font-weight: 600; }
.item__meta { font-size: var(--fs-xs); color: var(--c-text-faint); line-height: 1.4; }
.item__bar { display: block; height: 3px; border-radius: var(--r-full); background: var(--c-sunken); overflow: hidden; margin-top: var(--sp-1); }
.item__bar span {
  display: block;
  height: 100%;
  background: var(--c-brand);
  transition: width var(--dur-slow) var(--ease-out);
}

.editor { min-width: 0; }
.editor__empty { color: var(--c-text-faint); padding: var(--sp-7); text-align: center; }

@media (max-width: 900px) {
  .admin__body { grid-template-columns: minmax(0, 1fr); }
  .list { position: static; }
}
</style>
