import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeText,
  extractKind,
  extractAmount,
  extractDate,
  extractCategory,
  extractFamilyMember,
  parseVoiceCommand,
} from '@/utils/voiceParser'
import type { Category, FamilyMember } from '@/types'

describe('voiceParser', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Comida', kind: 'expense', owner_id: 'user-1', icon: 'food', color: 'red', monthly_limit: null, created_at: '' },
    { id: 'cat-2', name: 'Comida Rápida', kind: 'expense', owner_id: 'user-1', icon: 'burger', color: 'orange', monthly_limit: null, created_at: '' },
    { id: 'cat-3', name: 'Nómina', kind: 'income', owner_id: 'user-1', icon: 'salary', color: 'green', monthly_limit: null, created_at: '' },
    { id: 'cat-4', name: 'Transporte', kind: 'expense', owner_id: 'user-1', icon: 'car', color: 'blue', monthly_limit: null, created_at: '' },
  ]

  const mockMembers: FamilyMember[] = [
    { id: 'mem-1', name: 'Ana', owner_id: 'user-1', color: 'pink', avatar: '1', cash_balance: 0, created_at: '' },
    { id: 'mem-2', name: 'Papá', owner_id: 'user-1', color: 'blue', avatar: '2', cash_balance: 0, created_at: '' },
  ]

  describe('normalizeText', () => {
    it('normalizes accents, capital letters, and whitespace', () => {
      expect(normalizeText('  Cómida Rápida!  ')).toBe('comida rapida!')
    })
  })

  describe('extractKind', () => {
    it('detects income terms', () => {
      expect(extractKind('tengo un ingreso de mi nómina')).toBe('income')
      expect(extractKind('recibir el sueldo del mes')).toBe('income')
    })

    it('detects expense terms and defaults to expense', () => {
      expect(extractKind('he gastado 15 euros en el súper')).toBe('expense')
      expect(extractKind('un pago de la factura de luz')).toBe('expense')
      expect(extractKind('un refresco por 2€')).toBe('expense') // default
    })
  })

  describe('extractAmount', () => {
    it('extracts number with currency symbol', () => {
      expect(extractAmount('gasto de 43.50€ hoy')).toBe(43.5)
      expect(extractAmount('he pagado 43,5 euros')).toBe(43.5)
      expect(extractAmount('un ingreso de 1200 eur')).toBe(1200)
    })

    it('extracts number preceded by preposition de/por', () => {
      expect(extractAmount('compra por un importe de 25')).toBe(25)
      expect(extractAmount('un gasto de 125 en comida')).toBe(125)
    })

    it('ignores numbers used as days of month in prefix/suffix', () => {
      // "15" is part of "el día 15", so 43 should be picked as amount
      expect(extractAmount('gasto de 43 el día 15')).toBe(43)
      expect(extractAmount('gasto el 15 de octubre de 43')).toBe(43)
    })

    it('returns null if no positive number is found', () => {
      expect(extractAmount('no hay ningún número por aquí')).toBeNull()
    })
  })

  describe('extractDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 15)) // 15 de Octubre de 2026
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('handles relative terms (hoy, ayer, mañana)', () => {
      expect(extractDate('gasto de hoy de comida')).toBe('2026-10-15')
      expect(extractDate('ayer compré comida')).toBe('2026-10-14')
      expect(extractDate('mañana pagaré la factura')).toBe('2026-10-16')
    })

    it('handles explicit day of month with text month', () => {
      expect(extractDate('el 12 de octubre compré un libro')).toBe('2026-10-12')
      expect(extractDate('el día 3 de febrero del año que sea')).toBe('2026-02-03')
    })

    it('handles explicit day of current month', () => {
      expect(extractDate('gasto el día 22')).toBe('2026-10-22')
    })

    it('defaults to today ISO date', () => {
      expect(extractDate('gasto de comida')).toBe('2026-10-15')
    })
  })

  describe('extractCategory', () => {
    it('matches category name precisely (with correct kind priority)', () => {
      expect(extractCategory('gasto de comida rápida de hoy', mockCategories, 'expense')).toBe('cat-2')
      expect(extractCategory('gasto de comida', mockCategories, 'expense')).toBe('cat-1')
    })

    it('matches category name ignoring accents and case', () => {
      expect(extractCategory('he gastado en cómida', mockCategories, 'expense')).toBe('cat-1')
      expect(extractCategory('un ingreso para mi nomina', mockCategories, 'income')).toBe('cat-3')
    })

    it('falls back to first of kind if no match', () => {
      expect(extractCategory('gasto en algo desconocido', mockCategories, 'expense')).toBe('cat-1') // Comida is first expense
    })
  })

  describe('extractFamilyMember', () => {
    it('matches family member name', () => {
      expect(extractFamilyMember('gasto de comida de Ana', mockMembers)).toBe('mem-1')
      expect(extractFamilyMember('gasto pagado por papa', mockMembers)).toBe('mem-2')
    })

    it('falls back to default member if no match', () => {
      expect(extractFamilyMember('gasto de comida de Luis', mockMembers, 'mem-1')).toBe('mem-1')
    })
  })

  describe('parseVoiceCommand', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 15)) // 15 de Octubre de 2026
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('parses a full natural Spanish sentence correctly', () => {
      const sentence = 'Crea un gasto de 43,50€ el día 12 de categoría Comida Rápida para Ana'
      const parsed = parseVoiceCommand(sentence, mockCategories, mockMembers, 'mem-1')

      expect(parsed).toEqual({
        kind: 'expense',
        amount: 43.5,
        categoryId: 'cat-2',
        familyMemberId: 'mem-1',
        occurredOn: '2026-10-12',
        note: sentence,
      })
    })
  })
})
