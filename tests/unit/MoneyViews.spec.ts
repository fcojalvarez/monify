import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CashView from '@/views/dashboard/CashView.vue'
import SavingsView from '@/views/dashboard/SavingsView.vue'
import { setLocale } from '@/i18n'

const dialogStub = { props: ['modelValue', 'title'], template: '<div v-if="modelValue" class="dialog" :data-title="title"><slot /></div>' }
const cardStub = { template: '<section class="card"><slot /></section>' }

const member = { id: 'member-1', name: 'Ana', is_self: true, color: '#f00', avatar_icon: 'solar:user-bold', cash_balance: 70 }
const saving = { id: 'saving-1', name: 'Vacaciones', type: 'bank', balance: 120, target: 200, color: '#8b5cf6', status: 'active' }

const mountWith = (component: any, initialState: Record<string, any>) => mount(component, {
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn, initialState })],
    stubs: { AppIcon: true, BaseCard: cardStub, BaseDialog: dialogStub, BaseButton: false, BaseInput: true, BaseSelect: true },
  },
})

describe('vistas de efectivo y ahorros', () => {
  beforeEach(() => setLocale('es'))

  it('muestra las carteras de efectivo y abre el diálogo de ingreso para una persona', async () => {
    const wrapper = mountWith(CashView, {
      ui: { currency: 'EUR' },
      family: { items: [member] },
      cash: { account: { id: 'cash-1', balance: 70 }, transactions: [] },
    })

    expect(wrapper.text()).toContain('Mi efectivo')
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.text()).toContain('Todavía no hay movimientos registrados.')
    await wrapper.findAll('button').find(button => button.text().includes('Añadir'))!.trigger('click')
    expect(wrapper.find('.dialog[data-title="Añadir efectivo"]').exists()).toBe(true)
  })

  it('muestra el estado vacío de ahorros y el menú de gestión', async () => {
    const wrapper = mountWith(SavingsView, {
      ui: { currency: 'EUR' }, family: { items: [member] },
      savings: { items: [], transactions: [], loading: false },
    })

    expect(wrapper.text()).toContain('No existen metas de ahorro activas.')
    await wrapper.findAll('button').find(button => button.text().includes('gestionar'))!.trigger('click')
    expect(wrapper.text()).toContain('Nueva meta')
  })

  it('renderiza una meta activa y su historial de ahorro', () => {
    const wrapper = mountWith(SavingsView, {
      ui: { currency: 'EUR' }, family: { items: [member] },
      savings: {
        items: [saving], loading: false,
        transactions: [{ id: 'tx-1', savings_id: 'saving-1', amount: 30, occurred_on: '2026-07-20', note: 'Aportación' }],
      },
    })

    expect(wrapper.text()).toContain('Vacaciones')
    expect(wrapper.text()).toContain('60%')
    expect(wrapper.text()).toContain('Aportación')
  })
})
