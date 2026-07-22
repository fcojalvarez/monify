import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'
import { todayISO } from '@/utils/format'

export type Cash = Tables<'cash'>
export type CashInsert = TablesInsert<'cash'>
export type CashUpdate = TablesUpdate<'cash'>

export type CashTransaction = Tables<'cash_transactions'>
export type CashTransactionInsert = TablesInsert<'cash_transactions'>

export interface CashMovementOptions {
  amount: number
  familyMemberId: string
  note?: string
  occurredOn?: string
}

export const cashService = {
  /**
   * Cuenta de efectivo principal del usuario autenticado
   */
  async get() {
    const { data, error } = await supabase.from('cash').select('*').maybeSingle()
    if (error) throw error
    return data
  },

  async create() {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('id')
      .eq('owner_id', userData.user.id)
      .eq('is_self', true)
      .maybeSingle()

    if (memberError || !memberData) {
      throw new Error(
        'No se encontró el miembro principal de la familia para configurar la cartera de efectivo.',
      )
    }

    const payload: CashInsert = {
      owner_id: userData.user.id,
      balance: 0,
      family_member_id: memberData.id,
    }

    const { data, error } = await supabase.from('cash').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, values: CashUpdate) {
    const { data, error } = await supabase
      .from('cash')
      .update(values)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async setBalance(id: string, balance: number) {
    return this.update(id, { balance })
  },

  /**
   * Historial de transacciones de la caja de efectivo
   */
  async getTransactions(cashId: string) {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select(
        `
          *,
          family_member:family_members(*)
        `,
      )
      .eq('cash_id', cashId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async addTransaction(payload: CashTransactionInsert) {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Registra un ingreso de efectivo
   */
  async deposit(cashId: string, options: CashMovementOptions) {
    const cash = await this.get()
    if (!cash) throw new Error('No existe la cuenta de efectivo.')

    await this.addTransaction({
      cash_id: cashId,
      owner_id: cash.owner_id,
      amount: Math.abs(options.amount), // Nos aseguramos de que el ingreso sume
      note: options.note ?? null,
      family_member_id: options.familyMemberId!,
      occurred_on: options.occurredOn ?? todayISO(),
    })

    return this.update(cashId, {
      balance: cash.balance + Math.abs(options.amount),
    })
  },

  /**
   * Registra una retirada de efectivo
   */
  async withdraw(cashId: string, options: CashMovementOptions) {
    const cash = await this.get()
    if (!cash) throw new Error('No existe la cuenta de efectivo.')

    const targetAmount = Math.abs(options.amount)
    if (cash.balance < targetAmount) {
      throw new Error('No puedes retirar más efectivo del disponible.')
    }

    await this.addTransaction({
      cash_id: cashId,
      owner_id: cash.owner_id,
      amount: -targetAmount,
      note: options.note ?? null,
      family_member_id: options.familyMemberId,
      occurred_on: options.occurredOn ?? todayISO(),
    })

    return this.update(cashId, {
      balance: cash.balance - targetAmount,
    })
  },

  /**
   * Recalcula el saldo de una caja como la suma de todos sus movimientos.
   * Es idempotente: fija el valor absoluto correcto, por lo que es seguro
   * aunque exista (o no) un trigger que ajuste el saldo en la BD.
   */
  async recalcBalance(cashId: string) {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('amount')
      .eq('cash_id', cashId)

    if (error) throw error

    const balance = (data ?? []).reduce((sum, row) => sum + row.amount, 0)
    return this.setBalance(cashId, balance)
  },

  /**
   * Edita un movimiento de efectivo y recalcula el saldo de su caja.
   */
  async updateTransaction(
    id: string,
    values: TablesUpdate<'cash_transactions'>,
  ) {
    const { data, error } = await supabase
      .from('cash_transactions')
      .update(values)
      .eq('id', id)
      .select('*, family_member:family_members(*)')
      .single()

    if (error) throw error

    await this.recalcBalance(data.cash_id)
    return data
  },

  /**
   * Elimina un movimiento de efectivo y recalcula el saldo de su caja.
   */
  async deleteTransaction(id: string) {
    const { data: existing, error: fetchError } = await supabase
      .from('cash_transactions')
      .select('cash_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase.from('cash_transactions').delete().eq('id', id)
    if (error) throw error

    await this.recalcBalance(existing.cash_id)
  },

  async delete(id: string) {
    const { error } = await supabase.from('cash').delete().eq('id', id)
    if (error) throw error
  },
}
