import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, h } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useNavigationDirection } from '@/composables/useNavigationDirection'
import { setLocale } from '@/i18n'

const { sync, due } = vi.hoisted(() => ({
  sync: vi.fn().mockResolvedValue(0),
  due: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: { due },
}))

vi.mock('@/stores/recurring-transactions', () => ({
  useRecurringTransactionsStore: () => ({ sync }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/dashboard' }),
  RouterView: {
    name: 'RouterView',
    render(this: any) {
      return h(
        'div',
        { class: 'router-view-stub' },
        this.$slots.default ? this.$slots.default({ Component: 'div' }) : null
      )
    }
  },
}))

describe('AppLayout', () => {
  beforeEach(() => {
    sync.mockClear()
    due.mockReset()
    due.mockResolvedValue([])
    setLocale('es')
  })
  const mountLayout = () => {
    return mount(AppLayout, {
      global: {
        stubs: {
          AppHeader: { template: '<header class="app-header-stub" />' },
          BottomNavigation: { template: '<nav class="bottom-navigation-stub" />' },
        },
      },
    })
  }

  it('renderiza AppHeader, BottomNavigation y RouterView', async () => {
    const wrapper = mountLayout()
    await vi.waitFor(() => expect(wrapper.find('.router-view-stub').exists()).toBe(true))

    expect(wrapper.find('.app-header-stub').exists()).toBe(true)
    expect(wrapper.find('.bottom-navigation-stub').exists()).toBe(true)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })

  it('muestra el modal bloqueante de sincronización en modo de prueba', async () => {
    due.mockResolvedValue([{ id: 'pending-recurring' }])
    let resolveSync: (() => void) | undefined
    sync.mockImplementationOnce(() => new Promise<void>(resolve => { resolveSync = resolve }))
    const wrapper = mountLayout()
    await vi.waitFor(() => expect(sync).toHaveBeenCalled())

    expect(wrapper.text()).toContain('Actualizando movimientos')
    expect(wrapper.text()).toContain('Estamos creando los ingresos y gastos recurrentes pendientes.')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    resolveSync?.()
  })

  it('usa la clase de transición correcta según la dirección de navegación', async () => {
    const wrapper = mountLayout()
    await vi.waitFor(() => expect(wrapper.find('transition-stub').exists()).toBe(true))
    const { setDirection } = useNavigationDirection()

    // Dirección por defecto: forward -> slide-forward
    setDirection('forward')
    await nextTick()
    
    // En Vue Test Utils, Transition se stubbea automáticamente a transition-stub
    const transition = wrapper.find('transition-stub')
    expect(transition.exists()).toBe(true)
    expect(transition.attributes('name')).toBe('slide-forward')

    // Cambiamos la dirección a: back -> slide-back
    setDirection('back')
    await nextTick()

    expect(transition.attributes('name')).toBe('slide-back')
  })
})
