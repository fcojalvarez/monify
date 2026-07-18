import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Savings = Tables<'savings'>
export type SavingsInsert = TablesInsert<'savings'>
export type SavingsUpdate = TablesUpdate<'savings'>

export type SavingsTransaction = Tables<'savings_transactions'>
export type SavingsTransactionInsert = TablesInsert<'savings_transactions'>

export const savingsService = {
  /**
   * Obtiene la lista completa de fondos de ahorro (huchas) del usuario.
   */
  async list(): Promise<Savings[]> {
    const { data, error } = await supabase
      .from('savings')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  /**
   * Crea una nueva hucha inyectando automáticamente el owner_id del usuario.
   */
  async create(payload: Omit<SavingsInsert, 'owner_id'>): Promise<Savings> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const fullPayload: SavingsInsert = {
      ...payload,
      owner_id: userData.user.id,
      balance: payload.balance ?? 0,
    }

    const { data, error } = await supabase.from('savings').insert(fullPayload).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, payload: SavingsUpdate): Promise<Savings> {
    const { data, error } = await supabase
      .from('savings')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('savings').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Obtiene el historial de movimientos de ahorros, filtrado opcionalmente por una hucha específica.
   */
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
    return data
  },

  /**
   * Registra un movimiento en el historial de ahorros inyectando el owner_id de la sesión actual.
   */
  async createTransaction(
    payload: Omit<SavingsTransactionInsert, 'owner_id'>,
  ): Promise<SavingsTransaction> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const fullPayload: SavingsTransactionInsert = {
      ...payload,
      owner_id: userData.user.id,
    }

    const { data, error } = await supabase
      .from('savings_transactions')
      .insert(fullPayload)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
