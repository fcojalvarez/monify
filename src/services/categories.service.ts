import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Category = Tables<'categories'>
export type CategoryInsert = TablesInsert<'categories'>
export type CategoryUpdate = TablesUpdate<'categories'>

export const categoriesService = {
  /**
   * Obtiene la lista completa de categorías del usuario
   */
  async list(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data
  },

  /**
   * Crea una nueva categoría inyectando automáticamente el owner_id del usuario autenticado
   */
  async create(payload: Omit<CategoryInsert, 'owner_id'>): Promise<Category> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuario no autenticado.')

    const fullPayload: CategoryInsert = {
      ...payload,
      owner_id: userData.user.id,
    }

    const { data, error } = await supabase.from('categories').insert(fullPayload).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, changes: CategoryUpdate): Promise<Category> {
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
