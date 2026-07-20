import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRouter } from 'vue-router'
import BalanceSummary from '@/components/dashboard/BalanceSummary.vue'

vi.mock('vue-router', () => ({ useRouter: vi.fn() }))
vi.mock('@/composables/usePlatform', () => ({
  usePlatform: () => ({ isDesktop: true, isMobile: false }),
}))

describe('BalanceSummary', () => {
  let routerPush: ReturnType<typeof vi.fn>

  const summary = { balance: 1000, income: 2500, expense: 1500, currency: 'EUR' }

  beforeEach(() => {
    vi.clearAllMocks()
    routerPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: routerPush } as any)
    localStorage.clear()
  })

  const defaultProps = () => ({
    summary,
    periodLabel: 'mes',
    savings: [],
    savingsLoaded: true,
    cash: 0,
    cashEnabled: false,
  })

  const globalOptions = {
    global: {
      stubs: {
        AppIcon: true,
        SavingsSummaryCard: { template: '<div class="savings-card-stub">Ahorros</div>' },
      },
    },
  }

  it('muestra el skeleton mientras se cargan los ahorros', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: { ...defaultProps(), savingsLoaded: false },
    })

    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Balance del mes')
  })

  it('muestra el balance del periodo y los ingresos/gastos correctos', () => {
    const wrapper = mount(BalanceSummary, { ...globalOptions, props: defaultProps() })

    expect(wrapper.text()).toContain('Balance del mes')
    expect(wrapper.text()).toContain('1000,00')
    expect(wrapper.text()).toContain('2500,00')
    expect(wrapper.text()).toContain('1500,00')
  })

  it('actualiza el texto y los datos cuando cambia el periodo seleccionado', async () => {
    const wrapper = mount(BalanceSummary, { ...globalOptions, props: defaultProps() })

    await wrapper.setProps({
      periodLabel: 'año',
      summary: { balance: 12000, income: 30000, expense: 18000, currency: 'EUR' },
    })

    expect(wrapper.text()).toContain('Balance del año')
    expect(wrapper.text()).toContain('12.000,00')
    expect(wrapper.text()).toContain('30.000,00')
    expect(wrapper.text()).toContain('18.000,00')
    expect(wrapper.text()).not.toContain('Balance del mes')
  })

  it('muestra datos de efectivo cuando está activado', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: { ...defaultProps(), cashEnabled: true, cash: 150 },
    })

    expect(wrapper.text()).toContain('Banco')
    expect(wrapper.text()).toContain('Efectivo')
    expect(wrapper.text()).toContain('1150,00')
  })

  it('renderiza la tarjeta de ahorros y permite navegar a ella', async () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        savings: [{ id: '1', name: 'Fondo de emergencia', balance: 500 }],
      },
    })

    expect(wrapper.find('.savings-card-stub').exists()).toBe(true)
    const nextButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === 'Ver tarjeta siguiente')
    expect(nextButton).toBeDefined()

    await nextButton!.trigger('click')
    expect(localStorage.getItem('dashboard-balance-card')).toBe('savings')
  })

  it('no muestra controles de carrusel cuando solo hay una tarjeta', () => {
    const wrapper = mount(BalanceSummary, { ...globalOptions, props: defaultProps() })

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.findAll('.rounded-full.transition-all')).toHaveLength(0)
  })

  it('redirige al historial al hacer clic en el balance', async () => {
    const wrapper = mount(BalanceSummary, { ...globalOptions, props: defaultProps() })

    await wrapper.find('section').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/history')
  })
})
