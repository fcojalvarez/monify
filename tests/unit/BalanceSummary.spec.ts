import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRouter } from 'vue-router'
import BalanceSummary from '@/components/dashboard/BalanceSummary.vue'
import { setLocale } from '@/i18n'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: vi.fn() }))
vi.mock('@/composables/usePlatform', () => ({
  usePlatform: () => ({ isDesktop: true, isMobile: false }),
}))

describe('BalanceSummary', () => {
  let routerPush: ReturnType<typeof vi.fn>

  const summary = { balance: 1000, income: 2500, expense: 1500, currency: 'EUR' }

  beforeEach(() => {
    vi.clearAllMocks()
    setLocale('es')
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
    members: [],
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

  it('muestra una tarjeta de efectivo solo cuando su gestión está activada', async () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: { ...defaultProps(), cashEnabled: true, cash: 150 },
    })

    expect(wrapper.text()).toContain('Balance de efectivo')
    expect(wrapper.text()).toContain('Carteras')
    expect(wrapper.text()).toContain('150,00')

    const nextButton = wrapper.findAll('button').find(button => button.attributes('aria-label') === 'Ver tarjeta siguiente')
    await nextButton!.trigger('click')
    expect(localStorage.getItem('dashboard-balance-card')).toBe('cash')

    await wrapper.findAll('section')[1].trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/cash')
  })

  it('muestra el total y resume las carteras sin añadir otro scroll horizontal', () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        cashEnabled: true,
        cash: 300,
        members: [
          { id: '1', name: 'Ana', color: '#00b894', avatar_icon: 'solar:user-bold', cash_balance: 100 },
          { id: '2', name: 'Luis', color: '#3a53a8', avatar_icon: 'solar:user-bold', cash_balance: 200 },
          { id: '3', name: 'Marta', color: '#f5492a', avatar_icon: 'solar:user-bold', cash_balance: 50 },
        ] as any,
      },
    })

    expect(wrapper.text()).toContain('300,00')
    expect(wrapper.text()).toContain('3 miembros')
    const walletPreview = wrapper.find('[data-testid="cash-wallet-preview"]')
    expect(walletPreview.exists()).toBe(true)
    // Verificar que el preview existe y no tiene scroll horizontal
    expect(walletPreview.classes()).not.toContain('overflow-x-auto')
  })

  it('no renderiza la tarjeta de efectivo si su gestión está desactivada', () => {
    const wrapper = mount(BalanceSummary, { ...globalOptions, props: defaultProps() })

    expect(wrapper.text()).not.toContain('Balance de efectivo')
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

  it('muestra todas las carteras cuando hay suficiente espacio', async () => {
    const wrapper = mount(BalanceSummary, {
      ...globalOptions,
      props: {
        ...defaultProps(),
        cashEnabled: true,
        cash: 300,
        members: [
          { id: '1', name: 'Ana', color: '#00b894', avatar_icon: 'solar:user-bold', cash_balance: 100 },
          { id: '2', name: 'Luis', color: '#3a53a8', avatar_icon: 'solar:user-bold', cash_balance: 200 },
        ] as any,
      },
    })

    // Simular que el contenedor tiene suficiente ancho para ambas carteras
    const walletPreview = wrapper.find('[data-testid="cash-wallet-preview"]')
    expect(walletPreview.exists()).toBe(true)

    // Establecer un ancho suficiente para ambas carteras (136px * 2 + gap 8px = ~280px)
    Object.defineProperty(walletPreview.element, 'getBoundingClientRect', {
      value: () => ({ width: 400 }),
      writable: true,
    })

    // Trigger el resize observer manualmente llamando a updateWalletPreview
    // @ts-ignore - accediendo a método privado para test
    await wrapper.vm.updateWalletPreview()
    await wrapper.vm.$nextTick()

    // Verificar que se muestran ambas carteras (no debería haber indicador +N)
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('Luis')
    expect(wrapper.text()).not.toContain('+')
  })
})
