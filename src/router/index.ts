import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/riskuj',
      name: 'riskuj',
      component: () => import('@/views/RiskujView.vue'),
      meta: { title: 'Riskuj' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Správa otázek' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? 'Playground'
  document.title = title === 'Playground' ? 'Playground' : `${title} | Playground`
})
