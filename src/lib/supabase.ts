import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/config/env'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// Adaptador de almacenamiento híbrido que usa @capacitor/preferences en nativo
// y localStorage en la web para una persistencia de sesión segura y robusta.
const hybridStorage = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      return Preferences.get({ key }).then((res) => res.value)
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key)
    }
    return null
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      return Preferences.set({ key, value })
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string): void | Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      return Preferences.remove({ key })
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  },
}

/**
 * Cliente Supabase tipado y compartido en toda la app.
 *
 * `persistSession` + `autoRefreshToken` mantienen el JWT usando nuestro storage híbrido.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storage: hybridStorage,
  },
})
