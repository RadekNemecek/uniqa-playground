<script setup lang="ts">
import { ref } from 'vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import { listRuns, deleteRun, weakest, type PojistujRun } from '@/games/pojistuj/runLog'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { whenAgo } from '@/lib/format'
import { confirmAction } from '@/stores/ui'

/**
 * Přehled odehraných her.
 *
 * Co si z toho odnese školitelka: kdy se hrálo, s kým, jak to dopadlo
 * a kterou kategorii tým nejvíc protrpěl. To poslední je důvod, proč
 * archiv vůbec existuje.
 */
const runs = ref<PojistujRun[]>(listRuns())
const open = ref<string | null>(null)

async function remove(run: PojistujRun): Promise<void> {
  const ok = await confirmAction({
    title: 'Smazat záznam',
    text: `Hra ${run.groupName || run.packName} z ${new Date(run.finishedAt).toLocaleDateString('cs-CZ')} zmizí z přehledu.`,
    confirmLabel: 'Smazat',
    danger: true,
  })
  if (!ok) return
  deleteRun(run.id)
  runs.value = listRuns()
}

function rate(run: PojistujRun): number {
  const won = run.categories.reduce((n, c) => n + c.won, 0)
  const lost = run.categories.reduce((n, c) => n + c.lost, 0)
  return won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100)
}
</script>

<template>
  <section class="hist">
    <header class="hist__head">
      <h2 class="hist__title">Odehrané hry</h2>
      <p class="hist__lead">Ukládá se na tomhle počítači, posledních padesát her.</p>
    </header>

    <UiEmpty
      v-if="runs.length === 0"
      icon="clock"
      title="Zatím žádná odehraná hra"
      text="Po dohrané desce se sem zapíše skóre týmů a kategorie, které dělaly potíže."
    />

    <ul v-else class="runs">
      <li v-for="run in runs" :key="run.id" class="run">
        <button
          type="button"
          class="run__main"
          :aria-expanded="open === run.id"
          @click="open = open === run.id ? null : run.id"
        >
          <span class="run__when">{{ whenAgo(run.finishedAt) }}</span>
          <span v-fit-text class="run__name">{{ run.groupName || 'Bez názvu skupiny' }}</span>
          <span v-fit-text class="run__pack">{{ run.packName }}</span>
          <span class="run__rate">{{ rate(run) }} % uhodnuto</span>
        </button>

        <UiIconButton
          icon="trash"
          size="sm"
          variant="danger"
          :label="`Smazat záznam ${run.groupName || run.packName}`"
          @click="remove(run)"
        />

        <div v-if="open === run.id" class="detail">
          <ol class="detail__teams">
            <li
              v-for="(t, i) in run.teams"
              :key="t.name + i"
              class="detail__team"
              :style="{ '--team': `var(${teamColor(t.color).cssVar})` }"
            >
              <span class="detail__badge">{{ teamBadge(i) }}</span>
              <span v-fit-text class="detail__teamName">{{ t.name }}</span>
              <span class="detail__score">{{ formatScore(t.score) }}</span>
            </li>
          </ol>

          <div class="detail__cats">
            <p v-if="weakest(run)" class="detail__weak">
              Nejhůř dopadla kategorie <strong>{{ weakest(run)!.name }}</strong>.
            </p>
            <ul class="cats">
              <li v-for="c in run.categories" :key="c.name" class="cat">
                <span v-fit-text class="cat__name">{{ c.name }}</span>
                <span class="cat__bar" aria-hidden="true">
                  <span
                    class="cat__fill"
                    :style="{ width: `${c.won + c.lost ? (c.won / (c.won + c.lost)) * 100 : 0}%` }"
                  ></span>
                </span>
                <span class="cat__n">{{ c.won }} / {{ c.won + c.lost }}</span>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hist { display: grid; gap: var(--sp-4); margin-top: var(--sp-8); }
.hist__head { display: grid; gap: var(--sp-1); }
.hist__title { font-size: var(--fs-xl); }
.hist__lead { font-size: var(--fs-sm); color: var(--c-text-faint); }

.runs { display: grid; gap: var(--sp-2); list-style: none; padding: 0; }
.run {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w) solid var(--c-border-soft);
  border-radius: var(--r-md);
  background: var(--c-bg-card);
}
.run__main {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.run__when { font-size: var(--fs-xs); color: var(--c-text-faint); }
.run__name { font-weight: 700; font-size: calc(1em * var(--fit-text, 1)); }
.run__pack { font-size: calc(var(--fs-sm) * var(--fit-text, 1)); color: var(--c-text-muted); }
.run__rate { font-size: var(--fs-sm); color: var(--c-text-muted); white-space: nowrap; }

.detail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: var(--sp-5);
  padding: var(--sp-4) var(--sp-3) var(--sp-2);
  border-top: var(--border-w) solid var(--c-border-soft);
}
.detail__teams { display: grid; gap: var(--sp-2); list-style: none; padding: 0; }
.detail__team { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); }
.detail__badge {
  display: grid;
  place-items: center;
  width: var(--control-xs);
  height: var(--control-xs);
  border-radius: var(--r-sm);
  background: var(--team);
  color: var(--c-text-ink);
  font-weight: 900;
  font-size: var(--fs-xs);
}
.detail__teamName { flex: 1 1 auto; font-size: calc(1em * var(--fit-text, 1)); }
.detail__score { font-weight: 700; font-variant-numeric: tabular-nums; }

.detail__weak { font-size: var(--fs-sm); color: var(--c-text-muted); margin-bottom: var(--sp-3); }
.cats { display: grid; gap: var(--sp-1); list-style: none; padding: 0; }
.cat {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6rem auto;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-xs);
}
.cat__name { font-size: calc(1em * var(--fit-text, 1)); color: var(--c-text-muted); }
.cat__bar { height: var(--sp-2); border-radius: var(--r-full); background: var(--c-bg-field); overflow: hidden; }
.cat__fill { display: block; height: 100%; background: var(--c-ok); border-radius: var(--r-full); }
.cat__n { color: var(--c-text-faint); font-variant-numeric: tabular-nums; }

@media (max-width: 720px) {
  .run__main { grid-template-columns: minmax(0, 1fr); gap: var(--sp-1); }
  .detail { grid-template-columns: minmax(0, 1fr); }
}
</style>
