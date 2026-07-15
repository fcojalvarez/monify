import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Cash = Tables<'cash'>
export type CashInsert = TablesInsert<'cash'>
export type CashUpdate = TablesUpdate<'cash'>

export const cashService = {
  async get() {
    const { data, error } = await supabase.from('cash').select('*').maybeSingle()

    if (error) throw error

    return data
  },

  async create() {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const payload: CashInsert = {
      owner_id: userData.user.id,
      balance: 0,
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

  async deposit(id: string, amount: number) {
    const cash = await this.get()

    if (!cash) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    return this.update(id, {
      balance: cash.balance + amount,
    })
  },

  async withdraw(id: string, amount: number) {
    const cash = await this.get()

    if (!cash) {
      throw new Error('No existe la cuenta de efectivo.')
    }

    return this.update(id, {
      balance: cash.balance - amount,
    })
  },

  async delete(id: string) {
    const { error } = await supabase.from('cash').delete().eq('id', id)

    if (error) throw error
  },
}
