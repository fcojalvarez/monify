import { createRouter, createWebHistory } from 'vue-router'
import { ROUTE_NAMES } from '@/constants'
import { authGuard } from './guards'
import { useNavigationDirection } from '@/composables/useNavigationDirection'

const { setDirection } = useNavigationDirection()

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
      component: () => import('@/views/auth/AuthLayout.vue'),
      meta: { requiresGuest: true },
      children: [
        {
          path: 'login',
          name: ROUTE_NAMES.login,
          component: () => import('@/views/auth/LoginView.vue'),
        },
        {
          path: 'register',
          name: ROUTE_NAMES.register,
          component: () => import('@/views/auth/RegisterView.vue'),
        },
        {
          path: 'forgot-password',
          name: ROUTE_NAMES.forgotPassword,
          component: () => import('@/views/auth/ForgotPasswordView.vue'),
        },
      ],
    },

    {
      path: '/auth/callback',
      name: ROUTE_NAMES.authCallback,
      component: () => import('@/views/auth/AuthCallbackView.vue'),
    },

    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: ROUTE_NAMES.dashboard,
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { index: 1 },
        },
        {
          path: 'history',
          name: ROUTE_NAMES.history,
          component: () => import('@/views/dashboard/HistoryView.vue'),
          meta: { index: 5 },
        },
        {
          path: 'savings',
          name: ROUTE_NAMES.savings,
          component: () => import('@/views/dashboard/SavingsView.vue'),
          meta: { index: 3 },
        },
        {
          path: 'cash',
          name: ROUTE_NAMES.cash,
          component: () => import('@/views/dashboard/CashView.vue'),
          meta: { index: 4 },
        },
        {
          path: 'charts',
          name: ROUTE_NAMES.charts,
          component: () => import('@/views/dashboard/ChartsView.vue'),
          meta: { index: 2 },
        },
        {
          path: 'profile',
          name: ROUTE_NAMES.profile,
          component: () => import('@/views/dashboard/ProfileView.vue'),
          meta: { index: 6 },
        },
        {
          path: 'recurring',
          name: ROUTE_NAMES.recurring,
          component: () => import('@/views/dashboard/RecurringView.vue'),
          meta: { index: 7 },
        },
      ],
    },

    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.dashboard },
    },
  ],
})

router.beforeEach(authGuard)

let previousIndex = 0

router.afterEach((to) => {
  const currentIndex = (to.meta.index as number) ?? 0

  setDirection(currentIndex >= previousIndex ? 'forward' : 'back')

  previousIndex = currentIndex
})

export default router
