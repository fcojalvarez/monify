import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import HistoryView from '@/views/dashboard/HistoryView.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

import { transactionsService } from '@/services/transactions.service'
import { formatCurrency } from '@/utils/format'
import type { Category, FamilyMember, TransactionWithRelations } from '@/types'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}))

const mockCategories: Partial<Category>[] = [
  {
    id: 'cat-1',
    name: 'Comida',
    kind: 'expense',
    color: '#ff0000',
    icon: 'solar:cart-large-2-bold',
  },
  {
    id: 'cat-2',
    name: 'Nómina',
    kind: 'income',
    color: '#00ff00',
    icon: 'solar:wallet-money-bold',
  },
]

const mockFamily: Partial<FamilyMember>[] = [
  {
    id: 'mem-1',
    name: 'Yo',
    is_self: true,
  },
]

const mockTransactions: Partial<TransactionWithRelations>[] = [
  {
    id: 'tx-1',
    kind: 'expense',
    amount: 12.5,
    gross: null,
    category_id: 'cat-1',
    family_member_id: 'mem-1',
    occurred_on: '2026-07-05',
    category: mockCategories[0] as Category,
    family_member: mockFamily[0] as FamilyMember,
  },
  {
    id: 'tx-2',
    kind: 'income',
    amount: 1500,
    gross: null,
    category_id: 'cat-2',
    family_member_id: 'mem-1',
    occurred_on: '2026-07-01',
    category: mockCategories[1] as Category,
    family_member: mockFamily[0] as FamilyMember,
  },
]

vi.mock('@/services/transactions.service', () => ({
  transactionsService: {
    list: vi.fn(),
  },
}))

describe('HistoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(transactionsService.list).mockResolvedValue(
      mockTransactions as TransactionWithRelations[],
    )
  })

  function mountView() {
    return mount(HistoryView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              categories: {
                items: mockCategories,
                loaded: true,
              },
              family: {
                items: mockFamily,
                loaded: true,
              },
              auth: {
                isAuthenticated: true,
              },
            },
          }),
        ],
      },
    })
  }

  it('renderiza correctamente los filtros y totales', async () => {
    const wrapper = mountView()

    await vi.waitFor(() => expect(transactionsService.list).toHaveBeenCalled())

    expect(wrapper.text()).toContain('Histórico de movimientos')

    expect(wrapper.text()).toContain(formatCurrency(1500))
    expect(wrapper.text()).toContain(formatCurrency(12.5))
    expect(wrapper.text()).toContain(formatCurrency(1487.5))

    expect(wrapper.text()).toContain('Comida')
    expect(wrapper.text()).toContain('Nómina')
  })

  it('filtra por tipo de flujo en memoria', async () => {
    const wrapper = mountView()

    await vi.waitFor(() => expect(transactionsService.list).toHaveBeenCalled())

    await wrapper.find('.cursor-pointer').trigger('click')

    const selects = wrapper.findAllComponents(BaseSelect)

    expect(selects).toHaveLength(3)

    await selects[1].vm.$emit('update:modelValue', 'expense')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Comida')
    expect(wrapper.text()).not.toContain('Nómina')
  })

  it('permite limpiar todos los filtros a sus valores por defecto', async () => {
    const wrapper = mountView()

    await vi.waitFor(() => expect(transactionsService.list).toHaveBeenCalled())

    await wrapper.find('.cursor-pointer').trigger('click')

    const selects = wrapper.findAllComponents(BaseSelect)

    expect(selects).toHaveLength(3)

    await selects[0].vm.$emit('update:modelValue', 'mem-1')
    await wrapper.vm.$nextTick()

    expect(selects[0].props('modelValue')).toBe('mem-1')

    const clearBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Limpiar filtros'))

    expect(clearBtn).toBeDefined()

    await clearBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(selects[0].props('modelValue')).toBe('')
  })
})
