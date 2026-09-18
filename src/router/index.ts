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
      meta: { title: 'Mučírna' },
    },
    {
      path: '/pojistuj',
      name: 'pojistuj',
      component: () => import('@/views/PojistujView.vue'),
      meta: { title: 'Pojišťuj!' },
    },
    {
      path: '/kviz',
      name: 'kviz',
      component: () => import('@/views/KvizView.vue'),
      meta: { title: 'Na kolik to dáš?' },
    },
    {
      path: '/kviz/otazky',
      name: 'kviz-otazky',
      component: () => import('@/views/KvizAdminView.vue'),
      meta: { title: 'Otázky | Na kolik to dáš?' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Otázky | Pojišťuj!' },
    },
    // Adresa pro hráče. Je krátká schválně: nese ji QR kód na plátně
    // a čím kratší adresa, tím řidší kód a tím dál se dá načíst.
    {
      path: '/k/:code',
      name: 'kviz-hrat',
      component: () => import('@/views/KvizJoinView.vue'),
      meta: { title: 'Na kolik to dáš?' },
    },
    // Bez kódu. Sem vede „Zadat jiný kód" a sem patří každý, kdo QR
    // nenačetl a přepisuje kód z plátna ručně.
    {
      path: '/k',
      name: 'kviz-kod',
      component: () => import('@/views/KvizJoinView.vue'),
      meta: { title: 'Na kolik to dáš?' },
    },
    // Hra se dřív jmenovala Riskuj. Záložky a zástupci PWA na starou
    // adresu musí dál fungovat.
    { path: '/riskuj', redirect: '/pojistuj' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = to.meta.title ?? 'Mučírna'
  document.title = title === 'Mučírna' ? 'Mučírna' : `${title} | Mučírna`
})
