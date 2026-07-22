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
  /** Importe absoluto (siempre positivo); el signo lo determina `isDeposit`. */
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

  /**
   * Balance total de efectivo
   */
  const balance = computed(() => account.value?.balance ?? 0)

  /**
   * Balance de cada miembro
   */
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

  /**
   * Balance de un miembro
   */
  function memberBalance(memberId: string) {
    return balancesByMember.value.get(memberId) ?? 0
  }

  /**
   * Neto de efectivo (entradas − salidas) dentro de un rango de fechas inclusivo
   * (formato YYYY-MM-DD). Se usa para reflejar el efectivo del periodo activo.
   */
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

  /**
   * Cuenta
   */
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

  /**
   * Historial
   */
  async function fetchTransactions() {
    if (!account.value) {
      await fetch()
    }

    if (!account.value) {
      return
    }

    transactions.value = await cashService.getTransactions(account.value.id)
  }

  /**
   * Refrescar todo
   */
  async function refresh() {
    await fetch()
    await fetchTransactions()
  }

  /**
   * Devuelve el id de la categoría "Efectivo" para un tipo dado, creándola si no existe.
   * Delega en el store de categorías (que encapsula el acceso al servicio).
   */
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

  /**
   * Añadir efectivo
   */
  async function deposit(payload: CashMovementPayload) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    // 1. Registrar movimiento en la caja de efectivo
    await cashService.deposit(account.value.id, {
      amount: payload.amount,
      note: payload.note,
      familyMemberId: payload.familyMemberId!,
      occurredOn: payload.occurredAt,
    })

    // 2. Si se marca el check, crear el ingreso principal en las transacciones generales
    if (payload.shouldCreateMainTransaction) {
      const categoryId = await getOrCreateCashCategoryId('income')

      await transactionsService.create({
        transaction: {
          amount: payload.amount,
          kind: 'income',
          note: payload.note || 'Entrada de efectivo',
          family_member_id: payload.familyMemberId ?? '', // 👈 Corregido null
          occurred_on: payload.occurredAt || new Date().toISOString().split('T')[0],
          category_id: categoryId,
        },
      })

      // Refrescamos el store general de movimientos
      const transactionsStore = useTransactionsStore()
      await transactionsStore.fetch()
    }

    await refresh()
  }

  /**
   * Retirar efectivo
   */
  async function withdraw(payload: CashMovementPayload) {
    if (!account.value) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    // 1. Registrar la retirada en la caja de efectivo
    await cashService.withdraw(account.value.id, {
      amount: payload.amount,
      note: payload.note,
      familyMemberId: payload.familyMemberId!,
      occurredOn: payload.occurredAt,
    })

    // 2. Si se marca el check, crear el gasto principal en las transacciones generales
    if (payload.shouldCreateMainTransaction) {
      const categoryId = await getOrCreateCashCategoryId('expense')

      await transactionsService.create({
        transaction: {
          amount: payload.amount,
          kind: 'expense',
          note: payload.note || 'Salida de efectivo',
          family_member_id: payload.familyMemberId ?? '', // 👈 Corregido null
          occurred_on: payload.occurredAt || new Date().toISOString().split('T')[0],
          category_id: categoryId,
        },
      })

      // Refrescamos el store general de movimientos
      const transactionsStore = useTransactionsStore()
      await transactionsStore.fetch()
    }

    await refresh()
  }

  /**
   * Editar un movimiento de efectivo existente.
   */
  async function updateTransaction(id: string, payload: CashTransactionEditPayload) {
    await cashService.updateTransaction(id, {
      amount: signedAmount(payload.amount, payload.isDeposit),
      note: payload.note ?? null,
      family_member_id: payload.familyMemberId ?? undefined,
      occurred_on: payload.occurredOn,
    })

    await refresh()
  }

  /**
   * Eliminar un movimiento de efectivo existente.
   */
  async function deleteTransaction(id: string) {
    await cashService.deleteTransaction(id)
    await refresh()
  }

  /**
   * Balance manual
   */
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
