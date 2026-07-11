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
      // Landing tras confirmar email / reset de contraseña (redirect de Supabase)
      path: '/auth/callback',
      name: ROUTE_NAMES.authCallback,
      component: () => import('@/views/auth/AuthCallbackView.vue'),
    },
    {
      path: '/dashboard',
      name: ROUTE_NAMES.dashboard,
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/history',
      name: ROUTE_NAMES.history,
      component: () => import('@/views/dashboard/HistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: ROUTE_NAMES.dashboard },
    },
  ],
})

router.beforeEach(authGuard)

/**
 * View Transitions entre rutas. La dirección (forward / back) se deduce de la
 * profundidad de la ruta y se expone en <html data-transition> para que
 * `transitions.css` elija la animación. Degrada a navegación normal si el
 * navegador no soporta la API o el usuario prefiere menos movimiento.
 */
router.beforeResolve((to, from) => {
  const root = document.documentElement
  const supported = 'startViewTransition' in document
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!supported || reducedMotion || to.path === from.path) return

  const direction = to.path.length >= from.path.length ? 'forward' : 'back'
  root.dataset.transition = direction

  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> }
  }

  return new Promise<void>((resolve) => {
    const transition = doc.startViewTransition!(async () => {
      resolve() // deja continuar la navegación → Vue re-renderiza la RouterView
      await nextTick() // espera a que Vue actualice el DOM de forma reactiva en el microtask
    })
    transition.finished.finally(() => root.removeAttribute('data-transition'))
  })
})

export default router
