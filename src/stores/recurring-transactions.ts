import { defineStore } from 'pinia'
import { ref } from 'vue'
import { recurringTransactionsService, type RecurringTransactionInsert } from '@/services/recurring-transactions.service'
import { useAuthStore } from './auth'
import { nextRecurringDate } from '@/utils/recurring'
import { useCategoriesStore } from './categories'
import { useFamilyStore } from './family'
import { formatCurrency } from '@/utils/format'
import { sendNotification } from '@/utils/notification'

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
      const categoriesStore = useCategoriesStore()
      const familyStore = useFamilyStore()

      for (const recurring of due) {
        let execution = recurring.next_execution
        while (execution <= currentDate && (!recurring.end_on || execution <= recurring.end_on)) {
          const created = await recurringTransactionsService.createOccurrence(recurring, execution)
          if (created > 0) {
            count += created

            // Buscar los nombres correspondientes en los catálogos cargados
            const category = categoriesStore.items.find((c) => c.id === recurring.category_id)
            const member = familyStore.items.find((m) => m.id === recurring.family_member_id)

            const categoryName = category ? category.name : 'Sin categoría'
            const memberName = member ? member.name : ''

            // Generar cuerpo descriptivo
            const amountStr = formatCurrency(recurring.amount)
            const kindText = recurring.kind === 'income' ? 'un ingreso' : 'un gasto'

            let body = `Se ha registrado ${kindText} de ${amountStr} en la categoría "${categoryName}".`
            if (recurring.note) {
              body += ` Nota: ${recurring.note}.`
            }
            if (memberName) {
              body += ` Perteneciente a: ${memberName}.`
            }

            // Enviar la notificación local / web de manera asíncrona
            void sendNotification('Movimiento recurrente creado', body)
          }

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
