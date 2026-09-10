<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import PackEditor from '@/components/admin/PackEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { db } from '@/lib/db'
import { downloadPack, readPackFile } from '@/lib/packIo'
import {
  createDemoPack,
  createPack,
  deletePack,
  duplicatePack,
  packProgress,
  packReadiness,
  packs,
  playableCategories,
  savePack,
} from '@/stores/packs'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'

const route = useRoute()
const router = useRouter()

const unlocked = ref(db().isUnlocked())
const fileInput = ref<HTMLInputElement | null>(null)

const passwordOpen = ref(false)
const currentPassword = ref('')
const nextPassword = ref('')
const nextRepeat = ref('')
const passwordError = ref('')
const passwordBusy = ref(false)

const currentId = computed(() => {
  const raw = route.query.pack
  return typeof raw === 'string' ? raw : ''
})

const current = computed(() => packs.packs.find((p) => p.id === currentId.value))

watch(
  [() => packs.packs, currentId],
  () => {
    if (!currentId.value) return
    if (!packs.packs.some((p) => p.id === currentId.value)) {
      void router.replace({ name: 'admin', query: {} })
    }
  },
)

function openPack(id: string) {
  void router.push({ name: 'admin', query: { pack: id } })
}

function closePack() {
  void router.push({ name: 'admin', query: {} })
}

async function onCreate() {
  const pack = await createPack()
  toast('Balíček založen. Pojmenuj ho a vyplň otázky.', 'ok')
  openPack(pack.id)
}

async function onDuplicate(id?: string) {
  const source = id ? packs.packs.find((p) => p.id === id) : current.value
  if (!source) return
  const copy = await duplicatePack(source)
  toast('Kopie vytvořena.', 'ok')
  openPack(copy.id)
}

async function onRemove(id?: string) {
  const target = id ? packs.packs.find((p) => p.id === id) : current.value
  if (!target) return
  const ok = await confirmAction({
    title: 'Smazat balíček',
    text: `Balíček „${target.name}" se smaže i se všemi otázkami. Vrátit to nejde.`,
    confirmLabel: 'Smazat balíček',
    danger: true,
  })
  if (!ok) return
  const name = target.name
  await deletePack(target.id)
  toast(`Balíček „${name}" smazán.`, 'ok')
  if (currentId.value === target.id) closePack()
}

async function onCreateDemo() {
  const pack = await createDemoPack()
  toast('Ukázkový balíček založen. Klidně ho přepiš vlastními otázkami.', 'ok')
  openPack(pack.id)
}

function onExport(id: string) {
  const pack = packs.packs.find((p) => p.id === id)
  if (!pack) return
  downloadPack(pack)
  toast('Balíček stažen jako JSON.', 'ok')
}

function triggerImport() {
  fileInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const pack = await readPackFile(file)
    await savePack(pack)
    toast(`Balíček „${pack.name}" importován.`, 'ok')
    openPack(pack.id)
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Import se nepovedl.', 'bad')
  }
}

function lock() {
  db().lock()
  unlocked.value = false
  closePack()
}

function openPassword() {
  currentPassword.value = ''
  nextPassword.value = ''
  nextRepeat.value = ''
  passwordError.value = ''
  passwordOpen.value = true
}

async function changePassword() {
  passwordError.value = ''
  if (nextPassword.value.trim().length < 4) {
    passwordError.value = 'Nové heslo musí mít aspoň čtyři znaky.'
    return
  }
  if (nextPassword.value !== nextRepeat.value) {
    passwordError.value = 'Nová hesla se neshodují.'
    return
  }
  passwordBusy.value = true
  try {
    await db().setPassword(nextPassword.value, currentPassword.value)
    passwordOpen.value = false
    toast('Heslo změněno. Zapiš si ho, obnovit ho nejde.', 'ok', 6000)
  } catch (e) {
    passwordError.value = e instanceof Error ? e.message : 'Heslo se nepodařilo změnit.'
  } finally {
    passwordBusy.value = false
  }
}

