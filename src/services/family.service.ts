import { supabase } from '@/lib/supabase'
import type { FamilyMember, TablesInsert, TablesUpdate } from '@/types'

export const familyService = {
  async list(): Promise<FamilyMember[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('is_self', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return data
  },

  async create(payload: Omit<TablesInsert<'family_members'>, 'owner_id'>): Promise<FamilyMember> {
    const { data, error } = await supabase.from('family_members').insert(payload).select().single()

    if (error) throw error

    return data
  },

  async update(id: string, changes: TablesUpdate<'family_members'>): Promise<FamilyMember> {
    const { data, error } = await supabase
      .from('family_members')
      .update(changes)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  },

  /**
   * Establece el saldo de efectivo del miembro.
   */
  async setCashBalance(id: string, balance: number): Promise<FamilyMember> {
    return this.update(id, {
      cash_balance: balance,
    })
  },

  /**
   * Incrementa o decrementa el saldo de efectivo.
   * amount puede ser positivo o negativo.
   */
  async changeCashBalance(id: string, amount: number): Promise<FamilyMember> {
    const { data: member, error } = await supabase
      .from('family_members')
      .select('cash_balance')
      .eq('id', id)
      .single()

    if (error) throw error

    const newBalance = member.cash_balance + amount

    if (newBalance < 0) {
      throw new Error('El miembro no dispone de suficiente efectivo.')
    }

    return this.update(id, {
      cash_balance: newBalance,
    })
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('family_members').delete().eq('id', id)

    if (error) throw error
  },
}
