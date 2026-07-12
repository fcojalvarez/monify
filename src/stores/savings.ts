import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Savings, SavingsTransaction } from '@/types'
import { savingsService } from '@/services/savings.service'
import { useTransactionsStore } from './transactions'
import { useCategoriesStore } from './categories'
import { todayISO } from '@/utils/format'

export interface TransferPayload {
  savingsId: string
  amount: number
  isDeposit: boolean // true = de principal a ahorros (ingreso en ahorro), false = de ahorro a principal (retirada de ahorro)
  note?: string
  familyMemberId: string
  shouldCreateMainTransaction?: boolean
}

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

      // Garantizar que la cuenta de ahorro general siempre exista
      let general = savingsList.find((s) => s.name === 'general')

      if (!general) {
        general = await savingsService.create({
          name: 'general',
          target: null,
          color: '#8b5cf6',
        })

        items.value.push(general)
      }
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

  async function update(
    id: string,
    payload: Partial<Omit<Savings, 'id' | 'owner_id' | 'created_at'>>,
  ) {
    const updated = await savingsService.update(id, payload)

    const index = items.value.findIndex((s) => s.id === id)

    if (index !== -1) {
      items.value[index] = updated
    }

    return updated
  }

  async function remove(id: string) {
    await savingsService.remove(id)

    items.value = items.value.filter((s) => s.id !== id)
    transactions.value = transactions.value.filter((t) => t.savings_id !== id)
  }

  async function transfer(payload: TransferPayload) {
    const {
      savingsId,
      amount,
      isDeposit,
      note = '',
      familyMemberId,
      shouldCreateMainTransaction = true,
    } = payload

    const categoriesStore = useCategoriesStore()
    const transactionsStore = useTransactionsStore()

    const mainTxKind = isDeposit ? 'expense' : 'income'
    const savingsAmount = isDeposit ? amount : -amount

    const savingsAccount = items.value.find((s) => s.id === savingsId)
    const isGeneral = savingsAccount?.name === 'general'

    const accountName = savingsAccount
      ? isGeneral
        ? 'Ahorro general'
        : savingsAccount.name
      : 'Ahorro'

    // 1. Crear movimiento en la cuenta principal si se solicita
    if (shouldCreateMainTransaction) {
      await categoriesStore.fetchAll()

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

      const defaultNote = isDeposit
        ? isGeneral
          ? 'Aportación a Ahorros'
          : `Aportación a ${accountName}`
        : isGeneral
          ? 'Retirada de Ahorros'
          : `Retirada de ${accountName}`

      await transactionsStore.create({
        kind: mainTxKind,
        amount,
        gross: null,
        category_id: category.id,
        family_member_id: familyMemberId,
        occurred_on: todayISO(),
        note: note.trim()
          ? isGeneral
            ? note.trim()
            : `${note.trim()} (${isDeposit ? 'Para' : 'Desde'} ${accountName})`
          : defaultNote,
      })
    }

    // 2. Crear el movimiento en la cuenta de ahorros
    const savingsTx = await savingsService.createTransaction({
      savings_id: savingsId,
      amount: savingsAmount,
      note: note.trim() || null,
      occurred_on: todayISO(),
    })

    transactions.value.unshift(savingsTx)

    // 3. Recargar datos para tener los balances actualizados
    const promises: Promise<any>[] = [fetchAll()]

    if (shouldCreateMainTransaction) {
      promises.push(transactionsStore.fetch())
    }

    await Promise.all(promises)
  }

  function $reset() {
    items.value = []
    transactions.value = []
    loading.value = false
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
    $reset,
  }
})
