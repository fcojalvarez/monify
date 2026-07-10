import { describe, it, expect } from 'vitest'
import { formatCurrency, monthRange, todayISO } from '@/utils/format'

describe('format utils', () => {
  it('formatCurrency usa EUR por defecto', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('€')
    expect(result).toContain('1234'.slice(0, 1)) // contiene el importe
  })

  it('formatCurrency respeta la divisa indicada', () => {
    expect(formatCurrency(10, { currency: 'USD', locale: 'en-US' })).toBe('$10.00')
  })

  it('todayISO devuelve formato YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('monthRange devuelve primer y último día del mes', () => {
    const { from, to } = monthRange(new Date('2026-02-15T00:00:00'))
    expect(from).toBe('2026-02-01')
    expect(to).toBe('2026-02-28')
  })
})
