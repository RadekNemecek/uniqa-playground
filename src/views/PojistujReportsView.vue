<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import RunHistory from '@/games/pojistuj/components/RunHistory.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { db } from '@/lib/db'
import { confirmAction, toast } from '@/stores/ui'
import type { PojistujRun } from '@/games/pojistuj/runLog'

/**
 * Výsledky odehraných her desky.
 *
 * Vlastní záložka jako u kvízu. Dřív visel archiv pod knihovnou balíčků,
 * ležel jen v prohlížeči notebooku a kolegyně z týmu ho neviděla.
 */
const loaded = ref(false)
/** Načtení selhalo. Jiný stav než prázdný seznam, viz výsledky kvízu. */
const failed = ref(false)
const runs = ref<PojistujRun[]>([])
/** Bez sdílené databáze leží výsledky jen v tomhle prohlížeči. */
const localOnly = db().kind === 'local'

async function loadRuns(): Promise<void> {
  failed.value = false
  try {
    runs.value = await db().listRuns()
  } catch (e) {
    console.error('Čtení odehraných her selhalo:', e)
    failed.value = true
  } finally {
    loaded.value = true
  }
}

async function removeRun(run: PojistujRun): Promise<void> {
  const ok = await confirmAction({
    title: 'Smazat záznam',
    text: `Hra ${run.groupName || run.packName} z ${new Date(run.finishedAt).toLocaleDateString('cs-CZ')} zmizí z výsledků. Vrátit to nejde.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  try {
    await db().deleteRun(run.id)
    runs.value = runs.value.filter((r) => r.id !== run.id)
    toast('Záznam smazán.', 'ok')
  } catch (e) {
    console.error('Smazání odehrané hry selhalo:', e)
    toast('Smazat se nepovedlo. Zkontroluj připojení.', 'bad')
  }
}

onMounted(() => {
  void loadRuns()
})
</script>

<template>
  <div class="page-wrap">
    <AppHeader game="pojistuj" section="reports" prep />

    <main id="obsah" class="body page page-sheet">
      <section class="list">
        <header class="list__head">
          <p class="eyebrow">Pojišťuj!</p>
          <h1 class="list__title">Odehrané hry.</h1>
          <p class="list__lead">
            Jak která skupina dopadla a která kategorie jí dala nejvíc zabrat.
            Řádek rozklikneš do skóre týmů a kategorií.
            <template v-if="localOnly"> Bez připojení k týmu se ukládají jen na tomhle počítači.</template>
          </p>
        </header>

        <!-- Dokud data nedorazila, není pravda, že tu nic není. -->
        <UiSkeleton v-if="!loaded" :lines="4" />

        <UiEmpty
          v-else-if="failed"
          icon="warning"
          title="Výsledky se nepodařilo načíst"
          text="Zkontroluj připojení a zkus to znovu."
        >
          <UiButton variant="brand" @click="loaded = false; loadRuns()">Zkusit znovu</UiButton>
        </UiEmpty>

        <UiEmpty
          v-else-if="runs.length === 0"
          icon="clock"
          title="Zatím žádná odehraná hra"
          text="Po dohrané desce se sem zapíše skóre týmů a kategorie, které dělaly potíže."
        />

        <RunHistory v-else :runs="runs" @remove="removeRun" />
      </section>
    </main>
  </div>
</template>

<style scoped>
/* Týž tvar jako výsledky kvízu. */
.page-wrap { min-height: 100dvh; display: flex; flex-direction: column; }
.body { padding-block: var(--sp-6) var(--sp-8); }

.list { display: grid; gap: var(--sp-6); max-width: var(--content-reading); margin-inline: auto; width: 100%; }
.list__title { font-size: var(--fs-work-title); margin-top: var(--sp-2); }
.list__lead { margin-top: var(--sp-3); max-width: var(--content-narrow); font-size: var(--fs-sm); color: var(--c-text-muted); line-height: var(--lh-body); }
</style>
