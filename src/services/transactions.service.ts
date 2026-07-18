import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Transaction = Tables<'transactions'>
export type TransactionInsert = TablesInsert<'transactions'>
export type TransactionUpdate = TablesUpdate<'transactions'>

type RelatedCategory = Pick<Tables<'categories'>, 'id' | 'name' | 'icon' | 'color' | 'kind'>
type RelatedFamilyMember = Pick<Tables<'family_members'>, 'id' | 'name' | 'color' | 'avatar_icon'>

export interface TransactionWithRelations extends Transaction {
  category: RelatedCategory | null
  family_member: RelatedFamilyMember | null
}

const SELECT_WITH_RELATIONS = `
  *,
  category:categories (
    id,
    name,
    icon,
    color,
    kind
  ),
  family_member:family_members (
    id,
    name,
    color,
    avatar_icon
  )
` as const

export interface TransactionFilters {
  from?: string
  to?: string
  familyMemberId?: string
  categoryId?: string
}

export interface CreateTransactionOptions {
  transaction: Omit<TransactionInsert, 'owner_id'>
  useCash?: boolean
}

export const transactionsService = {
  /**
   * Obtiene el listado de transacciones generales aplicando filtros opcionales.
   */
  async list(filters: TransactionFilters = {}): Promise<TransactionWithRelations[]> {
    let query = supabase
      .from('transactions')
      .select(SELECT_WITH_RELATIONS)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters.from) {
      query = query.gte('occurred_on', filters.from)
    }

    if (filters.to) {
      query = query.lte('occurred_on', filters.to)
    }

    if (filters.familyMemberId) {
      query = query.eq('family_member_id', filters.familyMemberId)
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    const { data, error } = await query
    if (error) throw error

    // Retorna la data tipada de forma limpia
    return data as unknown as TransactionWithRelations[]
  },

  /**
   * Registra una nueva transacción inyectando automáticamente el owner_id de la sesión.
   */
  async create({ transaction }: CreateTransactionOptions): Promise<TransactionWithRelations> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const fullPayload: TransactionInsert = {
      ...transaction,
      owner_id: userData.user.id,
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(fullPayload)
      .select(SELECT_WITH_RELATIONS)
      .single()

    if (error) throw error
    return data as unknown as TransactionWithRelations
  },

  /**
   * Actualiza los datos de una transacción existente.
   */
  async update(id: string, changes: TransactionUpdate): Promise<TransactionWithRelations> {
    const { data, error } = await supabase
      .from('transactions')
      .update(changes)
      .eq('id', id)
      .select(SELECT_WITH_RELATIONS)
      .single()

    if (error) throw error
    return data as unknown as TransactionWithRelations
  },

  /**
   * Elimina una transacción de forma definitiva.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) throw error
  },
}
