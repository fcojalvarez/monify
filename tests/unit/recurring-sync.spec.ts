import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: {
    due: vi.fn(),
    createOccurrence: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn() }))

const base = {
  id: 'r1',
  owner_id: 'u1',
  kind: 'expense' as const,
  gross: null,
  amount: 25,
  category_id: 'cat-1',
  family_member_id: 'mem-1',
  payment_method: 'bank' as const,
  note: null,
  end_on: null as string | null,
  is_active: true,
  last_synced_at: null,
  created_at: '',
  updated_at: '',
  months: null as number[] | null,
  day_of_month: null as number | null,
}

describe('recurring-transactions store · sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-07-22T10:00:00Z'))
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'u1' } } as any)
    vi.mocked(recurringTransactionsService.createOccurrence).mockResolvedValue(1)
    vi.mocked(recurringTransactionsService.update).mockResolvedValue({} as any)
  })

  afterEach(() => vi.useRealTimers())

  it('no hace nada si no hay usuario autenticado', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null } as any)
    const store = useRecurringTransactionsStore()

    const count = await store.sync()

    expect(count).toBe(0)
    expect(recurringTransactionsService.due).not.toHaveBeenCalled()
  })

  it('genera todas las ocurrencias mensuales pendientes y avanza next_execution', async () => {
    vi.mocked(recurringTransactionsService.due).mockResolvedValue([
      { ...base, frequency: 'monthly', next_execution: '2026-05-15' },
    ] as any)

    const store = useRecurringTransactionsStore()
    const count = await store.sync()

    // 15 may, 15 jun, 15 jul (<= 22 jul); la de 15 ago queda para el futuro
    expect(count).toBe(3)
    expect(recurringTransactionsService.createOccurrence).toHaveBeenCalledTimes(3)
    expect(recurringTransactionsService.createOccurrence).toHaveBeenNthCalledWith(1, expect.anything(), '2026-05-15')
    expect(recurringTransactionsService.createOccurrence).toHaveBeenNthCalledWith(3, expect.anything(), '2026-07-15')
    expect(recurringTransactionsService.update).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ next_execution: '2026-08-15', is_active: true }),
    )
  })

  it('deja de generar y desactiva la recurrencia al superar end_on', async () => {
    vi.mocked(recurringTransactionsService.due).mockResolvedValue([
      { ...base, id: 'r2', frequency: 'monthly', next_execution: '2026-06-10', end_on: '2026-07-01' },
    ] as any)

    const store = useRecurringTransactionsStore()
    const count = await store.sync()

    // Solo 10 jun entra; 10 jul supera el end_on (1 jul)
    expect(count).toBe(1)
    expect(recurringTransactionsService.createOccurrence).toHaveBeenCalledTimes(1)
    expect(recurringTransactionsService.createOccurrence).toHaveBeenCalledWith(expect.anything(), '2026-06-10')
    expect(recurringTransactionsService.update).toHaveBeenCalledWith(
      'r2',
      expect.objectContaining({ next_execution: '2026-07-10', is_active: false }),
    )
  })

  it('genera correctamente una recurrencia personalizada (meses concretos + día)', async () => {
    vi.mocked(recurringTransactionsService.due).mockResolvedValue([
      { ...base, id: 'r3', frequency: 'custom', next_execution: '2026-06-05', months: [6, 8, 10, 12], day_of_month: 5 },
    ] as any)

    const store = useRecurringTransactionsStore()
    const count = await store.sync()

    // Solo el 5 jun entra (<= 22 jul); la siguiente es el 5 ago
    expect(count).toBe(1)
    expect(recurringTransactionsService.createOccurrence).toHaveBeenCalledWith(expect.anything(), '2026-06-05')
    expect(recurringTransactionsService.update).toHaveBeenCalledWith(
      'r3',
      expect.objectContaining({ next_execution: '2026-08-05', is_active: true }),
    )
  })

  it('acumula el total de ocurrencias creadas en lastCreatedCount', async () => {
    vi.mocked(recurringTransactionsService.due).mockResolvedValue([
      { ...base, frequency: 'yearly', next_execution: '2024-07-01' },
    ] as any)

    const store = useRecurringTransactionsStore()
    await store.sync()

    // 2024, 2025, 2026 (<= 22 jul 2026)
    expect(store.lastCreatedCount).toBe(3)
  })
})
