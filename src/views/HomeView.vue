<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import { GAMES } from '@/games/registry'
import { hasGame, game } from '@/stores/game'
import { packs } from '@/stores/packs'
import { count } from '@/lib/format'

</script>

<template>
  <div class="home">
    <AppHeader />

    <main class="page">
      <section class="hero">
        <div class="motif" aria-hidden="true">
          <span v-for="i in 6" :key="i" class="motif__t" :class="{ 'motif__t--gold': i === 3 }" />
        </div>

        <p class="eyebrow">Interaktivní hry pro školení</p>
        <h1 class="hero__title">
          Playground
        </h1>
        <p class="hero__lead">
          Připrav si otázky dopředu, hru pak vedeš jedním klikáním
          před celou místností.
        </p>
      </section>

      <div v-if="hasGame && game" class="resume">
        <div class="resume__text">
          <p class="eyebrow">Rozehraná hra</p>
          <p class="resume__name">{{ game.packName }}, {{ count(game.teams.length, 'tým', 'týmy', 'týmů') }}</p>
        </div>
        <RouterLink to="/riskuj" class="resume__cta">Pokračovat</RouterLink>
      </div>

      <section class="games" aria-label="Dostupné hry">
        <RouterLink
          v-for="(g, i) in GAMES"
          :key="g.slug"
          :to="g.route"
          class="card"
          :style="{ '--i': i }"
        >
          <div class="card__top">
            <span class="card__badge">{{ g.tagline }}</span>
            <span class="card__arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M5 12h13M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>
          <h2 class="card__title">{{ g.title }}</h2>
          <p class="card__desc">{{ g.description }}</p>
          <div class="card__foot">
            <span class="card__meta">
              {{ packs.packs.length
                ? `${count(packs.packs.length, 'balíček', 'balíčky', 'balíčků')} otázek připraveno`
                : 'Zatím bez otázek' }}
            </span>
          </div>
        </RouterLink>
      </section>
    </main>

    <footer class="foot page">
      <p>Funguje i bez připojení k internetu.</p>
    </footer>
  </div>
</template>

<style scoped>
.home { min-height: 100dvh; display: flex; flex-direction: column; }
main { flex: 1; padding-block: var(--sp-7) var(--sp-8); }

.hero { position: relative; max-width: 46rem; margin-bottom: var(--sp-8); }

/* Útržek herní desky ------------------------------------------------------
   Stojí vedle textu, ne za ním. Za písmem by z něj byla jen špína.
   Na užší obrazovce mizí, tam není místo na ozdoby. */
.motif {
  position: absolute;
  top: -1rem;
  left: 30rem;
  display: grid;
  grid-template-columns: repeat(3, 7rem);
  gap: var(--sp-3);
  rotate: -9deg;
  opacity: 0.55;
  pointer-events: none;
  animation: float 14s var(--ease-both) infinite;
}
.motif__t {
  aspect-ratio: 16 / 10;
  border-radius: var(--r-lg);
  background: linear-gradient(178deg, var(--c-tile-top) 0%, var(--c-tile-bottom) 100%);
  box-shadow:
    inset 0 1.5px 0 var(--c-tile-sheen),
    0 4px 0 var(--c-tile-edge),
    0 10px 20px -10px rgba(0, 0, 0, 0.7);
}
.motif__t--gold {
  background: linear-gradient(178deg, var(--c-gold) 0%, var(--c-gold-deep) 100%);
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.35),
    0 4px 0 rgba(0, 0, 0, 0.45),
    0 12px 26px -10px var(--c-gold-glow);
}

@keyframes float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -14px; }
}

@media (max-width: 1180px) {
  .motif { display: none; }
}

.hero__title {
  font-size: var(--fs-hero);
  font-weight: 800;
  letter-spacing: -0.035em;
  margin: var(--sp-3) 0 var(--sp-4);
  background: linear-gradient(160deg, var(--c-text) 22%, var(--c-gold) 130%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.hero__lead {
  font-size: var(--fs-lg);
  color: var(--c-text-muted);
  max-width: 38rem;
  animation: rise var(--dur-slow) var(--ease-out) 80ms both;
}

.resume {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
  padding: var(--sp-4) var(--sp-5);
  margin-bottom: var(--sp-6);
  border: 1px solid color-mix(in oklab, var(--c-gold) 42%, transparent);
  border-radius: var(--r-lg);
  background: color-mix(in oklab, var(--c-gold) 8%, var(--c-surface));
  animation: rise var(--dur-slow) var(--ease-out) 120ms both;
}
.resume__text { flex: 1; min-width: 12rem; }
.resume__name { font-weight: 600; }
.resume__cta {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  background: linear-gradient(180deg, var(--c-gold), var(--c-gold-deep));
  color: var(--c-text-ink);
  font-weight: 700;
  text-decoration: none;
}

.games {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--sp-4);
}

.card {
  --i: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-6);
  min-height: 16rem;
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background:
    radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--c-gold) 8%, transparent), transparent 55%),
    var(--c-surface);
  color: var(--c-text);
  text-decoration: none;
  overflow: hidden;
  position: relative;
  transition:
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
  animation: rise var(--dur-slow) var(--ease-out) calc(160ms + var(--i) * 70ms) both;
}
.card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in oklab, var(--c-gold) 45%, var(--c-line));
  box-shadow: 0 8px 0 var(--c-tile-edge), 0 22px 40px -18px rgba(0, 0, 0, 0.8);
}
.card:active { transform: translateY(-1px); box-shadow: 0 3px 0 var(--c-tile-edge); }
.card:hover .card__arrow { transform: translateX(4px); color: var(--c-gold); }

.card__top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
.card__badge {
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--c-text-faint);
}
.card__arrow { color: var(--c-text-faint); transition: transform var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out); }
.card__title { font-size: var(--fs-3xl); letter-spacing: -0.03em; }
.card__desc { color: var(--c-text-muted); font-size: var(--fs-md); }
.card__foot { margin-top: auto; }
.card__meta { font-size: var(--fs-sm); color: var(--c-text-faint); }

.foot { padding-block: var(--sp-6); color: var(--c-text-faint); font-size: var(--fs-sm); }

@keyframes rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__title, .hero__lead, .resume, .card, .motif { animation: none; }
}
</style>
