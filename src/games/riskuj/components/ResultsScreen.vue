<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { GameState } from '@/types'
import UiButton from '@/components/ui/UiButton.vue'
import { teamBadge, teamColor, formatScore } from '@/lib/teams'
import { confetti } from '@/lib/confetti'
import { sfx } from '@/lib/sound'
import { settings } from '@/stores/settings'

const props = defineProps<{ game: GameState }>()
const emit = defineEmits<{ again: []; board: [] }>()

const ranked = computed(() => [...props.game.teams].sort((a, b) => b.score - a.score))
const top = computed(() => ranked.value[0]?.score ?? 0)
const winners = computed(() => ranked.value.filter((t) => t.score === top.value))

/** Šířka sloupce vůči nejlepšímu skóre. Záporná skóre mají minimum, aby
 *  z grafu nezmizela úplně. */
function width(score: number): string {
  const span = Math.max(1, top.value - Math.min(0, ranked.value.at(-1)?.score ?? 0))
  const base = Math.max(0, score - Math.min(0, ranked.value.at(-1)?.score ?? 0))
  return `${Math.max(6, (base / span) * 100)}%`
}

onMounted(() => {
  if (settings.sound) sfx.fanfare()
  confetti(winners.value.map((t) => teamColor(t.color).hex))
})
</script>

<template>
  <div class="results">
    <header class="results__head">
      <p class="eyebrow">Konec hry</p>
      <h1 class="results__title">
        <template v-if="winners.length === 1">Vyhrává {{ winners[0]!.name }}</template>
        <template v-else>Remíza</template>
      </h1>
      <p class="results__sub">{{ game.packName }}</p>
    </header>

    <ol class="rank">
      <li
        v-for="(t, i) in ranked"
        :key="t.id"
        class="rank__row"
        :style="{ '--team': `var(${teamColor(t.color).cssVar})`, '--i': i }"
      >
        <span class="rank__place">{{ i + 1 }}</span>
        <span class="rank__badge">{{ teamBadge(game.teams.findIndex((x) => x.id === t.id)) }}</span>
        <span class="rank__name">{{ t.name }}</span>
        <span class="rank__bar"><span class="rank__fill" :style="{ width: width(t.score) }" /></span>
        <span class="rank__score" :class="{ 'rank__score--neg': t.score < 0 }">{{ formatScore(t.score) }}</span>
      </li>
    </ol>

    <div class="results__actions">
      <UiButton variant="ghost" @click="emit('board')">Zpět na desku</UiButton>
      <UiButton variant="gold" size="lg" @click="emit('again')">Nová hra</UiButton>
    </div>
  </div>
</template>

<style scoped>
.results {
  min-height: 100dvh;
  display: grid;
  align-content: center;
  gap: var(--sp-7);
  padding: var(--sp-7) var(--sp-5);
  width: min(100%, 64rem);
  margin-inline: auto;
}
.results__head { text-align: center; }
.results__title {
  font-size: var(--fs-hero);
  font-weight: 800;
  letter-spacing: -0.035em;
  margin: var(--sp-3) 0 var(--sp-2);
  background: linear-gradient(160deg, var(--c-text) 25%, var(--c-gold) 125%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.results__sub { color: var(--c-text-faint); font-size: var(--fs-sm); }

.rank { list-style: none; padding: 0; display: grid; gap: var(--sp-3); }
.rank__row {
  --i: 0;
  display: grid;
  grid-template-columns: 2rem 2.25rem minmax(6rem, 12rem) 1fr auto;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  background: var(--c-surface);
  animation: rise var(--dur-slow) var(--ease-out) calc(120ms + var(--i) * 90ms) both;
}
.rank__row:first-child { border-color: color-mix(in oklab, var(--c-gold) 45%, transparent); }
.rank__place { font-family: var(--font-display); font-weight: 800; color: var(--c-text-faint); text-align: center; }
.rank__row:first-child .rank__place { color: var(--c-gold); }
.rank__badge {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--r-md);
  background: var(--team);
  color: var(--c-text-ink);
  font-family: var(--font-display);
  font-weight: 800;
}
.rank__name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank__bar { height: 10px; border-radius: var(--r-full); background: var(--c-abyss); overflow: hidden; }
.rank__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in oklab, var(--team) 55%, black), var(--team));
  animation: grow var(--dur-count) var(--ease-out) calc(260ms + var(--i) * 90ms) both;
  transform-origin: left center;
}
.rank__score {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  min-width: 4ch;
  text-align: right;
}
.rank__score--neg { color: var(--c-bad); }

.results__actions { display: flex; gap: var(--sp-3); justify-content: center; flex-wrap: wrap; }

@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@media (prefers-reduced-motion: reduce) {
  .results__title, .rank__row, .rank__fill { animation: none; }
}
@media (max-width: 640px) {
  .rank__row { grid-template-columns: 1.5rem 2rem 1fr auto; }
  .rank__bar { display: none; }
}
</style>
