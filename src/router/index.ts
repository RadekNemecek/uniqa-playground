import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: 'Playground' },
    },
    {
      path: '/pojistuj',
      name: 'pojistuj',
      component: () => import('@/views/PojistujView.vue'),
      meta: { title: 'Pojišťuj!' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Správa otázek' },
    },
    // Hra se dřív jmenovala Riskuj. Záložky a zástupci PWA na starou
    // adresu musí dál fungovat.
    { path: '/riskuj', redirect: '/pojistuj' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title ?? 'Playground'
  document.title = title === 'Playground' ? 'Playground' : `${title} | Playground`
})
