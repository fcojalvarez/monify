import { env } from '@/config/env'
import { useUiStore } from '@/stores/ui'

/** Formatea un importe como moneda usando el locale/divisa por defecto. */
export function formatCurrency(
  amount: number,
  options: { currency?: string; locale?: string; signDisplay?: 'auto' | 'never' | 'always' } = {},
): string {
  let activeCurrency = options.currency
  let activeLocale = options.locale

  try {
    const ui = useUiStore()
    if (!activeCurrency) activeCurrency = ui.currency
    if (!activeLocale) activeLocale = ui.locale
  } catch (e) {
    // Silently fall back if Pinia is not initialized
  }

  const {
    currency = activeCurrency || env.defaultCurrency,
    locale = activeLocale || env.defaultLocale,
    signDisplay = 'auto',
  } = options

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay,
  }).format(amount)
}

/** Formatea una fecha ISO (YYYY-MM-DD) de forma legible. */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  let activeLocale = env.defaultLocale

  try {
    const ui = useUiStore()
    activeLocale = ui.locale
  } catch (e) {
    // Silently fall back
  }

  return new Intl.DateTimeFormat(activeLocale, options).format(new Date(isoDate))
}

/** Devuelve la fecha de hoy como YYYY-MM-DD (sin desfase de zona horaria). */
export function todayISO(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

/** Primer y último día del mes de una fecha dada (para consultas por periodo). */
export function monthRange(reference: Date = new Date()): { from: string; to: string } {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  }
}
