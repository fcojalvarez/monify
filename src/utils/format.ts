import { env } from '@/config/env'
import { getIntlLocale } from '@/i18n'

// Caché en memoria para reutilizar instancias de formateadores nativos
const formattersCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()

/** Genera una clave única para identificar el formateador en la caché */
const getCacheKey = (type: string, locale: string, options: object) =>
  `${type}_${locale}_${JSON.stringify(options)}`

/** Formatea un importe como moneda. Pasa locale/currency explícitos para máximo rendimiento. */
export function formatCurrency(
  amount: number,
  options: { currency?: string; locale?: string; signDisplay?: 'auto' | 'never' | 'always' } = {},
): string {
  const currency = options.currency || env.defaultCurrency
  const locale = options.locale || getIntlLocale() || env.defaultLocale
  const signDisplay = options.signDisplay || 'auto'

  const cacheKey = getCacheKey('curr', locale, { currency, signDisplay })

  let formatter = formattersCache.get(cacheKey) as Intl.NumberFormat
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, signDisplay })
    formattersCache.set(cacheKey, formatter)
  }

  return formatter.format(amount)
}

/** Formatea una fecha ISO (YYYY-MM-DD) de forma legible evitando saltos de zona horaria. */
export function formatDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  locale: string = getIntlLocale() || env.defaultLocale,
): string {
  if (!isoDate) return ''

  const cacheKey = getCacheKey('date', locale, options)

  let formatter = formattersCache.get(cacheKey) as Intl.DateTimeFormat
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formattersCache.set(cacheKey, formatter)
  }

  // Corregimos el bug del desfase horario dividiendo el string (Y-M-D) para forzar hora local
  const parts = isoDate.split('-')
  if (parts.length === 3) {
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return formatter.format(date)
  }

  return formatter.format(new Date(isoDate))
}

/** Devuelve la fecha de hoy como YYYY-MM-DD (sin desfase de zona horaria). */
export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
