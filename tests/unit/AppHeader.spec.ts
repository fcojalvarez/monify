import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppLogo from '@/components/ui/AppLogo.vue'

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  RouterLink: { template: '<a><slot /></a>' },
}))

describe('AppHeader', () => {
  let pinia: any
  let routerPush: any

  beforeEach(() => {
    vi.clearAllMocks()
    routerPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: routerPush,
    } as any)

    pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        ui: { theme: 'light' },
      },
    })
  })

  const defaultOptions = () => ({
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        AppIcon: true,
        BaseDialog: {
          template: '<div class="dialog-stub" v-if="modelValue"><slot /><button class="confirm" @click="$emit(\'confirm\')">Confirmar</button></div>',
          props: ['modelValue']
        }
      },
    },
  })

  it('renderiza el logo y los botones del header', () => {
    const wrapper = mount(AppHeader, defaultOptions())

    expect(wrapper.findComponent(AppLogo).exists()).toBe(true)
    const buttons = wrapper.findAll('button')
    // El botón de cambiar tema y el botón de cerrar sesión
    expect(buttons).toHaveLength(2)
  })

  it('llama a toggleTheme al hacer clic en el botón de tema', async () => {
    const wrapper = mount(AppHeader, defaultOptions())
    const uiStore = useUiStore()

    const themeBtn = wrapper.find('button[aria-label="Modo oscuro"]')
    expect(themeBtn.exists()).toBe(true)

    await themeBtn.trigger('click')
    expect(uiStore.toggleTheme).toHaveBeenCalled()
  })

  it('muestra el diálogo de logout al hacer clic en cerrar sesión y realiza el signOut', async () => {
    const wrapper = mount(AppHeader, defaultOptions())
    const authStore = useAuthStore()
    const profileStore = useProfileStore()

    const logoutBtn = wrapper.find('button[aria-label="Cerrar sesión"]')
    expect(logoutBtn.exists()).toBe(true)

    // Antes de hacer clic, el diálogo de confirmación no está visible
    expect(wrapper.find('.dialog-stub').exists()).toBe(false)

    await logoutBtn.trigger('click')
    expect(wrapper.find('.dialog-stub').exists()).toBe(true)

    // Hacer clic en confirmar logout
    await wrapper.find('.dialog-stub button.confirm').trigger('click')

    expect(authStore.signOut).toHaveBeenCalled()
    expect(profileStore.reset).toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalledWith({ name: 'login' })
  })
})
