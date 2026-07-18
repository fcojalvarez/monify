import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_NAMES } from '@/constants'
import { useProfileStore } from '@/stores/profile'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    index?: number
  }
}

export const authGuard: NavigationGuardWithThis<undefined> = async (
  to: RouteLocationNormalized,
) => {
  const auth = useAuthStore()
  const profile = useProfileStore()

  if (!auth.initialized) {
    await auth.init()
  }

  const isAuth = auth.isAuthenticated

  if (to.meta.requiresAuth && !isAuth) {
    return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresGuest && isAuth) {
    return { name: ROUTE_NAMES.dashboard }
  }

  if (isAuth && !profile.profile) {
    await profile.load()
  }

  return true
}
