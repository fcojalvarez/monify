import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import RegisterView from '@/views/auth/RegisterView.vue'
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue'
import AuthCallbackView from '@/views/auth/AuthCallbackView.vue'
import { useAuthStore } from '@/stores/auth'

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  RouterLink: { template: '<a><slot /></a>' },
}))

const mountView = (component: any, initialState = {}) => mount(component, {
  global: { plugins: [createTestingPinia({ createSpy: vi.fn, initialState })], stubs: { RouterLink: true, AppLogo: true } },
})

describe('flujos de autenticación restantes', () => {
  beforeEach(() => { push.mockClear(); replace.mockClear() })

  it('valida el registro y muestra la confirmación tras completarlo', async () => {
    const wrapper = mountView(RegisterView)
    const auth = useAuthStore()
    ;(auth.signUp as any).mockResolvedValue(undefined)

    await wrapper.find('form').trigger('submit')
    expect(auth.signUp).not.toHaveBeenCalled()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Ana')
    await inputs[1].setValue('ana@example.com')
    await inputs[2].setValue('secreto1')
    await wrapper.find('form').trigger('submit')

    expect(auth.signUp).toHaveBeenCalledWith('ana@example.com', 'secreto1', 'Ana')
    expect(wrapper.text()).toContain('Revisa tu correo')
  })

  it('solicita el restablecimiento solo con un email válido', async () => {
    const wrapper = mountView(ForgotPasswordView)
    const auth = useAuthStore()
    ;(auth.requestPasswordReset as any).mockResolvedValue(undefined)

    await wrapper.find('input').setValue('no-valido')
    await wrapper.find('form').trigger('submit')
    expect(auth.requestPasswordReset).not.toHaveBeenCalled()

    await wrapper.find('input').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('ana@example.com')
    expect(wrapper.text()).toContain('Email enviado')
  })

  it('inicializa la sesión del callback y redirige al dashboard si existe', async () => {
    const wrapper = mountView(AuthCallbackView, { auth: { initialized: false, session: { user: { id: 'user-1' } } } })
    const auth = useAuthStore()
    ;(auth.init as any).mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    expect(auth.init).toHaveBeenCalled()
    expect(replace).toHaveBeenCalled()
  })
})
