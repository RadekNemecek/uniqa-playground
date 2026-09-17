<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import { quizPacks, quizPackProgress } from '@/stores/quizPacks'
import { count } from '@/lib/format'
import { availableCount } from '../questions'
import { hasSessionDb } from '@/lib/sessionDb'
import type { QuizPack, QuizSetup } from '../types'

const emit = defineEmits<{ start: [packs: QuizPack[], setup: QuizSetup] }>()

const LIMITS = [10, 15, 20, 30]
const COUNTS = [5, 10, 15, 20]

const chosen = ref(new Set<string>())
const limitSeconds = ref(20)
const wantCount = ref(10)
/**
 * Bez sdílené databáze se telefony nemají kam připojit. Není to porucha,
 * je to druhý způsob, jak kvíz vést: promítaná hra s ručním bodováním.
 * Čte se až při vykreslení, ne při načtení modulu, aby na pořadí importů
 * nezáleželo.
 */
const canUsePhones = computed(() => hasSessionDb())
const withPhones = ref(true)

/** Balíčky, ve kterých je aspoň jedna hotová otázka. */
const usable = computed(() => quizPacks.packs.filter((p) => quizPackProgress(p).done > 0))

const setup = computed<QuizSetup>(() => ({
  packIds: [...chosen.value],
  count: wantCount.value,
  limitSeconds: limitSeconds.value,
  withPhones: withPhones.value && canUsePhones.value,
}))

const pool = computed(() => availableCount(usable.value, setup.value))
const willPlay = computed(() => Math.min(wantCount.value, pool.value))
const canStart = computed(() => pool.value > 0)

function toggle(id: string): void {
  const next = new Set(chosen.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  chosen.value = next
}

// První balíček zaškrtneme samy, ať se nezačíná na prázdné obrazovce.
// Zároveň z výběru vypadne balíček, který mezitím někdo smazal.
watch(
  usable,
  (list) => {
    const live = new Set(list.map((p) => p.id))
    const kept = [...chosen.value].filter((id) => live.has(id))
    if (kept.length === 0 && list.length > 0) chosen.value = new Set([list[0]!.id])
    else if (kept.length !== chosen.value.size) chosen.value = new Set(kept)
  },
  { immediate: true },
)

function start(): void {
  if (!canStart.value) return
  emit('start', usable.value, { ...setup.value, count: willPlay.value })
}
</script>

<template>
  <div class="setup page">
    <header class="setup__head">
      <p class="eyebrow">Na kolik to dáš?</p>
      <h1 class="setup__title">Připrav kvíz</h1>
    </header>

    <section v-if="usable.length === 0" class="empty">
      <span class="empty__step" aria-hidden="true">1</span>
      <div>
        <h2 class="empty__title">
          {{ quizPacks.denied ? 'Balíčky se nepodařilo načíst' : 'Připrav první balíček' }}
        </h2>
        <p v-if="quizPacks.denied">
          Databáze čtení odmítla. Zkontroluj publikovaná pravidla Firestore a načti stránku znovu.
        </p>
        <p v-else>Ke spuštění stačí jedna hotová otázka se čtyřmi možnostmi.</p>
      </div>
      <RouterLink v-if="!quizPacks.denied" to="/kviz/otazky" class="empty__action">Přejít k otázkám</RouterLink>
    </section>

    <div v-else-if="usable.length" class="setup__grid">
      <!-- Balíčky -------------------------------------------------------- -->
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title"><span class="panel__num">1</span> Balíčky</h2>
          <RouterLink to="/kviz/otazky" class="panel__new">Upravit otázky</RouterLink>
        </div>
        <p class="hint">Zaškrtni, odkud se mají otázky brát. Klidně z několika naráz.</p>

        <ul class="packs">
          <li v-for="p in usable" :key="p.id">
            <button
              type="button"
              class="pick"
              :class="{ 'pick--on': chosen.has(p.id) }"
              :aria-pressed="chosen.has(p.id)"
              @click="toggle(p.id)"
            >
              <span class="pick__box" aria-hidden="true">
                <svg v-if="chosen.has(p.id)" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span class="pick__text">
                <span class="pick__name">{{ p.name }}</span>
                <span class="pick__meta">
                  {{ count(quizPackProgress(p).done, 'hotová otázka', 'hotové otázky', 'hotových otázek') }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Průběh --------------------------------------------------------- -->
      <section class="panel">
        <h2 class="panel__title"><span class="panel__num">2</span> Průběh</h2>

        <div class="rule">
          <span class="rule__label">Počet otázek</span>
          <div class="segmented">
            <button
              v-for="n in COUNTS"
              :key="n"
              type="button"
              :class="{ 'seg--on': wantCount === n }"
              @click="wantCount = n"
            >
              {{ n }}
            </button>
          </div>
          <p class="hint">Pořadí se zamíchá, z každého balíčku se bere střídavě.</p>
        </div>

        <div class="rule">
          <span class="rule__label">Telefony hráčů</span>
          <label v-if="canUsePhones" class="toggle">
            <input v-model="withPhones" type="checkbox" />
            <span>Hráči se připojí přes QR kód</span>
          </label>
          <p v-if="canUsePhones" class="hint">
            Bez nich se kvíz jen promítá a body se nepočítají.
          </p>
          <!-- Když telefony nejdou, musí to být vidět tady i u tlačítka.
               Kdo čeká QR kód a nedostane ho, hledá chybu ve hře. -->
          <p v-else class="warn">
            Sdílená databáze není dostupná, takže QR kód se neobjeví a telefony
            se nepřipojí. Kvíz půjde promítat a body si počítáš sama.
          </p>
        </div>

        <div class="rule">
          <span class="rule__label">Čas na odpověď</span>
          <div class="segmented">
            <button
              v-for="s in LIMITS"
              :key="s"
              type="button"
              :class="{ 'seg--on': limitSeconds === s }"
              @click="limitSeconds = s"
            >
              {{ s }} s
            </button>
          </div>
          <p class="hint">Po vypršení už odpovídat nejde.</p>
        </div>
      </section>
    </div>

    <footer v-if="usable.length" class="setup__foot">
      <p class="tally">
        <template v-if="pool === 0">Vyber aspoň jeden balíček.</template>
        <template v-else>
          <template v-if="willPlay < wantCount">
            K dispozici je jen {{ count(pool, 'otázka', 'otázky', 'otázek') }}, zahrajeme je všechny.
          </template>
          <template v-else>
            {{ count(willPlay, 'otázka', 'otázky', 'otázek') }} · {{ limitSeconds }} s na každou
          </template>
          <!-- U tlačítka se rozhoduje, u tlačítka to má být napsané. -->
          <span class="tally__mode">
            {{ setup.withPhones ? '· s telefony, začne se čekárnou s QR kódem' : '· bez telefonů, jen promítání' }}
          </span>
        </template>
      </p>
      <UiButton size="lg" variant="brand" :disabled="!canStart" @click="start">
        Spustit kvíz
      </UiButton>
    </footer>
  </div>
</template>

<style scoped>
.setup { padding-block: var(--sp-5) var(--sp-8); }
.setup__head { margin-bottom: var(--sp-6); }
.setup__title { font-size: var(--fs-3xl); letter-spacing: -0.03em; margin-top: var(--sp-2); }

.setup__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-4);
  align-items: start;
}

