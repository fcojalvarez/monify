import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

/**
 * Servicio para gestionar el perfil del usuario almacenado
 * en la tabla `profiles`.
 */
export const profileService = {
  async getProfile(): Promise<Profile | null> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) return null

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (error) throw error

    return data
  },

  async update(data: Partial<Profile>): Promise<Profile> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    return profile
  },
}
