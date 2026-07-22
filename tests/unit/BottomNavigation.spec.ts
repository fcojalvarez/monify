import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useRoute } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import BottomNavigation from '@/components/layout/BottomNavigation.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  RouterLink: {
    template: '<a class="router-link-stub" :class="$attrs.class"><slot /></a>',
  },
}))

describe('BottomNavigation', () => {
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useRoute).mockReturnValue({
      name: 'dashboard',
    } as any)

    pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        profile: {
          savingsEnabled: false,
          cashEnabled: false,
        },
        ui: {
          currency: 'EUR',
        },
      },
    })
  })

  const defaultOptions = () => ({
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: {
          template: '<a class="router-link-stub" :class="$attrs.class"><slot /></a>',
        },
        AppIcon: {
          template: '<span class="icon-stub">{{ name }}</span>',
          props: ['name']
        },
      },
    },
  })

  it('renderiza solo los elementos básicos por defecto', () => {
    const wrapper = mount(BottomNavigation, defaultOptions())
    const links = wrapper.findAll('.router-link-stub')

    // Inicio, Gráficas y Historial
    expect(links).toHaveLength(3)
    expect(wrapper.text()).toContain('Inicio')
    expect(wrapper.text()).toContain('Gráficas')
    expect(wrapper.text()).toContain('Historial')
    expect(wrapper.text()).not.toContain('Ahorros')
    expect(wrapper.text()).not.toContain('Efectivo')
  })

  it('muestra el enlace de Ahorros si savingsEnabled es verdadero', async () => {
    const wrapper = mount(BottomNavigation, defaultOptions())
    
    const profileStore = useProfileStore()
    profileStore.savingsEnabled = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Ahorros')
  })

  it('muestra el enlace de Efectivo si cashEnabled es verdadero y aplica el icono correcto según la divisa', async () => {
    const wrapper = mount(BottomNavigation, defaultOptions())
    
    const profileStore = useProfileStore()
    const uiStore = useUiStore()
    
    profileStore.cashEnabled = true
    uiStore.currency = 'USD'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Efectivo')
    
    // El icono de efectivo para USD debe ser dollar-bold
    expect(wrapper.html()).toContain('solar:dollar-bold')
  })

  it('aplica las clases activas al elemento de la ruta actual', () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'history',
    } as any)

    const wrapper = mount(BottomNavigation, defaultOptions())
    const links = wrapper.findAll('.router-link-stub')

    // El tercer enlace (Historial) debe ser el activo
    expect(links[2].classes()).toContain('text-primary-500')
    expect(links[0].classes()).not.toContain('text-primary-500')
  })
})
