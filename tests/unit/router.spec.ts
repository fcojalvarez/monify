import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import router from '@/router'
import { authGuard } from '@/router/guards'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useNavigationDirection } from '@/composables/useNavigationDirection'
import { ROUTE_NAMES } from '@/constants'
import type { RouteLocationNormalized } from 'vue-router'

describe('Router & Guards', () => {
  let authStore: ReturnType<typeof useAuthStore>
  let profileStore: ReturnType<typeof useProfileStore>

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: true,
    })
    setActivePinia(pinia)

    authStore = useAuthStore()
    profileStore = useProfileStore()
  })

  describe('authGuard', () => {
    function createMockRoute(meta: { requiresAuth?: boolean; requiresGuest?: boolean }, fullPath = '/test'): RouteLocationNormalized {
      return {
        path: fullPath,
        fullPath,
        name: 'test',
        meta,
        query: {},
        params: {},
        matched: [],
        redirectedFrom: undefined,
      }
    }

    it('inicializa authStore si no está inicializado', async () => {
      // @ts-ignore
      authStore.initialized = false
      // @ts-ignore
      authStore.isAuthenticated = true
      // @ts-ignore
      profileStore.profile = { id: '1' }

      const to = createMockRoute({})
      const result = await authGuard(to, {} as any, () => {})

      expect(authStore.init).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('redirecciona a login con redirect query cuando requiere autenticación y el usuario no está logueado', async () => {
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      authStore.isAuthenticated = false

      const to = createMockRoute({ requiresAuth: true }, '/dashboard')
      const result = await authGuard(to, {} as any, () => {})

      expect(result).toEqual({
        name: ROUTE_NAMES.login,
        query: { redirect: '/dashboard' },
      })
    })

    it('permite el acceso si requiere autenticación y el usuario está logueado', async () => {
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      authStore.isAuthenticated = true
      // @ts-ignore
      profileStore.profile = { id: '1', name: 'Usuario' }

      const to = createMockRoute({ requiresAuth: true })
      const result = await authGuard(to, {} as any, () => {})

      expect(result).toBe(true)
    })

    it('redirecciona a dashboard si requiere guest y el usuario está logueado', async () => {
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      authStore.isAuthenticated = true

      const to = createMockRoute({ requiresGuest: true })
      const result = await authGuard(to, {} as any, () => {})

      expect(result).toEqual({ name: ROUTE_NAMES.dashboard })
    })

    it('permite el acceso si requiere guest y el usuario no está logueado', async () => {
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      authStore.isAuthenticated = false

      const to = createMockRoute({ requiresGuest: true })
      const result = await authGuard(to, {} as any, () => {})

      expect(result).toBe(true)
    })

    it('carga el perfil si el usuario está autenticado pero el perfil no está cargado', async () => {
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      authStore.isAuthenticated = true
      // @ts-ignore
      profileStore.profile = null

      const to = createMockRoute({ requiresAuth: true })
      const result = await authGuard(to, {} as any, () => {})

      expect(profileStore.load).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })
  })

  describe('Navigation Transition Direction', () => {
    beforeEach(() => {
      // @ts-ignore
      authStore.isAuthenticated = true
      // @ts-ignore
      authStore.initialized = true
      // @ts-ignore
      profileStore.profile = { id: '1' }
    })

    it('establece la dirección a forward cuando se navega a una página con meta.index mayor o igual', async () => {
      const { direction } = useNavigationDirection()
      
      // Simular transición a dashboard (index: 1)
      await router.push({ name: ROUTE_NAMES.dashboard })
      expect(direction.value).toBe('forward')

      // Simular transición a history (index: 5)
      await router.push({ name: ROUTE_NAMES.history })
      expect(direction.value).toBe('forward')
    })

    it('establece la dirección a back cuando se navega a una página con meta.index menor', async () => {
      const { direction } = useNavigationDirection()
      
      // Simular estar en history (index: 5)
      await router.push({ name: ROUTE_NAMES.history })
      
      // Simular transición de vuelta a charts (index: 2)
      await router.push({ name: ROUTE_NAMES.charts })
      expect(direction.value).toBe('back')
    })
  })
})
