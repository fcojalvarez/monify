/**
 * Punto único de acceso a las variables de entorno.
 * Falla rápido en arranque si falta alguna variable crítica,
 * en lugar de dar errores oscuros más adelante.
 */
function required(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(
      `[Monify] Falta la variable de entorno "${key}". ` +
        `Copia .env.example a .env y rellénala.`,
    )
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  authRedirectUrl: import.meta.env.VITE_AUTH_REDIRECT_URL ?? window.location.origin,
  appName: import.meta.env.VITE_APP_NAME ?? 'Monify',
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY ?? 'EUR',
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? 'es-ES',
} as const
