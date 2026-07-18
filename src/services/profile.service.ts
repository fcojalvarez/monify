import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database.types'

export type Profile = Tables<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

/**
 * Servicio para gestionar el perfil del usuario almacenado
 * en la tabla `profiles`.
 */
export const profileService = {
  /**
   * Obtiene el perfil de la base de datos correspondiente al usuario autenticado actual.
   */
  async getProfile(): Promise<Profile | null> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    return data
  },

  /**
   * Actualiza los datos del perfil del usuario actual.
   */
  async update(changes: ProfileUpdate): Promise<Profile> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) {
      throw new Error('Usuario no autenticado.')
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return profile
  },
}
