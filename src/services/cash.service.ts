import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Cash = Tables<'cash'>
export type CashInsert = TablesInsert<'cash'>
export type CashUpdate = TablesUpdate<'cash'>

export type CashTransaction = Tables<'cash_transactions'>
export type CashTransactionInsert = TablesInsert<'cash_transactions'>

export interface CashMovementOptions {
  amount: number
  familyMemberId?: string | null
  note?: string
}

export const cashService = {
  /**
   * Cuenta de efectivo
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

    // 1. Buscamos tu miembro de la familia (el que tiene is_self: true)
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
   * Historial
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
   * Ingreso
   */
  async deposit(cashId: string, options: CashMovementOptions) {
    const cash = await this.get()

    if (!cash) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    await this.addTransaction({
      cash_id: cashId,
      owner_id: cash.owner_id,
      amount: options.amount,
      note: options.note ?? null,
      family_member_id: options.familyMemberId || '',
    })

    return this.update(cashId, {
      balance: cash.balance + options.amount,
    })
  },

  /**
   * Retirada
   */
  async withdraw(cashId: string, options: CashMovementOptions) {
    const cash = await this.get()

    if (!cash) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    if (cash.balance < options.amount) {
      throw new Error('No puedes retirar más efectivo del disponible.')
    }

    await this.addTransaction({
      cash_id: cashId,
      owner_id: cash.owner_id,
      amount: -options.amount,
      note: options.note ?? null,
      family_member_id: options.familyMemberId || '',
    })

    return this.update(cashId, {
      balance: cash.balance - options.amount,
    })
  },

  async delete(id: string) {
    const { error } = await supabase.from('cash').delete().eq('id', id)

    if (error) throw error
  },
}
