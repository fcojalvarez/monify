import { beforeEach, describe, expect, it } from 'vitest'
import { savingsAccountLabel, savingsAccountColor } from '@/utils/savings'
import { setLocale } from '@/i18n'
import type { Savings } from '@/types'

const saving = (overrides: Partial<Savings> = {}): Savings => ({
  id: 's1', owner_id: 'u1', name: 'Vacaciones', type: 'bank', balance: 0, target: null,
  color: '#123456', status: 'active', created_at: '', ...overrides,
})

describe('savings utils', () => {
  beforeEach(() => setLocale('es'))

  it('usa el nombre propio para huchas normales', () => {
    expect(savingsAccountLabel(saving({ name: 'Vacaciones' }))).toBe('Vacaciones')
  })

  it('traduce la cuenta general en versión corta y larga', () => {
    const bank = saving({ name: 'general', type: 'bank' })
    const cash = saving({ name: 'general', type: 'cash' })
    expect(savingsAccountLabel(bank, 'short')).toBe('Ahorro Banco')
    expect(savingsAccountLabel(bank, 'long')).toBe('Ahorro bancario')
    expect(savingsAccountLabel(cash, 'short')).toBe('Ahorro Efectivo')
    expect(savingsAccountLabel(cash, 'long')).toBe('Ahorro en efectivo')
  })

  it('devuelve la etiqueta genérica si no hay cuenta', () => {
    expect(savingsAccountLabel(undefined)).toBe('Ahorro')
  })

  it('devuelve el color de la cuenta o el color por defecto', () => {
    expect(savingsAccountColor(saving({ color: '#abcdef' }))).toBe('#abcdef')
    expect(savingsAccountColor(undefined)).toBe('#8b5cf6')
  })
})
