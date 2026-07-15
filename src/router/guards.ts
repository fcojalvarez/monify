import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_NAMES } from '@/constants'
import { useProfileStore } from '@/stores/profile'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
  }
}

/**
 * Guard de sesión (JWT de Supabase):
 *  - Rutas `requiresAuth`  → si NO hay sesión, se manda al login.
 *  - Rutas `requiresGuest` → si SÍ hay sesión, se manda al dashboard.
 * Espera a que el store resuelva la sesión inicial para no redirigir en falso.
 */
export const authGuard: NavigationGuardWithThis<undefined> = async (
  to: RouteLocationNormalized,
) => {
  const auth = useAuthStore()
  const profile = useProfileStore()

  if (!auth.initialized) {
    await auth.init()
    await profile.load()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: ROUTE_NAMES.dashboard }
  }

  return true
}
