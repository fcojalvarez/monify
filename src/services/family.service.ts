import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type FamilyMember = Tables<'family_members'>
export type FamilyMemberInsert = TablesInsert<'family_members'>
export type FamilyMemberUpdate = TablesUpdate<'family_members'>

export const familyService = {
  /**
   * Obtiene la lista de miembros de la familia.
   * Coloca siempre al usuario principal ('is_self': true) al principio.
   */
  async list(): Promise<FamilyMember[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('is_self', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  /**
   * Crea un nuevo miembro inyectando automáticamente el owner_id del usuario autenticado.
   */
  async create(payload: Omit<FamilyMemberInsert, 'owner_id'>): Promise<FamilyMember> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const fullPayload: FamilyMemberInsert = {
      ...payload,
      owner_id: userData.user.id,
      cash_balance: payload.cash_balance ?? 0,
    }

    const { data, error } = await supabase
      .from('family_members')
      .insert(fullPayload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, changes: FamilyMemberUpdate): Promise<FamilyMember> {
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
   * Establece un saldo fijo de efectivo para el miembro.
   */
  async setCashBalance(id: string, balance: number): Promise<FamilyMember> {
    return this.update(id, {
      cash_balance: balance,
    })
  },

  /**
   * Modifica el saldo de efectivo de forma segura.
   * amount puede ser positivo (ingreso) o negativo (gasto).
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
