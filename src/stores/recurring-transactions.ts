import { defineStore } from 'pinia'
import { ref } from 'vue'
import { recurringTransactionsService, type RecurringTransactionInsert } from '@/services/recurring-transactions.service'
import { useAuthStore } from './auth'
import { nextRecurringDate } from '@/utils/recurring'

function today() { return new Date().toISOString().slice(0, 10) }

export const useRecurringTransactionsStore = defineStore('recurringTransactions', () => {
  const syncing = ref(false)
  const lastCreatedCount = ref(0)

  async function sync() {
    const auth = useAuthStore()
    if (!auth.user || syncing.value) return 0
    syncing.value = true
    try {
      let count = 0
      const currentDate = today()
      const due = await recurringTransactionsService.due(currentDate)
      for (const recurring of due) {
        let execution = recurring.next_execution
        while (execution <= currentDate && (!recurring.end_on || execution <= recurring.end_on)) {
          count += await recurringTransactionsService.createOccurrence(recurring, execution)
          execution = nextRecurringDate(execution, recurring.frequency, {
            months: recurring.months,
            dayOfMonth: recurring.day_of_month,
          })
        }
        await recurringTransactionsService.update(recurring.id, {
          next_execution: execution,
          is_active: !recurring.end_on || execution <= recurring.end_on,
          last_synced_at: new Date().toISOString(),
        })
      }
      lastCreatedCount.value = count
      return count
    } finally {
      syncing.value = false
    }
  }

  async function create(payload: Omit<RecurringTransactionInsert, 'owner_id'>) {
    return recurringTransactionsService.create(payload)
  }

  return { syncing, lastCreatedCount, sync, create }
})
