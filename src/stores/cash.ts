import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { cashService, type Cash, type CashTransaction } from '@/services/cash.service'
import { transactionsService } from '@/services/transactions.service'
import { signedAmount } from '@/utils/format'
import { useTransactionsStore } from './transactions'
import { useCategoriesStore } from './categories'

export interface CashMovementPayload {
  amount: number
  note?: string
  familyMemberId?: string | null
  shouldCreateMainTransaction?: boolean
  occurredAt?: string
}

export interface CashTransactionEditPayload {
  amount: number
  isDeposit: boolean
  note?: string | null
  familyMemberId?: string | null
  occurredOn?: string
}

export const useCashStore = defineStore('cash', () => {
  const account = ref<Cash | null>(null)
  const transactions = ref<CashTransaction[]>([])
  const loading = ref(false)

  const balance = computed(() => account.value?.balance ?? 0)

  const balancesByMember = computed(() => {
    const balances = new Map<string, number>()

    for (const transaction of transactions.value) {
      if (!transaction.family_member_id) continue

      balances.set(
        transaction.family_member_id,
        (balances.get(transaction.family_member_id) ?? 0) + transaction.amount,
      )
    }

    return balances
  })

  const totals = computed(() => {
    let income = 0
    let expense = 0
    for (const tx of transactions.value) {
      if (tx.amount > 0) {
        income += tx.amount
      } else {
        expense += tx.amount
      }
    }
    return {
      income,
      expense: Math.abs(expense),
    }
  })

  const totalIncome = computed(() => totals.value.income)
  const totalExpense = computed(() => totals.value.expense)

  function memberBalance(memberId: string) {
    return balancesByMember.value.get(memberId) ?? 0
  }

  // Neto de efectivo en un rango YYYY-MM-DD
  function netForRange(from: string, to: string) {
    let net = 0
    for (const tx of transactions.value) {
      const day = (tx.occurred_on ?? '').slice(0, 10)
      if (day >= from && day <= to) {
        net += tx.amount
      }
    }
    return net
  }

  async function fetch() {
    loading.value = true

    try {
      let cash = await cashService.get()

      if (!cash) {
        cash = await cashService.create()
      }

      account.value = cash
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions() {
    if (!account.value) {
      await fetch()
    }

    if (!account.value) {
      return
    }

    transactions.value = await cashService.getTransactions(account.value.id)
  }

  async function refresh() {
    await fetch()
    await fetchTransactions()
  }

  // Obtiene o crea la categoría de Efectivo en el store general
  async function getOrCreateCashCategoryId(kind: 'income' | 'expense'): Promise<string> {
    const categoriesStore = useCategoriesStore()
    const category = await categoriesStore.getOrCreate({
      name: 'Efectivo',
      kind,
      icon: 'solar:wallet-money-bold',
      color: kind === 'income' ? '#10b981' : '#f43f5e',
    })
    return category.id
  }

  async function deposit(payload: CashMovementPayload) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.deposit(account.value.id, {
      amount: payload.amount,
      note: payload.note,
      familyMemberId: payload.familyMemberId!,
      occurredOn: payload.occurredAt,
    })

    if (payload.shouldCreateMainTransaction) {
      const categoryId = await getOrCreateCashCategoryId('income')

      await transactionsService.create({
        transaction: {
          amount: payload.amount,
          kind: 'income',
          note: payload.note || 'Entrada de efectivo',
          family_member_id: payload.familyMemberId ?? '',
          occurred_on: payload.occurredAt || new Date().toISOString().split('T')[0],
          category_id: categoryId,
        },
      })

      const transactionsStore = useTransactionsStore()
      await transactionsStore.fetch()
    }

    await refresh()
  }

  async function withdraw(payload: CashMovementPayload) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.withdraw(account.value.id, {
      amount: payload.amount,
      note: payload.note,
      familyMemberId: payload.familyMemberId!,
      occurredOn: payload.occurredAt,
    })

    if (payload.shouldCreateMainTransaction) {
      const categoryId = await getOrCreateCashCategoryId('expense')

      await transactionsService.create({
        transaction: {
          amount: payload.amount,
          kind: 'expense',
          note: payload.note || 'Salida de efectivo',
          family_member_id: payload.familyMemberId ?? '',
          occurred_on: payload.occurredAt || new Date().toISOString().split('T')[0],
          category_id: categoryId,
        },
      })

      const transactionsStore = useTransactionsStore()
      await transactionsStore.fetch()
    }

    await refresh()
  }

  async function updateTransaction(id: string, payload: CashTransactionEditPayload) {
    await cashService.updateTransaction(id, {
      amount: signedAmount(payload.amount, payload.isDeposit),
      note: payload.note ?? null,
      family_member_id: payload.familyMemberId ?? undefined,
      occurred_on: payload.occurredOn,
    })

    await refresh()
  }

  async function deleteTransaction(id: string) {
    await cashService.deleteTransaction(id)
    await refresh()
  }

  async function setBalance(balance: number) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await cashService.setBalance(account.value.id, balance)

    await refresh()
  }

  function $reset() {
    account.value = null
    transactions.value = []
    loading.value = false
  }

  return {
    account,
    transactions,

    loading,

    balance,
    balancesByMember,
    totalIncome,
    totalExpense,

    memberBalance,
    netForRange,

    fetch,
    fetchTransactions,
    refresh,

    deposit,
    withdraw,
    updateTransaction,
    deleteTransaction,
    setBalance,

    $reset,
  }
})
