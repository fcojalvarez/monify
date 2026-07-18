import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/config/env'

/**
 * Cliente Supabase tipado y compartido en toda la app.
 *
 * `persistSession` + `autoRefreshToken` mantienen el JWT en localStorage y lo
 * refrescan solos → de esto depende el guard del router para saber si hay sesión.
 *
 * Nota Capacitor (futuro): en nativo conviene sustituir el almacenamiento por
 * `@capacitor/preferences` pasando la opción `auth.storage`. El resto no cambia.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
