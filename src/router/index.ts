import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { ROUTE_NAMES } from '@/constants'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      redirect: { name: ROUTE_NAMES.dashboard },
    },
    {
      path: '/auth',
      component: () => import(/* viteChunkName: "auth" */ '@/views/auth/AuthLayout.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: 'login',
          name: ROUTE_NAMES.login,
          component: () => import(/* viteChunkName: "auth" */ '@/views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: ROUTE_NAMES.register,
          component: () => import(/* viteChunkName: "auth" */ '@/views/auth/RegisterView.vue'),
        },
        {
          path: 'forgot-password',
          name: ROUTE_NAMES.forgotPassword,
          component: () =>
            import(/* viteChunkName: "auth" */ '@/views/auth/ForgotPasswordView.vue'),
        },
      ],
    },
    {
      path: '/auth/callback',
      name: ROUTE_NAMES.authCallback,
      component: () => import(/* viteChunkName: "auth" */ '@/views/auth/AuthCallbackView.vue'),
    },
    {
      path: '/dashboard',
      name: ROUTE_NAMES.dashboard,
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true, index: 1 },
    },
    {
      path: '/history',
      name: ROUTE_NAMES.history,
      component: () => import('@/views/dashboard/HistoryView.vue'),
      meta: { requiresAuth: true, index: 2 },
    },
    {
      path: '/savings',
      name: ROUTE_NAMES.savings,
      component: () => import('@/views/dashboard/SavingsView.vue'),
      meta: { requiresAuth: true, index: 3 },
    },
    {
      path: '/cash',
      name: ROUTE_NAMES.cash,
      component: () => import('@/views/dashboard/CashView.vue'),
      meta: { requiresAuth: true, index: 4 },
    },
    {
      path: '/charts',
      name: ROUTE_NAMES.charts,
      component: () => import('@/views/dashboard/ChartsView.vue'),
      meta: { requiresAuth: true, index: 5 },
    },
    {
      path: '/profile',
      name: ROUTE_NAMES.profile,
      component: () => import('@/views/dashboard/ProfileView.vue'),
      meta: { requiresAuth: true, index: 6 },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.dashboard },
    },
  ],
})

router.beforeEach(authGuard)

/**
 * View Transitions entre rutas optimizadas mediante índices numéricos
 */
router.beforeResolve((to, from) => {
  const root = document.documentElement
  const supported = 'startViewTransition' in document
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (!supported || reducedMotion || to.path === from.path) return

  const toIndex = (to.meta.index as number) || 0
  const fromIndex = (from.meta.index as number) || 0

  const direction = toIndex >= fromIndex ? 'forward' : 'back'
  root.dataset.transition = direction

  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> }
  }

  return new Promise<void>((resolve) => {
    const transition = doc.startViewTransition!(async () => {
      resolve()
      await nextTick()
    })

    transition.finished.then(() => {
      root.removeAttribute('data-transition')
    })
  })
})

export default router
