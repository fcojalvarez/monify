import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/cash.service', () => ({
  cashService: {
    get: vi.fn(), create: vi.fn(), getTransactions: vi.fn(), deposit: vi.fn(), withdraw: vi.fn(),
    setBalance: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(),
  },
}))
vi.mock('@/services/transactions.service', () => ({ transactionsService: { create: vi.fn() } }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { useCashStore } from '@/stores/cash'
import { cashService } from '@/services/cash.service'

const account = { id: 'cash-1', owner_id: 'user-1', balance: 80, created_at: '2026-01-01T00:00:00Z' } as any

describe('cash store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(cashService.get).mockResolvedValue(account)
    vi.mocked(cashService.getTransactions).mockResolvedValue([])
  })

  it('crea la cuenta al cargar si todavía no existe', async () => {
    vi.mocked(cashService.get).mockResolvedValueOnce(null)
    vi.mocked(cashService.create).mockResolvedValue(account)
    const store = useCashStore()

    await store.fetch()

    expect(cashService.create).toHaveBeenCalled()
    expect(store.balance).toBe(80)
  })

  it('calcula balances y totales por miembro desde el historial', () => {
    const store = useCashStore()
    store.transactions = [
      { amount: 100, family_member_id: 'member-1' },
      { amount: -30, family_member_id: 'member-1' },
      { amount: -10, family_member_id: 'member-2' },
    ] as any

    expect(store.memberBalance('member-1')).toBe(70)
    expect(store.totalIncome).toBe(100)
    expect(store.totalExpense).toBe(40)
  })

  it('registra depósitos, retiradas y ajustes sin crear movimiento general si se desactiva', async () => {
    const store = useCashStore()
    store.account = account

    await store.deposit({ amount: 20, note: 'Ingreso', familyMemberId: 'member-1', shouldCreateMainTransaction: false })
    await store.withdraw({ amount: 5, note: 'Gasto', familyMemberId: 'member-1', shouldCreateMainTransaction: false })
    await store.setBalance(95)

    expect(cashService.deposit).toHaveBeenCalledWith('cash-1', expect.objectContaining({ amount: 20 }))
    expect(cashService.withdraw).toHaveBeenCalledWith('cash-1', expect.objectContaining({ amount: 5 }))
    expect(cashService.setBalance).toHaveBeenCalledWith('cash-1', 95)
    expect(cashService.getTransactions).toHaveBeenCalled()
  })

  it('propaga la fecha del movimiento (occurredAt) al servicio de efectivo', async () => {
    const store = useCashStore()
    store.account = account

    await store.deposit({ amount: 20, familyMemberId: 'member-1', occurredAt: '2026-03-15', shouldCreateMainTransaction: false })
    await store.withdraw({ amount: 5, familyMemberId: 'member-1', occurredAt: '2026-03-16', shouldCreateMainTransaction: false })

    expect(cashService.deposit).toHaveBeenCalledWith('cash-1', expect.objectContaining({ occurredOn: '2026-03-15' }))
    expect(cashService.withdraw).toHaveBeenCalledWith('cash-1', expect.objectContaining({ occurredOn: '2026-03-16' }))
  })

  it('calcula el neto de efectivo dentro de un rango de fechas', () => {
    const store = useCashStore()
    store.transactions = [
      { amount: 100, occurred_on: '2026-03-05' },
      { amount: -30, occurred_on: '2026-03-20' },
      { amount: 500, occurred_on: '2026-02-28' }, // fuera de rango
      { amount: -10, occurred_on: '2026-04-01' }, // fuera de rango
    ] as any

    expect(store.netForRange('2026-03-01', '2026-03-31')).toBe(70)
  })

  it('edita un movimiento aplicando el signo según la dirección y refresca', async () => {
    const store = useCashStore()
    store.account = account

    await store.updateTransaction('tx-1', { amount: 40, isDeposit: false, note: 'Ajuste', occurredOn: '2026-03-10' })

    expect(cashService.updateTransaction).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({ amount: -40, note: 'Ajuste', occurred_on: '2026-03-10' }),
    )
    expect(cashService.getTransactions).toHaveBeenCalled()
  })

  it('elimina un movimiento y refresca el historial', async () => {
    const store = useCashStore()
    store.account = account

    await store.deleteTransaction('tx-1')

    expect(cashService.deleteTransaction).toHaveBeenCalledWith('tx-1')
    expect(cashService.getTransactions).toHaveBeenCalled()
  })

  it('rechaza movimientos y ajustes sin una cuenta cargada', async () => {
    const store = useCashStore()
    await expect(store.deposit({ amount: 1 })).rejects.toThrow('No existe la cuenta')
    await expect(store.withdraw({ amount: 1 })).rejects.toThrow('No existe la cuenta')
    await expect(store.setBalance(1)).rejects.toThrow('No existe la cuenta')
  })
})
