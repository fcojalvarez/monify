import { describe, expect, it } from 'vitest'
import { nextRecurringDate } from '@/utils/recurring'

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
})
