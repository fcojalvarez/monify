import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import type { Category, TransactionWithRelations } from '@/types'

const makeTx = (over: Partial<TransactionWithRelations>): TransactionWithRelations =>
  ({
    id: crypto.randomUUID(),
    owner_id: 'u1',
    family_member_id: 'm1',
    category_id: 'c1',
    kind: 'expense',
    gross: null,
    amount: 0,
    note: null,
    occurred_on: '2026-07-01',
    created_at: '2026-07-01T00:00:00Z',
    category: null,
    family_member: null,
    ...over,
  }) as TransactionWithRelations

const makeCat = (over: Partial<Category>): Category =>
  ({
    id: 'c1',
    owner_id: 'u1',
    name: 'Alimentación',
    icon: 'solar:cart-large-2-bold',
    color: '#f5492a',
    kind: 'expense',
    monthly_limit: null,
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  }) as Category

describe('transactions store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calcula ingresos, gastos y balance', () => {
    const store = useTransactionsStore()
    store.items = [
      makeTx({ kind: 'income', amount: 2000 }),
      makeTx({ kind: 'expense', amount: 300 }),
      makeTx({ kind: 'expense', amount: 200 }),
    ]

    expect(store.totalIncome).toBe(2000)
    expect(store.totalExpense).toBe(500)
    expect(store.summary.balance).toBe(1500)
  })

  it('detecta cuando una categoría supera su límite', () => {
    const categories = useCategoriesStore()
    categories.items = [makeCat({ id: 'c1', monthly_limit: 400 })]

    const store = useTransactionsStore()
    store.items = [
      makeTx({ category_id: 'c1', amount: 300 }),
      makeTx({ category_id: 'c1', amount: 250 }),
    ]

    const usage = store.usageByCategory.find((u) => u.category.id === 'c1')
    expect(usage?.spent).toBe(550)
    expect(usage?.percentage).toBe(138)
    expect(usage?.isOverLimit).toBe(true)
  })
})
