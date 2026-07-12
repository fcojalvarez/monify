import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Savings, SavingsTransaction } from '@/types'
import { savingsService } from '@/services/savings.service'
import { useTransactionsStore } from './transactions'
import { useCategoriesStore } from './categories'
import { todayISO } from '@/utils/format'

export const useSavingsStore = defineStore('savings', () => {
  const items = ref<Savings[]>([])
  const transactions = ref<SavingsTransaction[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [savingsList, transactionsList] = await Promise.all([
        savingsService.list(),
        savingsService.listTransactions(),
      ])
      items.value = savingsList
      transactions.value = transactionsList
    } catch (error) {
      console.error('Error fetching savings data:', error)
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Omit<Savings, 'id' | 'owner_id' | 'created_at' | 'balance'>) {
    const created = await savingsService.create(payload)
    items.value.push(created)
    return created
  }

  async function update(id: string, payload: Partial<Omit<Savings, 'id' | 'owner_id' | 'created_at'>>) {
    const updated = await savingsService.update(id, payload)
    const index = items.value.findIndex((s) => s.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function remove(id: string) {
    await savingsService.remove(id)
    items.value = items.value.filter((s) => s.id !== id)
    transactions.value = transactions.value.filter((t) => t.savings_id !== id)
  }

  interface TransferPayload {
    savingsId: string
    amount: number
    isDeposit: boolean // true = de principal a ahorros (ingreso en ahorro), false = de ahorro a principal (retirada de ahorro)
    note?: string
    familyMemberId: string
  }

  async function transfer(payload: TransferPayload) {
    const { savingsId, amount, isDeposit, note = '', familyMemberId } = payload
    
    const categoriesStore = useCategoriesStore()
    const transactionsStore = useTransactionsStore()

    const mainTxKind = isDeposit ? 'expense' : 'income'
    const savingsAmount = isDeposit ? amount : -amount

    // 1. Encontrar o crear la categoría de 'Ahorro' en la cuenta principal
    let category = categoriesStore.items.find(
      (c) => c.name.toLowerCase() === 'ahorros' && c.kind === mainTxKind,
    )

    if (!category) {
      category = await categoriesStore.create({
        name: 'Ahorros',
        icon: 'solar:safe-2-linear',
        color: '#8b5cf6',
        kind: mainTxKind,
      })
    }

    const savingsAccount = items.value.find((s) => s.id === savingsId)
    const accountName = savingsAccount ? savingsAccount.name : 'Ahorro'

    // 2. Crear movimiento en la cuenta principal
    await transactionsStore.create({
      kind: mainTxKind,
      amount,
      gross: null,
      category_id: category.id,
      family_member_id: familyMemberId,
      occurred_on: todayISO(),
      note: note.trim() 
        ? `${note.trim()} (${isDeposit ? 'Para' : 'Desde'} ${accountName})` 
        : `${isDeposit ? 'Aportación a' : 'Retirada de'} ${accountName}`,
    })

    // 3. Crear el movimiento en la cuenta de ahorros
    const savingsTx = await savingsService.createTransaction({
      savings_id: savingsId,
      amount: savingsAmount,
      note: note.trim() || null,
      occurred_on: todayISO(),
    })

    transactions.value.unshift(savingsTx)

    // 4. Recargar datos para tener los balances actualizados
    await Promise.all([
      fetchAll(),
      transactionsStore.fetch(),
    ])
  }

  return {
    items,
    transactions,
    loading,
    fetchAll,
    create,
    update,
    remove,
    transfer,
  }
})
