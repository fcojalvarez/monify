import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSavingsStore } from '@/stores/savings'
import { savingsService } from '@/services/savings.service'

vi.mock('@/services/savings.service', () => ({
  savingsService: {
    list: vi.fn(), listTransactions: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
    createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(),
  },
}))

const saving = (overrides = {}) => ({
  id: 'saving-1', owner_id: 'user-1', name: 'general', type: 'bank', balance: 120, target: null,
  color: '#8b5cf6', status: 'active', created_at: '2026-01-01T00:00:00Z', ...overrides,
}) as any

describe('savings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('crea las dos cuentas generales que falten al cargar y calcula los balances', async () => {
    vi.mocked(savingsService.list).mockResolvedValue([saving()])
    vi.mocked(savingsService.listTransactions).mockResolvedValue([])
    vi.mocked(savingsService.create).mockResolvedValue(saving({ id: 'saving-cash', type: 'cash', balance: 25, color: '#f59e0b' }))
    const store = useSavingsStore()

    await store.fetchAll()

    expect(savingsService.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'general', type: 'cash' }))
    expect(store.bankBalance).toBe(120)
    expect(store.cashBalance).toBe(25)
    expect(store.getByType('cash')).toHaveLength(1)
  })

  it('elimina una cuenta y también sus movimientos asociados', async () => {
    const store = useSavingsStore()
    store.items = [saving(), saving({ id: 'saving-2', type: 'cash' })]
    store.transactions = [
      { id: 'transaction-1', savings_id: 'saving-1' },
      { id: 'transaction-2', savings_id: 'saving-2' },
    ] as any

    await store.remove('saving-1')

    expect(store.items.map(({ id }) => id)).toEqual(['saving-2'])
    expect(store.transactions.map(({ id }) => id)).toEqual(['transaction-2'])
  })

  it('edita un movimiento aplicando el signo según la dirección', async () => {
    vi.mocked(savingsService.list).mockResolvedValue([saving()])
    vi.mocked(savingsService.listTransactions).mockResolvedValue([])
    vi.mocked(savingsService.updateTransaction).mockResolvedValue({ id: 'transaction-1' } as any)

    const store = useSavingsStore()
    store.transactions = [{ id: 'transaction-1', savings_id: 'saving-1', amount: 50 }] as any

    await store.updateTransaction('transaction-1', { amount: 30, isDeposit: false, note: 'Corrección', occurredOn: '2026-03-10' })

    expect(savingsService.updateTransaction).toHaveBeenCalledWith(
      'transaction-1',
      expect.objectContaining({ amount: -30, note: 'Corrección', occurred_on: '2026-03-10' }),
    )
  })

  it('elimina un movimiento del historial y refresca desde el servidor', async () => {
    vi.mocked(savingsService.list).mockResolvedValue([saving()])
    // Tras borrar, el servidor solo devuelve el movimiento que queda.
    vi.mocked(savingsService.listTransactions).mockResolvedValue([
      { id: 'transaction-2', savings_id: 'saving-1', amount: 20 },
    ] as any)
    vi.mocked(savingsService.deleteTransaction).mockResolvedValue(undefined)

    const store = useSavingsStore()
    store.transactions = [
      { id: 'transaction-1', savings_id: 'saving-1', amount: 50 },
      { id: 'transaction-2', savings_id: 'saving-1', amount: 20 },
    ] as any

    await store.deleteTransaction('transaction-1')

    expect(savingsService.deleteTransaction).toHaveBeenCalledWith('transaction-1')
    expect(savingsService.listTransactions).toHaveBeenCalled()
    expect(store.transactions.map(({ id }) => id)).toEqual(['transaction-2'])
  })
})
