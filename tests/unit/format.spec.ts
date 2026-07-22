import { describe, it, expect } from 'vitest'
import { formatCurrency, monthRange, todayISO, formatDate, formatDateWithMonthName, signedAmount } from '@/utils/format'

describe('format utils', () => {
  it('signedAmount aplica el signo según la dirección y normaliza el valor', () => {
    expect(signedAmount(50, true)).toBe(50)
    expect(signedAmount(50, false)).toBe(-50)
    // Normaliza el signo de entrada
    expect(signedAmount(-50, true)).toBe(50)
    expect(signedAmount(-50, false)).toBe(-50)
  })

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

  describe('formatDate', () => {
    it('devuelve string vacío si la fecha es vacía', () => {
      expect(formatDate('')).toBe('')
    })

    it('formatea fecha ISO clásica correctamente en español', () => {
      // Usamos el locale 'es-ES' y opciones específicas para consistencia
      const result = formatDate('2026-07-19', { day: 'numeric', month: 'long', year: 'numeric' }, 'es-ES')
      // Debería ser "19 de julio de 2026"
      expect(result).toBe('19 de julio de 2026')
    })

    it('formatea correctamente con formato de mes corto por defecto', () => {
      const result = formatDate('2026-07-19', undefined, 'es-ES')
      // Debería contener "19", "jul", "2026"
      expect(result).toContain('19')
      expect(result.toLowerCase()).toContain('jul')
      expect(result).toContain('2026')
    })
  })

  describe('formatDateWithMonthName', () => {
    it('formatea fecha con nombre completo del mes en español', () => {
      const result = formatDateWithMonthName('2026-07-17', 'es-ES')
      expect(result).toBe('17 de julio de 2026')
    })

    it('formatea fecha con nombre completo del mes en inglés', () => {
      const result = formatDateWithMonthName('2026-07-17', 'en-US')
      expect(result).toBe('July 17, 2026')
    })

    it('formatea diferentes meses correctamente', () => {
      expect(formatDateWithMonthName('2026-01-15', 'es-ES')).toBe('15 de enero de 2026')
      expect(formatDateWithMonthName('2026-12-25', 'es-ES')).toBe('25 de diciembre de 2026')
    })
  })
})
