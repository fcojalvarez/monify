import type { RecurringFrequency } from '@/types/database.types'

const pad = (value: number) => String(value).padStart(2, '0')

// Días de un mes concreto (1-12)
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// Limita el día al rango válido del mes
function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, month))
}

// Normaliza meses: únicos, en rango 1-12 y ordenados
export function normalizeMonths(months: readonly number[] | null | undefined): number[] {
  return [...new Set(months ?? [])].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b)
}

export interface CustomScheduleOptions {
  months?: readonly number[] | null
  dayOfMonth?: number | null
}

// Primera ocurrencia de calendario personalizado igual o posterior a fromISO
export function customOccurrenceOnOrAfter(
  fromISO: string,
  months: readonly number[] | null | undefined,
  dayOfMonth: number,
): string {
  const sorted = normalizeMonths(months)
  if (!sorted.length) return fromISO

  const [fromYear] = fromISO.split('-').map(Number)

  for (let year = fromYear; year <= fromYear + 1; year++) {
    for (const month of sorted) {
      const day = clampDay(year, month, dayOfMonth)
      const candidate = `${year}-${pad(month)}-${pad(day)}`
      if (candidate >= fromISO) return candidate
    }
  }

  const month = sorted[0]
  const year = fromYear + 1
  return `${year}-${pad(month)}-${pad(clampDay(year, month, dayOfMonth))}`
}

// Suma un día a una fecha ISO
function addOneDay(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

// Siguiente fecha recurrente según la frecuencia y opciones dadas
export function nextRecurringDate(
  date: string,
  frequency: RecurringFrequency,
  options: CustomScheduleOptions = {},
): string {
  const [year, month, day] = date.split('-').map(Number)

  if (frequency === 'custom') {
    return customOccurrenceOnOrAfter(addOneDay(date), options.months, options.dayOfMonth ?? day)
  }

  if (frequency === 'daily' || frequency === 'weekly') {
    const value = new Date(Date.UTC(year, month - 1, day + (frequency === 'daily' ? 1 : 7)))
    return value.toISOString().slice(0, 10)
  }
  const targetYear = frequency === 'yearly' ? year + 1 : year
  const targetMonth = frequency === 'monthly' ? month + 1 : month
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  if (day > daysInTargetMonth) {
    return new Date(Date.UTC(targetYear, targetMonth, 1)).toISOString().slice(0, 10)
  }
  return new Date(Date.UTC(targetYear, targetMonth - 1, day)).toISOString().slice(0, 10)
}

// Nombres de meses en formato corto (ej: "jun, ago")
export function formatMonthList(months: readonly number[] | null | undefined, locale: string): string {
  const sorted = normalizeMonths(months)
  if (!sorted.length) return ''
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' })
  return sorted.map((month) => formatter.format(new Date(Date.UTC(2000, month - 1, 1)))).join(', ')
}
