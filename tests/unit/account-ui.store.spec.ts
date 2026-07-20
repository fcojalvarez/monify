import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { authService } from '@/services/auth.service'
import { profileService } from '@/services/profile.service'

vi.mock('@/services/auth.service', () => ({
  authService: {
    getSession: vi.fn(), onAuthStateChange: vi.fn(), signIn: vi.fn(), signUp: vi.fn(),
    sendPasswordReset: vi.fn(), signOut: vi.fn(), updateProfile: vi.fn(), updatePassword: vi.fn(),
  },
}))
vi.mock('@/services/profile.service', () => ({ profileService: { getProfile: vi.fn(), update: vi.fn() } }))

const session = (name = 'Ana') => ({ user: { id: 'user-1', user_metadata: { display_name: name } } }) as any
const profile = (overrides = {}) => ({ id: 'user-1', currency: 'EUR', locale: 'es', savings_enabled: false, cash_enabled: false, ...overrides }) as any

describe('stores de cuenta e interfaz', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicializa, actualiza y cierra la sesión', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(session())
    vi.mocked(authService.updateProfile).mockResolvedValue({ id: 'user-1', user_metadata: { display_name: 'Ana María' } } as any)
    const store = useAuthStore()

    await store.init()
    await store.updateProfile('Ana María')
    await store.signOut()

    expect(authService.onAuthStateChange).toHaveBeenCalled()
    expect(store.initialized).toBe(true)
    expect(store.session).toBeNull()
    expect(authService.signOut).toHaveBeenCalled()
  })

  it('actualiza una preferencia del perfil y revierte el cambio si falla', async () => {
    const store = useProfileStore()
    store.profile = profile()
    vi.mocked(profileService.update).mockResolvedValue(profile({ savings_enabled: true }))

    await store.updatePreference('savings_enabled', true)
    expect(store.savingsEnabled).toBe(true)

    vi.mocked(profileService.update).mockRejectedValueOnce(new Error('fallo'))
    await expect(store.updatePreference('cash_enabled', true)).rejects.toThrow('fallo')
    expect(store.cashEnabled).toBe(false)
  })

  it('persiste tema, moneda y estado del aviso de ahorros', async () => {
    const store = useUiStore()
    store.toggleTheme()
    store.setCurrency('USD')
    store.setSavingsPromptDismissed(true)
    await Promise.resolve()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('monify:theme')).toBe('dark')
    expect(localStorage.getItem('monify:currency')).toBe('USD')
    expect(localStorage.getItem('monify:savings_prompt_dismissed')).toBe('true')
    expect(store.locale).toBe('en-US')
  })
})
