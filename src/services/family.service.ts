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

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('family_members').delete().eq('id', id)
    if (error) throw error
  },
}