.panel {
  display: grid;
  gap: var(--sp-4);
  align-content: start;
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.panel__new {
  flex: none;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: none;
  transition: all var(--dur-fast) var(--ease-out);
}
.panel__new:hover { color: var(--c-text); border-color: var(--c-surface-3); }

.panel__title { display: flex; align-items: center; gap: var(--sp-3); font-size: var(--fs-lg); }
.panel__num {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--r-full);
  background: var(--c-sunken);
  color: var(--c-brand);
  font-size: var(--fs-xs);
  font-weight: 800;
}

.hint { font-size: var(--fs-xs); line-height: var(--lh-body); color: var(--c-text-faint); }
.empty {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-4);
  max-width: var(--content-narrow);
  padding: var(--sp-5);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  color: var(--c-text-muted);
  line-height: var(--lh-body);
}
.empty__step {
  display: grid;
  place-items: center;
  width: var(--control-touch);
  height: var(--control-touch);
  border-radius: var(--r-full);
  background: var(--c-brand);
  color: var(--c-on-accent);
  font-weight: 900;
}
.empty__title { margin-bottom: var(--sp-1); color: var(--c-text); font-size: var(--fs-lg); }
.empty__action {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--c-brand);
  color: var(--c-on-accent);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

/* Balíček se zaškrtává, ne vybírá. Hraje se klidně z několika naráz. */
.packs { list-style: none; padding: 0; display: grid; gap: var(--sp-2); }
.pick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-sunken);
  color: var(--c-text-muted);
  text-align: left;
  transition: all var(--dur-fast) var(--ease-out);
}
.pick:hover { border-color: var(--c-surface-3); color: var(--c-text); }
.pick--on {
  border-color: var(--c-brand);
  background: color-mix(in oklab, var(--c-brand) 12%, var(--c-sunken));
  color: var(--c-text);
}
.pick__box {
  flex: none;
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-sm);
  background: var(--c-surface);
  color: var(--c-on-accent);
}
.pick--on .pick__box { background: var(--c-brand); border-color: var(--c-brand); }
.pick__text { display: grid; gap: var(--sp-1); min-width: 0; }
.pick__name { font-weight: 700; }
.pick__meta { font-size: var(--fs-xs); color: var(--c-text-faint); }


.rule { display: grid; gap: var(--sp-2); align-content: start; }
.toggle { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); color: var(--c-text-muted); }
.rule__label { font-size: var(--fs-sm); font-weight: 600; }
.segmented {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-sunken);
}
.segmented button {
  flex: 1;
  padding: var(--sp-2) var(--sp-1);
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--c-text-muted);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition: all var(--dur-fast) var(--ease-out);
}
.segmented button:hover { color: var(--c-text); background: var(--c-surface); }
.segmented .seg--on { background: var(--c-brand); color: var(--c-on-accent); }

.setup__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
  margin-top: var(--sp-5);
  padding-top: var(--sp-5);
  border-top: 1px solid var(--c-line-soft);
}
.tally { font-size: var(--fs-sm); color: var(--c-text-muted); }
.tally__mode { color: var(--c-text-faint); }

.warn {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--c-bad) 14%, transparent);
  color: var(--c-bad);
  font-size: var(--fs-xs);
  line-height: var(--lh-body);
}

@media (max-width: 860px) {
  .setup__grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 640px) {
  .empty { grid-template-columns: auto minmax(0, 1fr); }
  .empty__action { grid-column: 1 / -1; text-align: center; }
}

/* Dotyk patří na konec, jinak ho přebíjí pravidla zapsaná pod ním. */
@media (pointer: coarse) {
  .empty__action { min-height: var(--control-touch); }
  .pick { min-height: var(--control-touch); }
  .panel__new { display: grid; place-items: center; min-height: var(--control-touch); }
  .segmented button { min-height: var(--control-touch); }
}
</style>
