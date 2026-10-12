<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import PackEditor from '@/components/admin/PackEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiMenu from '@/components/ui/UiMenu.vue'
import {
  createDemoPack,
  createPack,
  deletePack,
  duplicatePack,
  packProgress,
  packReadiness,
  packs,
  playableCategories,
} from '@/stores/packs'
import { confirmAction, toast } from '@/stores/ui'
import { count } from '@/lib/format'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'

const route = useRoute()
const router = useRouter()

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
    <AppHeader game="pojistuj" section="questions" prep />

    <main id="obsah" class="admin__body page page-sheet">
      <!-- Knihovna -------------------------------------------------------- -->
      <section v-if="!current" class="library">
        <header class="library__head">
          <div>
            <p class="eyebrow">Knihovna týmu</p>
            <h1 class="library__title">Otázky na desku.</h1>
            <p class="library__lead">
              Balíčky pro hru Pojišťuj! Hratelná je jen kategorie, která má
              vyplněné všechny otázky.
            </p>
          </div>
          <div class="library__actions">
            <UiButton size="sm" variant="brand" @click="onCreate">Nový balíček</UiButton>
          </div>
        </header>

        <!-- Dokud data nedorazila, není pravda, že tu nic není. Na pomalé
             síti se tady dřív ukázalo „Zatím tu není žádný balíček"
             i s tlačítkem na založení ukázky, a dalo se na něj kliknout
             dřív, než dorazily skutečné balíčky. -->
        <UiSkeleton v-if="!packs.loaded" :lines="4" />

        <UiEmpty
          v-else-if="packs.packs.length === 0"
          icon="info"
          title="Zatím tu není žádný balíček"
          text="Založ prázdný tlačítkem Nový balíček, nebo si napřed prohlédni ukázku."
        >
          <UiButton size="sm" variant="ghost" @click="onCreateDemo">
            Vytvořit ukázkový balíček
          </UiButton>
        </UiEmpty>

        <ul v-else class="library__items">
          <li v-for="(p, i) in packs.packs" :key="p.id" class="card">
            <span class="card__index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <button type="button" class="card__main" @click="openPack(p.id)">
              <span class="card__name">{{ p.name }}</span>
              <span class="card__badge" :class="`card__badge--${readinessLabel(p.id).tone}`">
                {{ readinessLabel(p.id).text }}
              </span>
              <span class="card__meta">
                {{ packProgress(p).done }} z {{ packProgress(p).total }} otázek hotových
              </span>
              <span v-if="packProgress(p).done < packProgress(p).total" class="card__remaining">
                Zbývá doplnit {{ count(packProgress(p).total - packProgress(p).done, 'otázku', 'otázky', 'otázek') }}
              </span>
            </button>

            <UiMenu :label="`Akce balíčku ${p.name}`" v-slot="{ close }">
              <button type="button" role="menuitem" @click="openPack(p.id); close()">Otevřít</button>
              <button type="button" role="menuitem" @click="onDuplicate(p.id); close()">Duplikovat</button>
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
  </div>
</template>

<style scoped>
/* Týž tvar jako knihovna kvízu: nadpis, pod ním linkovaný seznam
   a na každém řádku nabídka akcí. Obě hry se spravují stejně, takže
   se to nemá lišit. */
.admin { min-height: 100dvh; display: flex; flex-direction: column; }
.admin__body { flex: 1; padding-block: var(--sp-6) var(--sp-8); }

.library { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.library__head { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--sp-5); }
.library__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.library__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); color: var(--c-text-muted); font-size: var(--fs-sm); line-height: var(--lh-body); }
.library__actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; }

.library__items { list-style: none; padding: 0; border-top: var(--border-w-strong) solid var(--c-text); }
.card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--sp-5); align-items: center; padding-block: var(--sp-5); border-bottom: var(--border-w) solid var(--c-border-soft); }
.card__index { color: var(--c-brand); font-size: var(--fs-sm); font-weight: 900; font-variant-numeric: tabular-nums; }
.card__main { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--sp-2) var(--sp-4); padding: var(--sp-2); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--c-text); text-align: left; }
.card__main:hover { background: var(--c-bg-active); }
.card__name { font-size: var(--fs-xl); font-weight: 900; overflow-wrap: anywhere; }
.card__meta { grid-column: 1; font-size: var(--fs-sm); color: var(--c-text-muted); }
.card__remaining { grid-column: 1 / -1; font-size: var(--fs-sm); }
.card__badge { align-self: center; font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-muted); }
.card__badge--ok { color: var(--c-ok); }


@media (max-width: 720px) {
  .card { gap: var(--sp-3); }
  .card__main { grid-template-columns: minmax(0, 1fr); }
  .card__badge { grid-row: 3; }
  .card__name { font-size: var(--fs-lg); }
}
@media (pointer: coarse) { .card__main { min-height: var(--control-touch); } }
</style>
