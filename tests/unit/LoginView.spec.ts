import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import LoginView from '@/views/auth/LoginView.vue'
import { useAuthStore } from '@/stores/auth'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}))

function mountView() {
  return mount(LoginView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  })
}

describe('LoginView', () => {
  beforeEach(() => push.mockClear())

  it('muestra error de validación y NO llama a signIn con email inválido', async () => {
    const wrapper = mountView()
    const auth = useAuthStore()

    await wrapper.find('input[type="email"]').setValue('no-es-email')
    await wrapper.find('input[type="password"]').setValue('secret123')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Introduce un email válido')
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('llama a signIn y navega al dashboard con credenciales válidas', async () => {
    const wrapper = mountView()
    const auth = useAuthStore()
    ;(auth.signIn as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('secret123')
    await wrapper.find('form').trigger('submit.prevent')
    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('user@example.com', 'secret123'))

    expect(push).toHaveBeenCalled()
  })
})
