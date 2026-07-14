import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate, TransactionWithRelations } from '@/types'

const SELECT_WITH_RELATIONS = `
  *,
  category:categories ( id, name, icon, color, kind ),
  family_member:family_members ( id, name, color, avatar_icon )
` as const

export interface TransactionFilters {
  from?: string
  to?: string
  familyMemberId?: string
  categoryId?: string
}

export const transactionsService = {
  async list(filters: TransactionFilters = {}): Promise<TransactionWithRelations[]> {
    let query = supabase
      .from('transactions')
      .select(SELECT_WITH_RELATIONS)
      .order('occurred_on', { ascending: false })

    if (filters.from) query = query.gte('occurred_on', filters.from)
    if (filters.to) query = query.lte('occurred_on', filters.to)
    if (filters.familyMemberId) query = query.eq('family_member_id', filters.familyMemberId)
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)

    const { data, error } = await query
    if (error) throw error
    return data as unknown as TransactionWithRelations[]
  },

  async create(
    payload: Omit<TablesInsert<'transactions'>, 'owner_id'>,
  ): Promise<TransactionWithRelations> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return data as unknown as TransactionWithRelations
  },

  async update(
    id: string,
    changes: TablesUpdate<'transactions'>,
  ): Promise<TransactionWithRelations> {
    const { data, error } = await supabase
      .from('transactions')
      .update(changes)
      .eq('id', id)
      .select(SELECT_WITH_RELATIONS)
      .single()
    if (error) throw error
    return data as unknown as TransactionWithRelations
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}
