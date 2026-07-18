import { supabase } from '@/lib/supabase'
import { env } from '@/config/env'
import type { Session, User } from '@supabase/supabase-js'

/**
 * Servicio de autenticación. Encapsula la Auth API de Supabase para que los
 * stores/vistas no conozcan los detalles del SDK.
 */
export const authService = {
  async signIn(email: string, password: string): Promise<Session | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },

  async signUp(email: string, password: string, displayName: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: env.authRedirectUrl,
        data: { display_name: displayName },
      },
    })
    if (error) throw error
    return data.user
  },

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.appUrl}/reset-password`,
    })
    if (error) throw error
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  async updateProfile(displayName: string): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    })
    if (error) throw error
    return data.user as User
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
    return subscription
  },
}
