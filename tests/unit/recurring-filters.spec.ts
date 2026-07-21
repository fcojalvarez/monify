import { describe, expect, it } from 'vitest'
import { filterRecurringTransactions } from '@/utils/recurring-filters'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'

const items = [
  {
    id: 'rec-1',
    kind: 'expense' as const,
    amount: 25,
    note: 'Netflix',
    category_id: 'cat-1',
    family_member_id: 'mem-1',
    frequency: 'monthly' as const,
    next_execution: '2026-08-01',
    end_on: null,
  },
  {
    id: 'rec-2',
    kind: 'income' as const,
    amount: 1500,
    note: 'Salario',
    category_id: 'cat-2',
    family_member_id: 'mem-1',
    frequency: 'monthly' as const,
    next_execution: '2026-07-01',
    end_on: '2026-12-31',
  },
  {
    id: 'rec-3',
    kind: 'expense' as const,
    amount: 50,
    note: 'Gimnasio',
    category_id: 'cat-3',
    family_member_id: 'mem-2',
    frequency: 'weekly' as const,
    next_execution: '2026-09-01',
    end_on: null,
  },
] satisfies Partial<RecurringTransaction>[] as RecurringTransaction[]

const getCategoryName = (categoryId: string) => ({
  'cat-1': 'Ocio',
  'cat-2': 'Nómina',
  'cat-3': 'Salud',
}[categoryId])

describe('filterRecurringTransactions', () => {
  it('devuelve todos los items sin filtros', () => {
    expect(filterRecurringTransactions(items, {}, getCategoryName)).toHaveLength(3)
  })

  it('filtra por texto en la nota', () => {
    const result = filterRecurringTransactions(items, { query: 'netflix' }, getCategoryName)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rec-1')
  })

  it('filtra por nombre de categoría', () => {
    const result = filterRecurringTransactions(items, { query: 'nómina' }, getCategoryName)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rec-2')
  })

  it('filtra por tipo de flujo', () => {
    const result = filterRecurringTransactions(items, { kind: 'income' }, getCategoryName)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rec-2')
  })

  it('filtra por miembro, categoría y frecuencia', () => {
    const result = filterRecurringTransactions(items, {
      familyMemberId: 'mem-2',
      categoryId: 'cat-3',
      frequency: 'weekly',
    }, getCategoryName)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rec-3')
  })

  it('filtra por rango de próxima ejecución', () => {
    const result = filterRecurringTransactions(items, {
      nextFrom: '2026-08-01',
      nextTo: '2026-09-30',
    }, getCategoryName)

    expect(result.map(item => item.id)).toEqual(['rec-1', 'rec-3'])
  })
})
