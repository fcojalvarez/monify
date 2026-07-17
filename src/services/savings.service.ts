import { supabase } from '@/lib/supabase'
import type { Savings, SavingsTransaction, TablesInsert, TablesUpdate } from '@/types'

export const savingsService = {
  async list(): Promise<Savings[]> {
    const { data, error } = await supabase
      .from('savings')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return data as Savings[]
  },

  async create(payload: Omit<TablesInsert<'savings'>, 'owner_id'>): Promise<Savings> {
    const { data, error } = await supabase.from('savings').insert(payload).select('*').single()

    if (error) throw error

    return data as Savings
  },

  async update(id: string, payload: TablesUpdate<'savings'>): Promise<Savings> {
    const { data, error } = await supabase
      .from('savings')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return data as Savings
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('savings').delete().eq('id', id)

    if (error) throw error
  },

  async listTransactions(savingsId?: string): Promise<SavingsTransaction[]> {
    let query = supabase
      .from('savings_transactions')
      .select('*')
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })

    if (savingsId) {
      query = query.eq('savings_id', savingsId)
    }

    const { data, error } = await query

    if (error) throw error

    return data as SavingsTransaction[]
  },

  async createTransaction(
    payload: Omit<TablesInsert<'savings_transactions'>, 'owner_id'>,
  ): Promise<SavingsTransaction> {
    const { data, error } = await supabase
      .from('savings_transactions')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    return data as SavingsTransaction
  },
}
