import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type {
  CategoryUsage,
  PeriodSummary,
  TablesInsert,
  TablesUpdate,
  TransactionWithRelations,
} from '@/types'

import { transactionsService, type TransactionFilters } from '@/services/transactions.service'

import { useCategoriesStore } from './categories'
import { useUiStore } from './ui'
import { useCashStore } from './cash'

import { monthRange } from '@/utils/format'
import { supabase } from '@/lib/supabase'

export interface CreateTransactionPayload {
  transaction: Omit<TablesInsert<'transactions'>, 'owner_id'>
  gross: number
  useCash?: boolean
}

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref<TransactionWithRelations[]>([])
  const loading = ref(false)

  const filters = ref<TransactionFilters>(monthRange())

  const totalIncome = computed(() =>
    items.value.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0),
  )

  const totalExpense = computed(() =>
    items.value.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0),
  )

  const summary = computed<PeriodSummary>(() => {
    const ui = useUiStore()

    return {
      income: totalIncome.value,
      expense: totalExpense.value,
      balance: totalIncome.value - totalExpense.value,
      currency: ui.currency,
    }
  })

  /**
   * Barras de categorías
   */
  const usageByCategory = computed<CategoryUsage[]>(() => {
    const categories = useCategoriesStore()

    return categories.items
      .map((category) => {
        const spent = items.value
          .filter((t) => t.category_id === category.id)
          .reduce((sum, t) => sum + t.amount, 0)

        const limit = category.monthly_limit

        return {
          category,
          spent,
          limit,
          percentage: limit && limit > 0 ? Math.round((spent / limit) * 100) : 0,
          isOverLimit: limit != null && spent > limit,
        }
      })
      .filter((usage) => usage.spent > 0 || usage.limit != null)
  })

  const annualSummary = ref<PeriodSummary>({
    income: 0,
    expense: 0,
    balance: 0,
    currency: 'EUR',
  })

  async function fetchAnnual() {
    const year = filters.value.from
      ? new Date(filters.value.from + 'T00:00:00').getFullYear()
      : new Date().getFullYear()

    try {
      const list = await transactionsService.list({
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        familyMemberId: filters.value.familyMemberId,
      })

      const income = list.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)

      const expense = list.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0)

      const ui = useUiStore()

      annualSummary.value = {
        income,
        expense,
        balance: income - expense,
        currency: ui.currency,
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetch(nextFilters?: TransactionFilters) {
    if (nextFilters) {
      filters.value = {
        ...filters.value,
        ...nextFilters,
      }
    }

    loading.value = true

    try {
      items.value = await transactionsService.list(filters.value)

      await fetchAnnual()
    } finally {
      loading.value = false
    }
  }

  /**
   * Crear movimiento
   */
  async function create({ transaction, useCash = false }: CreateTransactionPayload) {
    const created = await transactionsService.create({
      transaction,
    })

    items.value.unshift(created)

    /**
     * Actualizar efectivo
     */
    if (useCash) {
      const cash = useCashStore()

      if (transaction.kind === 'income') {
        await cash.deposit({
          amount: transaction.amount,
          note: transaction.note ?? undefined,
          familyMemberId: transaction.family_member_id,
          shouldCreateMainTransaction: false,
          occurredAt: transaction.occurred_on, // Propagamos la fecha del movimiento al efectivo
        })
      } else {
        await cash.withdraw({
          amount: transaction.amount,
          note: transaction.note ?? undefined,
          familyMemberId: transaction.family_member_id,
          shouldCreateMainTransaction: false,
          occurredAt: transaction.occurred_on,
        })
      }
    }

    await fetchAnnual()

    return created
  }

  async function update(id: string, changes: TablesUpdate<'transactions'>) {
    const updated = await transactionsService.update(id, changes)

    const index = items.value.findIndex((t) => t.id === id)

    if (index !== -1) {
      items.value[index] = updated
    }

    await fetchAnnual()

    return updated
  }

  async function remove(id: string) {
    await transactionsService.remove(id)

    items.value = items.value.filter((t) => t.id !== id)

    await fetchAnnual()
  }

  async function clearAll() {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      throw error
    }

    items.value = []

    await fetchAnnual()
  }

  return {
    items,
    loading,
    filters,

    totalIncome,
    totalExpense,
    summary,
    annualSummary,
    usageByCategory,

    fetch,
    create,
    update,
    remove,
    clearAll,
  }
})
