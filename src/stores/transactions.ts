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
import { env } from '@/config/env'
import { monthRange } from '@/utils/format'

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

  const summary = computed<PeriodSummary>(() => ({
    income: totalIncome.value,
    expense: totalExpense.value,
    balance: totalIncome.value - totalExpense.value,
    currency: env.defaultCurrency,
  }))

  /** Gasto/ingreso acumulado por categoría frente a su límite (para las barras del dashboard). */
  const usageByCategory = computed<CategoryUsage[]>(() => {
    const categories = useCategoriesStore()
    return categories.items
      .map((category) => {
        const spent = items.value
          .filter((t) => t.category_id === category.id)
          .reduce((sum, t) => sum + t.amount, 0)
        const limit = category.monthly_limit
        const percentage = limit && limit > 0 ? Math.round((spent / limit) * 100) : 0
        return {
          category,
          spent,
          limit,
          percentage,
          isOverLimit: limit != null && spent > limit,
        }
      })
      .filter((usage) => usage.spent > 0 || usage.limit != null)
  })

  async function fetch(nextFilters?: TransactionFilters) {
    if (nextFilters) filters.value = { ...filters.value, ...nextFilters }
    loading.value = true
    try {
      items.value = await transactionsService.list(filters.value)
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Omit<TablesInsert<'transactions'>, 'owner_id'>) {
    const created = await transactionsService.create(payload)
    items.value.unshift(created)
    return created
  }

  async function update(id: string, changes: TablesUpdate<'transactions'>) {
    const updated = await transactionsService.update(id, changes)
    const index = items.value.findIndex((t) => t.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function remove(id: string) {
    await transactionsService.remove(id)
    items.value = items.value.filter((t) => t.id !== id)
  }

  return {
    items,
    loading,
    filters,
    totalIncome,
    totalExpense,
    summary,
    usageByCategory,
    fetch,
    create,
    update,
    remove,
  }
})
