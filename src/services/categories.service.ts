import { supabase } from '@/lib/supabase'
import type { Category, TablesInsert, TablesUpdate } from '@/types'

export const categoriesService = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  async create(payload: Omit<TablesInsert<'categories'>, 'owner_id'>): Promise<Category> {
    const { data, error } = await supabase.from('categories').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, changes: TablesUpdate<'categories'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
