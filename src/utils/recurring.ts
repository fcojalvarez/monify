import type { RecurringFrequency } from '@/types/database.types'

/** Devuelve la siguiente fecha sin dejar que Date desborde días inválidos. */
export function nextRecurringDate(date: string, frequency: RecurringFrequency): string {
  const [year, month, day] = date.split('-').map(Number)
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
