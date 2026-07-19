import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BalanceSummary from '@/components/dashboard/BalanceSummary.vue'

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/composables/usePlatform', () => ({
  usePlatform: () => ({
    isDesktop: true,
    isMobile: false,
  }),
}))

describe('BalanceSummary', () => {
  let routerPush: any

  const monthlySummary = {
    balance: 1000,
    income: 2500,
    expense: 1500,
    currency: 'EUR',
  }

  const annualSummary = {
    balance: 12000,
    income: 30000,
    expense: 18000,
    currency: 'EUR',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routerPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: routerPush,
    } as any)
    localStorage.clear()
  })

  const defaultProps = () => ({
    monthlySummary,
    annualSummary,
    savings: [],
    savingsLoaded: true,
    cash: 0,
    cashEnabled: false,
  })

  const globalOptions = {
    global: {
      stubs: {
        AppIcon: true,
        SavingsSummaryCard: {
          template: '<div class="savings-card-stub">Ahorros</div>',
        },
      },
    },
  }

  it('muestra skeleton animado cuando savingsLoaded es falso', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        savingsLoaded: false,
      },
    })

    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Balance del mes')
  })

  it('muestra el balance mensual y los ingresos/gastos correctos', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: defaultProps(),
    })

    expect(wrapper.text()).toContain('Balance del mes')
    expect(wrapper.text()).toContain('1000,00') // En formato local de EUR
    expect(wrapper.text()).toContain('2500,00') // Ingresos
    expect(wrapper.text()).toContain('1500,00') // Gastos
  })

  it('muestra datos de efectivo cuando cashEnabled es verdadero', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        cashEnabled: true,
        cash: 150,
      },
    })

    expect(wrapper.text()).toContain('Banco')
    expect(wrapper.text()).toContain('Efectivo')
    expect(wrapper.text()).toContain('150,00')
    // El balance total principal ahora debe incluir el efectivo (1000 + 150 = 1150)
    expect(wrapper.text()).toContain('1150,00')
  })

  it('renderiza la tarjeta de ahorros si hay ahorros configurados', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        savings: [{ id: '1', name: 'Fondo de emergencia', balance: 500 }],
      },
    })

    expect(wrapper.find('.savings-card-stub').exists()).toBe(true)
  })

  it('permite cambiar a la siguiente tarjeta al pulsar el botón de flecha derecha', async () => {
    // Para poder cambiar de tarjeta, necesitamos al menos dos tarjetas: mensual y anual (o ahorros)
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: defaultProps(),
    })

    const buttons = wrapper.findAll('button')
    // Buscar el botón con aria-label "Ver balance anual"
    const nextBtn = buttons.find((btn) => btn.attributes('aria-label') === 'Ver balance anual')
    expect(nextBtn).toBeDefined()

    await nextBtn!.trigger('click')
    
    // Al pulsar siguiente, se guarda en localStorage y actualiza activeIndex
    expect(localStorage.getItem('dashboard-balance-card')).toBe('annual')
  })

  it('redirige al historial al hacer clic en el balance mensual', async () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: defaultProps(),
    })

    await wrapper.find('section').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/history')
  })
})
