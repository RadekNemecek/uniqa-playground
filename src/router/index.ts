import { createRouter, createWebHistory } from 'vue-router'
import { account, canUseSpace } from '@/stores/account'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /**
     * Kdo smí dovnitř. Bez údaje kdokoli: rozcestník, přihlášení
     * a telefon hráče. `member` je všechno, kde jsou otázky, sady,
     * výsledky nebo členové týmu.
     */
    access?: 'member'
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
      meta: { title: 'Pojišťuj!', access: 'member' },
    },
    {
      path: '/kviz',
      name: 'kviz',
      component: () => import('@/views/KvizView.vue'),
      meta: { title: 'Na kolik to dáš?', access: 'member' },
    },
    {
      path: '/kviz/otazky',
      name: 'kviz-otazky',
      component: () => import('@/views/KvizAdminView.vue'),
      meta: { title: 'Balíčky | Na kolik to dáš?', access: 'member' },
    },
    {
      path: '/kviz/vysledky',
      name: 'kviz-vysledky',
      component: () => import('@/views/KvizReportsView.vue'),
      meta: { title: 'Výsledky | Na kolik to dáš?', access: 'member' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Balíčky | Pojišťuj!', access: 'member' },
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
      // Kód z plátna vede do kvízu i do dotazníku Výslechu.
      meta: { title: 'Připojit se kódem' },
    },
    {
      path: '/vyslech',
      name: 'vyslech',
      component: () => import('@/views/VyslechView.vue'),
      meta: { title: 'Výslech', access: 'member' },
    },
    {
      path: '/vyslech/sady',
      name: 'vyslech-sady',
      component: () => import('@/views/VyslechFormsView.vue'),
      meta: { title: 'Sady otázek | Výslech', access: 'member' },
    },
    {
      path: '/vyslech/vysledky',
      name: 'vyslech-vysledky',
      component: () => import('@/views/VyslechReportsView.vue'),
      meta: { title: 'Výsledky | Výslech', access: 'member' },
    },
    // Dotazník pro účastníky. Krátká adresa ze stejného důvodu jako `/k`.
    {
      path: '/v/:code',
      name: 'vyslech-dotaznik',
      component: () => import('@/views/VyslechFillView.vue'),
      meta: { title: 'Výslech' },
    },
    {
      path: '/v',
      name: 'vyslech-kod',
      component: () => import('@/views/VyslechFillView.vue'),
      meta: { title: 'Výslech' },
    },
    {
      path: '/prihlaseni',
      name: 'prihlaseni',
      component: () => import('@/views/SignInView.vue'),
      meta: { title: 'Přihlášení' },
    },
    // Sem vede odkaz z pozvánky. Nastavuje se tu heslo.
    {
      path: '/pozvanka',
      name: 'pozvanka',
      component: () => import('@/views/InviteView.vue'),
      meta: { title: 'Pozvánka' },
    },
    {
      path: '/tym',
      name: 'tym',
      component: () => import('@/views/TeamView.vue'),
      meta: { title: 'Tým', access: 'member' },
    },
    // Hra se dřív jmenovala Riskuj. Záložky a zástupci PWA na starou
    // adresu musí dál fungovat.
    { path: '/riskuj', redirect: '/pojistuj' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * Bez členství se na otázky, sady ani výsledky nechodí. Data stejně hlídají
 * pravidla na serveru, tohle jen pošle člověka tam, kde se dá něco dělat,
 * místo prázdné obrazovky s chybou. Kam chtěl, si přihlášení zapamatuje.
 */
router.beforeEach((to) => {
  if (!to.meta.access || canUseSpace()) return true
  return { name: 'prihlaseni', query: { dal: to.fullPath } }
})

// Členství ověřené na pozadí může přístup vzít, třeba když admin člena
// odebral. Obrazovka s daty týmu pak odejde na přihlášení sama.
export function leaveIfLocked(): void {
  const current = router.currentRoute.value
  if (current.meta.access && !canUseSpace() && account.status !== 'loading') {
    void router.replace({ name: 'prihlaseni', query: { dal: current.fullPath } })
  }
}

router.afterEach((to) => {
  const title = to.meta.title ?? 'Mučírna'
  document.title = title === 'Mučírna' ? 'Mučírna' : `${title} | Mučírna`
})
