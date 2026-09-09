import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Barevná vrstva stránky. Chybí-li, platí tmavá. */
    theme?: 'light' | 'dark'
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: 'Playground', theme: 'dark' },
    },
    {
      path: '/pojistuj',
      name: 'pojistuj',
      component: () => import('@/views/PojistujView.vue'),
      meta: { title: 'Pojišťuj!', theme: 'dark' },
    },
    {
      // Správa otázek je jediné místo, kde se pracuje, ne hraje. Proto
      // světlá vrstva, stejná jako web UNIQA.
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Správa otázek', theme: 'light' },
    },
    // Hra se dřív jmenovala Riskuj. Záložky a zástupci PWA na starou
    // adresu musí dál fungovat.
    { path: '/riskuj', redirect: '/pojistuj' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// Vrstva se přepíná před vykreslením, aby světlá stránka nikdy neproblikla
// tmavou. Výchozí hodnota je v index.html, takže nebliká ani první načtení.
router.beforeEach((to) => {
  document.documentElement.dataset.theme = to.meta.theme ?? 'dark'
})

router.afterEach((to) => {
  const title = to.meta.title ?? 'Playground'
  document.title = title === 'Playground' ? 'Playground' : `${title} | Playground`
})
