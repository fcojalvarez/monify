import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { cashService, type Cash, type CashTransaction } from '@/services/cash.service'
import { transactionsService } from '@/services/transactions.service'
import { useTransactionsStore } from './transactions'
import { useCategoriesStore } from './categories'

export interface CashMovementPayload {
  amount: number
  note?: string
  familyMemberId?: string | null
  shouldCreateMainTransaction?: boolean
  occurredAt?: string
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

  /**
   * Total de entradas
   */
  const totalIncome = computed(() =>
    transactions.value
      .filter((tx: any) => tx.amount > 0)
      .reduce((sum: number, tx: any) => sum + tx.amount, 0),
  )

  /**
   * Total de salidas
   */
  const totalExpense = computed(() =>
    Math.abs(
      transactions.value
        .filter((tx: any) => tx.amount < 0)
        .reduce((sum: number, tx: any) => sum + tx.amount, 0),
    ),
  )

  /**
   * Balance de un miembro
   */
  function memberBalance(memberId: string) {
    return balancesByMember.value.get(memberId) ?? 0
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
   * Busca la categoría "Efectivo" para un tipo específico ('income' o 'expense').
   * Si no existe, la crea al vuelo.
   */
  async function getOrCreateCashCategoryId(kind: 'income' | 'expense'): Promise<string> {
    const categoriesStore = useCategoriesStore()
    const categoriesList = categoriesStore.items // 👈 Corregido para no usar rawItems

    // 1. Buscar si ya existe la categoría "Efectivo" que coincida con el tipo (kind) requerido
    const existingCategory = categoriesList.find(
      (c: any) => c.name.toLowerCase() === 'efectivo' && c.kind === kind,
    )

    if (existingCategory) {
      return existingCategory.id
    }

    // 2. Si no existe para ese tipo, la creamos en la base de datos
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: 'Efectivo',
        color: kind === 'income' ? '#10b981' : '#f43f5e', // Verde para ingresos, Rosa/Rojo para gastos
        icon: 'solar:wallet-money-bold',
        kind: kind, // Guardamos 'income' o 'expense' según corresponda
      })
      .select()
      .single()

    if (error) {
      console.error(`Error al auto-crear la categoría de Efectivo (${kind}):`, error)

      // Salvavidas: si falla, intentamos devolver una del mismo tipo que ya exista
      const fallbackSameKind = categoriesList.find((c: any) => c.kind === kind)
      if (fallbackSameKind) return fallbackSameKind.id

      if (categoriesList.length > 0) return categoriesList[0].id
      throw new Error('No se pudo encontrar ni crear una categoría para el movimiento.')
    }

    // 3. Insertamos la categoría creada directamente en items
    categoriesStore.items.push(newCategory)

    return newCategory.id
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
      familyMemberId: payload.familyMemberId,
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
      familyMemberId: payload.familyMemberId,
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

    fetch,
    fetchTransactions,
    refresh,

    deposit,
    withdraw,
    setBalance,

    $reset,
  }
})
