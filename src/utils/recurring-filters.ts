import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import type { RecurringFrequency } from '@/types/database.types'

export type RecurringKindFilter = 'all' | 'expense' | 'income'
export type RecurringFrequencyFilter = 'all' | RecurringFrequency

export interface RecurringFilters {
  query?: string
  kind?: RecurringKindFilter
  familyMemberId?: string
  categoryId?: string
  frequency?: RecurringFrequencyFilter
  nextFrom?: string
  nextTo?: string
}

export function filterRecurringTransactions(
  items: RecurringTransaction[],
  filters: RecurringFilters,
  getCategoryName: (categoryId: string) => string | undefined,
): RecurringTransaction[] {
  const query = filters.query?.trim().toLowerCase()

  return items.filter((item) => {
    if (filters.kind && filters.kind !== 'all' && item.kind !== filters.kind) {
      return false
    }

    if (filters.familyMemberId && item.family_member_id !== filters.familyMemberId) {
      return false
    }

    if (filters.categoryId && item.category_id !== filters.categoryId) {
      return false
    }

    if (filters.frequency && filters.frequency !== 'all' && item.frequency !== filters.frequency) {
      return false
    }

    if (filters.nextFrom && item.next_execution < filters.nextFrom) {
      return false
    }

    if (filters.nextTo && item.next_execution > filters.nextTo) {
      return false
    }

    if (query) {
      const note = item.note?.toLowerCase() ?? ''
      const categoryName = getCategoryName(item.category_id)?.toLowerCase() ?? ''

      if (!note.includes(query) && !categoryName.includes(query)) {
        return false
      }
    }

    return true
  })
}
