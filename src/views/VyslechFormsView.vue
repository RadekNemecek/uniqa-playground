<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AdminGate from '@/components/admin/AdminGate.vue'
import FormEditor from '@/vyslech/components/FormEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { db } from '@/lib/db'
import { count } from '@/lib/format'
import {
  createDefaultForm,
  createEmptyForm,
  deleteForm,
  duplicateForm,
  initVyslechForms,
  readyCount,
  reloadVyslechForms,
  vyslechForms,
} from '@/stores/vyslechForms'
import { confirmAction, toast } from '@/stores/ui'

/**
 * Sady otázek Výslechu. Tvar je týž jako knihovna balíčků kvízu:
 * nadpis, linkovaný seznam a na řádku nabídka akcí.
 */
const route = useRoute()
const router = useRouter()
const unlocked = ref(db().isUnlocked())
const creating = ref(false)
const editor = ref<InstanceType<typeof FormEditor> | null>(null)

async function onUnlocked(): Promise<void> {
  unlocked.value = true
  await reloadVyslechForms()
}

onMounted(() => {
  if (unlocked.value) void initVyslechForms()
})

const currentId = computed(() => (typeof route.query.sada === 'string' ? route.query.sada : ''))
const current = computed(() => vyslechForms.forms.find((f) => f.id === currentId.value))

// Smazaná sada nesmí nechat viset otevřený editor.
watch([() => vyslechForms.forms, currentId], () => {
  if (currentId.value && vyslechForms.loaded && !current.value) {
    void router.replace({ name: 'vyslech-sady', query: {} })
  }
})

function openForm(id: string): void {
  void router.push({ name: 'vyslech-sady', query: { sada: id } })
}

function closeForm(): void {
  void router.push({ name: 'vyslech-sady', query: {} })
}

async function onCreate(): Promise<void> {
  if (creating.value) return
  creating.value = true
  try {
    const form = await createEmptyForm()
    openForm(form.id)
  } catch {
    toast('Sadu se nepodařilo založit. Zkus to znovu.', 'bad')
  } finally {
    creating.value = false
  }
}

async function onCreateDefault(): Promise<void> {
  try {
    const form = await createDefaultForm()
    toast('Sada Po školení je připravená.', 'ok')
    openForm(form.id)
  } catch {
    toast('Sadu se nepodařilo založit. Zkus to znovu.', 'bad')
  }
}

async function onDuplicate(id?: string): Promise<void> {
  const source = vyslechForms.forms.find((f) => f.id === (id ?? currentId.value))
  if (!source) return
  if (editor.value && !(await editor.value.flush())) return
  const copy = await duplicateForm(source)
  toast('Kopie vytvořena.', 'ok')
  openForm(copy.id)
}

async function onRemove(id?: string): Promise<void> {
  const target = vyslechForms.forms.find((f) => f.id === (id ?? currentId.value))
  if (!target) return
  const ok = await confirmAction({
    title: 'Smazat sadu',
    text: `Sada „${target.name}" se smaže. Výsledky školení, na kterých se použila, zůstanou.`,
    confirmLabel: 'Smazat sadu',
    danger: true,
  })
  if (!ok) return
  await deleteForm(target.id)
  toast(`Sada „${target.name}" smazána.`, 'ok')
  if (currentId.value === target.id) closeForm()
}

async function lock(): Promise<void> {
  if (editor.value && !(await editor.value.flush())) return
  db().lock()
  unlocked.value = false
  closeForm()
}
</script>

<template>
  <div class="page-wrap">
    <template v-if="!unlocked">
      <AppHeader game="vyslech" section="questions" prep />
      <AdminGate title="Výslech" lead="Sady otázek upravuje jen ten, kdo zná heslo do správy." @unlocked="onUnlocked" />
    </template>

    <template v-else>
      <AppHeader game="vyslech" section="questions" prep>
        <template #tools>
          <!-- Jediná akce účtu, proto rovnou tlačítko, ne nabídka s jednou položkou. -->
          <UiIconButton icon="lock" label="Zamknout Výslech" @click="lock" />
        </template>
      </AppHeader>

      <main id="obsah" class="body page">
        <section v-if="!current" class="list">
          <header class="list__head">
            <div>
              <p class="eyebrow">Výslech</p>
              <h1 class="list__title">Sady otázek.</h1>
              <p class="list__lead">Na co se sál po školení ptá. Obvykle stačí jedna sada pořád dokola, výsledky se pak dají srovnávat.</p>
            </div>
            <UiButton size="sm" variant="brand" :loading="creating" @click="onCreate">Nová sada</UiButton>
          </header>

          <UiSkeleton v-if="!vyslechForms.loaded" :lines="4" />
          <UiEmpty v-else-if="vyslechForms.unavailable" icon="warning" title="Sady teď nejdou načíst" text="Nepodařilo se spojit se sdílenou databází." />
          <UiEmpty v-else-if="vyslechForms.denied" title="Sady se nepodařilo načíst" text="Zkontroluj připojení a zkus to znovu.">
            <UiButton variant="brand" @click="reloadVyslechForms">Zkusit znovu</UiButton>
          </UiEmpty>
          <UiEmpty
            v-else-if="vyslechForms.forms.length === 0"
            icon="chat"
            title="Zatím tu není žádná sada"
            text="Založ si připravenou sadu Po školení, nebo začni od prázdné."
          >
            <UiButton size="sm" variant="ghost" @click="onCreateDefault">Založit sadu Po školení</UiButton>
          </UiEmpty>

          <ul v-else class="items">
            <li v-for="(f, i) in vyslechForms.forms" :key="f.id" class="card">
              <span class="card__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <button type="button" class="card__main" @click="openForm(f.id)">
                <span class="card__name">{{ f.name }}</span>
                <span class="card__meta">
                  {{ count(readyCount(f), 'hotová otázka', 'hotové otázky', 'hotových otázek') }}
                  <template v-if="readyCount(f) < f.questions.length"> · {{ f.questions.length - readyCount(f) }} rozepsané</template>
                </span>
              </button>
              <UiMenu :label="`Akce sady ${f.name}`" v-slot="{ close }">
                <button type="button" role="menuitem" @click="openForm(f.id); close()">Otevřít</button>
                <button type="button" role="menuitem" @click="void onDuplicate(f.id); close()">Duplikovat</button>
                <hr />
                <button type="button" role="menuitem" class="danger" @click="void onRemove(f.id); close()">Smazat</button>
              </UiMenu>
            </li>
          </ul>
        </section>

        <FormEditor
          v-else
          ref="editor"
          :key="current.id"
          :form="current"
          @back="closeForm"
          @duplicate="onDuplicate()"
          @remove="onRemove()"
        />
      </main>
    </template>
  </div>
</template>

<style scoped>
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { padding-block: var(--sp-6) var(--sp-8); }
.list { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.list__head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--sp-5); }
.list__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.list__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }
.items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.card__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.card__main { display: grid; gap: var(--sp-2); padding: var(--sp-2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); text-align: left; }
.card__main:hover { background: var(--c-bg-active); }
.card__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.card__meta { font-size: var(--fs-sm); color: var(--c-text-muted); }
@media (max-width: 720px) { .card { gap: var(--sp-3); } .card__name { font-size: var(--fs-lg); } }
@media (pointer: coarse) { .card__main { min-height: var(--control-touch); } }
</style>