function readinessLabel(id: string): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  const pack = packs.packs.find((p) => p.id === id)
  if (!pack) return { text: '', tone: 'muted' }
  const readiness = packReadiness(pack)
  if (readiness === 'ready') {
    const n = playableCategories(pack).length
    const all = n === pack.categories.length
    return {
      text: all ? 'Připravený' : count(n, 'hratelná kategorie', 'hratelné kategorie', 'hratelných kategorií'),
      tone: 'ok',
    }
  }
  if (readiness === 'draft') return { text: 'Doplnit', tone: 'warn' }
  return { text: 'Prázdný', tone: 'muted' }
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
          <UiMenu label="Účet správy" v-slot="{ close }">
            <button type="button" role="menuitem" @click="openPassword(); close()">Změnit heslo</button>
            <button type="button" role="menuitem" @click="lock(); close()">Zamknout</button>
          </UiMenu>
        </template>
      </AppHeader>

      <main class="admin__body page">
        <!-- Knihovna -------------------------------------------------------- -->
        <section v-if="!current" class="library">
          <header class="library__head">
            <div>
              <h1 class="library__title">Balíčky otázek</h1>
              <p class="library__lead">
                Připrav desku před hrou. Hratelná je jen kategorie, která má vyplněné všechny otázky.
              </p>
            </div>
            <div class="library__actions">
              <UiButton size="sm" variant="ghost" @click="triggerImport">Importovat</UiButton>
              <UiButton size="sm" variant="brand" @click="onCreate">Nový</UiButton>
            </div>
          </header>

          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="library__file"
            @change="onImportFile"
          />

          <div v-if="packs.packs.length === 0" class="library__blank">
            <p class="library__empty">
              Zatím tu není žádný balíček. Založ prázdný tlačítkem Nový, naimportuj JSON,
              nebo si napřed prohlédni ukázku.
            </p>
            <UiButton size="sm" variant="ghost" @click="onCreateDemo">
              Vytvořit ukázkový balíček
            </UiButton>
          </div>

          <ul v-else class="library__items">
            <li v-for="p in packs.packs" :key="p.id" class="card">
              <button type="button" class="card__main" @click="openPack(p.id)">
                <span class="card__name">{{ p.name }}</span>
                <span
                  class="card__badge"
                  :class="`card__badge--${readinessLabel(p.id).tone}`"
                >
                  {{ readinessLabel(p.id).text }}
                </span>
                <span class="card__meta">
                  {{ packProgress(p).done }} z {{ packProgress(p).total }} otázek
                </span>
                <span class="card__bar" aria-hidden="true">
                  <span
                    :style="{
                      width: `${packProgress(p).total ? (packProgress(p).done / packProgress(p).total) * 100 : 0}%`,
                    }"
                  />
                </span>
              </button>

              <UiMenu label="Akce balíčku" v-slot="{ close }">
                <button type="button" role="menuitem" @click="openPack(p.id); close()">Otevřít</button>
                <button type="button" role="menuitem" @click="onDuplicate(p.id); close()">Duplikovat</button>
                <button type="button" role="menuitem" @click="onExport(p.id); close()">Exportovat JSON</button>
                <hr />
                <button type="button" role="menuitem" class="danger" @click="onRemove(p.id); close()">Smazat</button>
              </UiMenu>
            </li>
          </ul>
        </section>

        <!-- Editor ---------------------------------------------------------- -->
        <PackEditor
          v-else
          :key="current.id"
          :pack="current"
          @duplicate="onDuplicate()"
          @remove="onRemove()"
          @back="closePack"
        />
      </main>
    </template>

    <UiModal :open="passwordOpen" title="Změnit heslo" size="sm" @close="passwordOpen = false">
      <form class="pw" @submit.prevent="changePassword">
        <UiField label="Současné heslo">
          <input v-model="currentPassword" type="password" autocomplete="current-password" required />
        </UiField>
        <UiField label="Nové heslo">
          <input v-model="nextPassword" type="password" autocomplete="new-password" required />
        </UiField>
        <UiField label="Nové heslo znovu">
          <input v-model="nextRepeat" type="password" autocomplete="new-password" required />
        </UiField>
        <p v-if="passwordError" class="pw__error" role="alert">{{ passwordError }}</p>
      </form>
      <template #footer>
        <UiButton size="sm" variant="ghost" @click="passwordOpen = false">Zrušit</UiButton>
        <UiButton size="sm" variant="brand" :disabled="passwordBusy" @click="changePassword">
          Uložit heslo
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.admin { min-height: 100dvh; display: flex; flex-direction: column; }

.admin__body {
  flex: 1;
  padding-block: var(--sp-4) var(--sp-8);
}

.library { display: grid; gap: var(--sp-5); align-content: start; max-width: 40rem; }
.library__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
}
.library__title { font-size: var(--fs-2xl); }
.library__lead {
  margin-top: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--c-text-muted);
  line-height: var(--lh-body);
  max-width: 28rem;
}
.library__actions { display: flex; gap: var(--sp-2); }
.library__file { display: none; }
.library__blank { display: grid; gap: var(--sp-3); max-width: 28rem; }
.library__empty { font-size: var(--fs-sm); color: var(--c-text-faint); line-height: var(--lh-body); }

.library__items {
  list-style: none;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
}

.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sp-2);
  align-items: stretch;
  padding: var(--sp-2);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.card:hover { border-color: var(--c-surface-3); }

.card__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name badge'
    'meta meta'
    'bar bar';
  gap: var(--sp-1) var(--sp-3);
  text-align: left;
  padding: var(--sp-2) var(--sp-3);
  border: 0;
  border-radius: var(--r-md);
  background: transparent;
  color: var(--c-text);
}
.card__main:hover { background: color-mix(in oklab, var(--c-brand) 7%, transparent); }
.card__name {
  grid-area: name;
  font-weight: 700;
  font-size: var(--fs-md);
}
.card__badge {
  grid-area: badge;
  align-self: start;
  padding: 2px var(--sp-2);
  border-radius: var(--r-full);
  font-size: var(--fs-xs);
  font-weight: 700;
  background: var(--c-surface-2);
  color: var(--c-text-faint);
}
.card__badge--ok { background: color-mix(in oklab, var(--c-ok) 22%, transparent); color: var(--c-ok); }
.card__badge--warn { background: color-mix(in oklab, var(--c-brand) 18%, transparent); color: var(--c-brand); }
.card__meta {
  grid-area: meta;
  font-size: var(--fs-xs);
  color: var(--c-text-faint);
}
.card__bar {
  grid-area: bar;
  display: block;
  height: 3px;
  border-radius: var(--r-full);
  background: var(--c-sunken);
  overflow: hidden;
  margin-top: var(--sp-1);
}
.card__bar span {
  display: block;
  height: 100%;
  background: var(--c-brand);
  transition: width var(--dur-slow) var(--ease-out);
}

.pw { display: grid; gap: var(--sp-4); }
.pw__error { color: var(--c-bad); font-size: var(--fs-sm); font-weight: 600; }

@media (pointer: coarse) {
  .card__main { min-height: 2.75rem; }
}
</style>
