import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ChartsView from '@/views/dashboard/ChartsView.vue'
import { transactionsService } from '@/services/transactions.service'
import { setLocale } from '@/i18n'

vi.mock('@/services/transactions.service', () => ({
  transactionsService: { list: vi.fn() },
}))

const ocio = { id: 'c2', name: 'Ocio', color: '#f00', icon: 'solar:tag-bold', kind: 'expense' }
const nomina = { id: 'c1', name: 'Nómina', color: '#0f0', icon: 'solar:tag-bold', kind: 'income' }

const transactions = [
  { id: '1', kind: 'income', amount: 2500, occurred_on: '2026-03-10', category_id: 'c1', category: nomina },
  { id: '2', kind: 'expense', amount: 1000, occurred_on: '2026-03-12', category_id: 'c2', category: ocio },
  { id: '3', kind: 'expense', amount: 500, occurred_on: '2026-04-01', category_id: 'c2', category: ocio },
]

function mountView() {
  return mount(ChartsView, {
    global: {
      stubs: { AppIcon: true },
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            ui: { currency: 'EUR' },
            profile: { cashEnabled: false, savingsEnabled: false },
            family: { items: [] },
            savings: { items: [], transactions: [] },
            cash: { account: null, transactions: [] },
          },
        }),
      ],
    },
  })
}

describe('ChartsView · agregaciones', () => {
  beforeEach(() => {
    setLocale('es')
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-15T10:00:00Z'))
    vi.mocked(transactionsService.list).mockResolvedValue(transactions as any)
  })

  afterEach(() => vi.useRealTimers())

  it('calcula ingresos, gastos, ahorro neto y tasa de ahorro del año', async () => {
    const wrapper = mountView()
    await flushPromises()

    const metrics = (wrapper.vm as any).periodMetrics
    expect(metrics.income).toBe(2500)
    expect(metrics.expense).toBe(1500)
    expect(metrics.balance).toBe(1000)
    expect(metrics.rate).toBe(40) // 1000 / 2500
  })

  it('agrupa el gasto por categoría con sus porcentajes', async () => {
    const wrapper = mountView()
    await flushPromises()

    const breakdown = (wrapper.vm as any).categoryBreakdown
    expect(breakdown.totalSpent).toBe(1500)
    expect(breakdown.list).toHaveLength(1)
    expect(breakdown.list[0].category.name).toBe('Ocio')
    expect(breakdown.list[0].spent).toBe(1500)
    expect(breakdown.list[0].percent).toBe(100)
  })

  it('reparte los datos mensuales en los 12 meses del año seleccionado', async () => {
    const wrapper = mountView()
    await flushPromises()

    const data = (wrapper.vm as any).incomeExpensesData
    expect(data).toHaveLength(12)
    // Marzo (índice 2): 2500 ingreso, 1000 gasto
    expect(data[2].income).toBe(2500)
    expect(data[2].expense).toBe(1000)
    // Abril (índice 3): 500 gasto
    expect(data[3].expense).toBe(500)
    // Enero (índice 0): sin movimientos
    expect(data[0].income).toBe(0)
    expect(data[0].expense).toBe(0)
  })
})
