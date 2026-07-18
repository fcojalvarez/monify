import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Savings, SavingsTransaction } from '@/types'
import { savingsService } from '@/services/savings.service'
import { useTransactionsStore } from './transactions'
import { useCategoriesStore } from './categories'
import { todayISO } from '@/utils/format'

export interface TransferPayload {
  savingsId: string
  amount: number
  isDeposit: boolean
  note?: string
  familyMemberId: string
  shouldCreateMainTransaction?: boolean
}

export const useSavingsStore = defineStore('savings', () => {
  const items = ref<Savings[]>([])
  const transactions = ref<SavingsTransaction[]>([])
  const loading = ref(false)

  /**
   * Computados (Filtrados para mostrar solo metas activas en las tarjetas)
   */
  const bankSavings = computed(() =>
    items.value.filter((s) => s.type === 'bank' && s.status === 'active'),
  )

  const cashSavings = computed(() =>
    items.value.filter((s) => s.type === 'cash' && s.status === 'active'),
  )

  const bankBalance = computed(() =>
    items.value.filter((s) => s.type === 'bank').reduce((sum, s) => sum + s.balance, 0),
  )

  const cashBalance = computed(() =>
    items.value.filter((s) => s.type === 'cash').reduce((sum, s) => sum + s.balance, 0),
  )

  function getByType(type: 'bank' | 'cash') {
    return items.value.filter((s) => s.type === type && s.status === 'active')
  }

  async function fetchAll() {
    loading.value = true

    try {
      const [savingsList, transactionsList] = await Promise.all([
        savingsService.list(),
        savingsService.listTransactions(),
      ])

      items.value = savingsList
      transactions.value = transactionsList

      const defaults = [
        {
          name: 'general',
          type: 'bank' as const,
          color: '#8b5cf6',
        },
        {
          name: 'general',
          type: 'cash' as const,
          color: '#f59e0b',
        },
      ]

      for (const account of defaults) {
        const exists = items.value.find((s) => s.name === account.name && s.type === account.type)

        if (!exists) {
          const created = await savingsService.create({
            name: account.name,
            target: null,
            color: account.color,
            type: account.type,
            status: 'active', // Estado inicial por defecto
          })

          items.value.push(created)
        }
      }
    } catch (error) {
      console.error('Error fetching savings data:', error)
    } finally {
      loading.value = false
    }
  }

  async function create(
    payload: Omit<Savings, 'id' | 'owner_id' | 'created_at' | 'balance' | 'status'>,
  ) {
    // Si el payload no trae status, aseguramos que se cree como 'active'
    const finalPayload = { ...payload, status: 'active' as const }
    const created = await savingsService.create(finalPayload)
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
      items.value[index] = { ...items.value[index], ...updated }
    }

    return updated
  }

  async function complete(id: string) {
    return await update(id, { status: 'completed' } as any)
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

    if (!savingsAccount) {
      throw new Error('No existe la cuenta de ahorro.')
    }

    const isGeneral = savingsAccount.name === 'general'

    const accountName = isGeneral
      ? savingsAccount.type === 'cash'
        ? 'Ahorro en efectivo'
        : 'Ahorro bancario'
      : savingsAccount.name

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

      const defaultNote = isDeposit ? `Aportación a ${accountName}` : `Retirada de ${accountName}`

      await transactionsStore.create({
        transaction: {
          amount,
          kind: mainTxKind,
          category_id: category.id,
          note: note || defaultNote,
          occurred_on: todayISO(),
          family_member_id: familyMemberId,
        },
        gross: 0,
      })
    }

    const savingsTx = await savingsService.createTransaction({
      savings_id: savingsId,
      amount: savingsAmount,
      note: note.trim() || null,
      occurred_on: todayISO(),
    })

    transactions.value.unshift(savingsTx)

    await fetchAll()

    if (shouldCreateMainTransaction) {
      await transactionsStore.fetch()
    }
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
    bankSavings,
    cashSavings,
    bankBalance,
    cashBalance,
    fetchAll,
    create,
    update,
    complete,
    remove,
    transfer,
    getByType,
    $reset,
  }
})
