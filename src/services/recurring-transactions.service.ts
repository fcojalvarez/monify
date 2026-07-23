import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type RecurringTransaction = Tables<'recurring_transactions'>
export type RecurringTransactionInsert = TablesInsert<'recurring_transactions'>

export const recurringTransactionsService = {
  async create(payload: Omit<RecurringTransactionInsert, 'owner_id'>) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async list() {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .order('next_execution')
    if (error) throw error
    return data
  },

  async update(id: string, values: TablesUpdate<'recurring_transactions'>) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async due(today: string) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution', today)
      .order('next_execution')
    if (error) throw error
    return data
  },

  async createOccurrence(recurring: RecurringTransaction, occurredOn: string) {
    const { data, error } = await supabase
      .from('transactions')
      .upsert({
        owner_id: recurring.owner_id,
        kind: recurring.kind,
        gross: recurring.gross,
        amount: recurring.amount,
        category_id: recurring.category_id,
        family_member_id: recurring.family_member_id,
        payment_method: recurring.payment_method,
        note: recurring.note,
        occurred_on: occurredOn,
        recurring_transaction_id: recurring.id,
        occurrence_date: occurredOn,
      }, { onConflict: 'recurring_transaction_id,occurrence_date', ignoreDuplicates: true })
      .select('id')
    if (error) throw error
    return data?.length ? 1 : 0
  },

  async remove(id: string, options?: { deleteHistory?: boolean }) {
    if (options && options.deleteHistory) {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('recurring_transaction_id', id)
      if (deleteError) throw deleteError
    } else {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ recurring_transaction_id: null })
        .eq('recurring_transaction_id', id)
      if (updateError) throw updateError
    }

    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
