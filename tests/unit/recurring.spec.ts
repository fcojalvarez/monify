import { describe, expect, it } from 'vitest'
import {
  nextRecurringDate,
  customOccurrenceOnOrAfter,
  normalizeMonths,
  formatMonthList,
} from '@/utils/recurring'

describe('nextRecurringDate', () => {
  it('usa el primer día válido posterior si el día mensual no existe', () => {
    expect(nextRecurringDate('2026-01-31', 'monthly')).toBe('2026-03-01')
  })

  it('usa el 1 de marzo para un 29 de febrero anual en año no bisiesto', () => {
    expect(nextRecurringDate('2024-02-29', 'yearly')).toBe('2025-03-01')
  })

  it('conserva la fecha cuando sí existe', () => {
    expect(nextRecurringDate('2026-01-15', 'monthly')).toBe('2026-02-15')
    expect(nextRecurringDate('2024-02-28', 'yearly')).toBe('2025-02-28')
  })

  it('avanza al siguiente mes de la lista en una recurrencia personalizada', () => {
    const options = { months: [6, 8, 10, 12], dayOfMonth: 5 }
    expect(nextRecurringDate('2026-06-05', 'custom', options)).toBe('2026-08-05')
    expect(nextRecurringDate('2026-08-05', 'custom', options)).toBe('2026-10-05')
    expect(nextRecurringDate('2026-10-05', 'custom', options)).toBe('2026-12-05')
  })

  it('salta al primer mes del año siguiente tras el último mes personalizado', () => {
    const options = { months: [6, 8, 10, 12], dayOfMonth: 5 }
    expect(nextRecurringDate('2026-12-05', 'custom', options)).toBe('2027-06-05')
  })
})

describe('customOccurrenceOnOrAfter', () => {
  it('devuelve la primera ocurrencia igual o posterior a la fecha dada', () => {
    // IBI en meses 6, 8, 10, 12 el día 5; empezando el 1 de julio → agosto
    expect(customOccurrenceOnOrAfter('2026-07-01', [6, 8, 10, 12], 5)).toBe('2026-08-05')
  })

  it('incluye el mismo día si coincide exactamente', () => {
    expect(customOccurrenceOnOrAfter('2026-06-05', [6, 8], 5)).toBe('2026-06-05')
  })

  it('recorta el día al último día válido del mes', () => {
    // Día 31 en febrero → 28 (2026 no bisiesto)
    expect(customOccurrenceOnOrAfter('2026-01-01', [2], 31)).toBe('2026-02-28')
  })

  it('salta al año siguiente si no queda ningún mes válido este año', () => {
    expect(customOccurrenceOnOrAfter('2026-07-01', [1, 3], 10)).toBe('2027-01-10')
  })
})

describe('normalizeMonths', () => {
  it('elimina duplicados, ordena y descarta valores fuera de rango', () => {
    expect(normalizeMonths([12, 6, 6, 8, 0, 13, 10])).toEqual([6, 8, 10, 12])
  })

  it('devuelve un array vacío para entradas nulas', () => {
    expect(normalizeMonths(null)).toEqual([])
    expect(normalizeMonths(undefined)).toEqual([])
  })
})

describe('formatMonthList', () => {
  it('devuelve los nombres cortos ordenados en el locale indicado', () => {
    const result = formatMonthList([12, 6], 'es-ES')
    // El orden debe ser ascendente (junio antes que diciembre)
    expect(result.indexOf('jun')).toBeGreaterThanOrEqual(0)
    expect(result.indexOf('jun')).toBeLessThan(result.indexOf('dic'))
  })

  it('devuelve cadena vacía sin meses', () => {
    expect(formatMonthList([], 'es-ES')).toBe('')
  })
})
