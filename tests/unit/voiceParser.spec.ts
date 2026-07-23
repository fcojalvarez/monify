import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeText,
  extractKind,
  extractIsCash,
  extractAmount,
  extractDate,
  extractCategory,
  extractFamilyMember,
  extractNote,
  extractRecurring,
  replaceWordsWithDigits,
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

  describe('replaceWordsWithDigits', () => {
    it('replaces spanish written numbers with digits', () => {
      expect(replaceWordsWithDigits('dos con cincuenta')).toBe('2 con 50')
      expect(replaceWordsWithDigits('treinta y cinco con cuarenta y dos')).toBe('35 con 42')
      expect(replaceWordsWithDigits('un euro con cinco')).toBe('1 euro con 5')
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

  describe('extractIsCash', () => {
    it('detects if the movement is in cash', () => {
      expect(extractIsCash('un gasto de 12 euros en efectivo')).toBe(true)
      expect(extractIsCash('ingreso de 10 con cash')).toBe(true)
      expect(extractIsCash('gasto en la cartera')).toBe(true)
      expect(extractIsCash('compra de 5 euros')).toBe(false)
    })
  })

  describe('extractAmount', () => {
    it('extracts number with currency symbol', () => {
      expect(extractAmount('gasto de 43.50€ hoy')).toBe(43.5)
      expect(extractAmount('he pagado 43,5 euros')).toBe(43.5)
      expect(extractAmount('un ingreso de 1200 eur')).toBe(1200)
    })

    it('extracts decimal numbers expressed in spoken Spanish', () => {
      expect(extractAmount('un gasto de dos con cincuenta euros')).toBe(2.5)
      expect(extractAmount('pago 2 con 50 de comida')).toBe(2.5)
      expect(extractAmount('gasto de un euro con cinco centimos')).toBe(1.05)
      expect(extractAmount('gasto de 2 con 5')).toBe(2.05)
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
      expect(extractCategory('gasto de comida rápida de hoy', mockCategories, 'expense').categoryId).toBe('cat-2')
      expect(extractCategory('gasto de comida', mockCategories, 'expense').categoryId).toBe('cat-1')
    })

    it('matches category name ignoring accents and case', () => {
      expect(extractCategory('he gastado en cómida', mockCategories, 'expense').categoryId).toBe('cat-1')
      expect(extractCategory('un ingreso para mi nomina', mockCategories, 'income').categoryId).toBe('cat-3')
    })

    it('falls back to first of kind if no match', () => {
      expect(extractCategory('gasto en algo desconocido', mockCategories, 'expense').categoryId).toBe('cat-1') // Comida is first expense
    })
  })

  describe('extractFamilyMember', () => {
    it('matches family member name', () => {
      expect(extractFamilyMember('gasto de comida de Ana', mockMembers).familyMemberId).toBe('mem-1')
      expect(extractFamilyMember('gasto pagado por papa', mockMembers).familyMemberId).toBe('mem-2')
    })

    it('falls back to default member if no match', () => {
      expect(extractFamilyMember('gasto de comida de Luis', mockMembers, 'mem-1').familyMemberId).toBe('mem-1')
    })
  })

  describe('extractNote', () => {
    it('returns empty string if no note trigger word is found', () => {
      expect(extractNote('gasto de 43.50 euros hoy de comida')).toBe('')
    })

    it('extracts the note when con nota/pon en notas is specified', () => {
      expect(extractNote('gasto de 43 euros con nota cena de cumpleaños')).toBe('cena de cumpleaños')
      expect(extractNote('gasto de 5€ pon en notas almuerzo rápido')).toBe('almuerzo rápido')
      expect(extractNote('ingreso de 100 con el concepto transferencia mensual')).toBe('transferencia mensual')
    })
  })

  describe('extractRecurring', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 9, 15)) // 15 de Octubre de 2026
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('detects simple recurrence frequencies', () => {
      expect(extractRecurring('gasto todos los días de comida')).toEqual({
        isRecurring: true, frequency: 'daily', months: [], dayOfMonth: 1
      })
      expect(extractRecurring('ingreso de nómina cada mes')).toEqual({
        isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: 15 // system date day is 15
      })
      expect(extractRecurring('gasto semanal de gasolina')).toEqual({
        isRecurring: true, frequency: 'weekly', months: [], dayOfMonth: 1
      })
      expect(extractRecurring('gasto de seguro anual')).toEqual({
        isRecurring: true, frequency: 'yearly', months: [], dayOfMonth: 1
      })
    })

    it('detects custom recurrence with monthly day', () => {
      expect(extractRecurring('gasto los 1 de cada mes')).toEqual({
        isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: 1
      })
      expect(extractRecurring('pago de hipoteca el día 10 de cada mes')).toEqual({
        isRecurring: true, frequency: 'monthly', months: [], dayOfMonth: 10
      })
    })

    it('detects custom recurrence with specific months and days', () => {
      expect(extractRecurring('gasto los días 5 de enero marzo y abril')).toEqual({
        isRecurring: true, frequency: 'custom', months: [1, 3, 4], dayOfMonth: 5
      })
    })

    it('returns isRecurring false for non-recurring texts', () => {
      expect(extractRecurring('gasto de 43 euros hoy')).toEqual({
        isRecurring: false, frequency: 'monthly', months: [], dayOfMonth: 1
      })
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

    it('parses a full natural Spanish sentence without note', () => {
      const sentence = 'Crea un gasto de 43,50€ el día 12 de categoría Comida Rápida para Ana'
      const parsed = parseVoiceCommand(sentence, mockCategories, mockMembers, 'mem-1')

      expect(parsed).toEqual({
        kind: 'expense',
        amount: 43.5,
        categoryId: 'cat-2',
        familyMemberId: 'mem-1',
        occurredOn: '2026-10-12',
        note: '',
        isCash: false,
        isRecurring: false,
        frequency: 'monthly',
        months: [],
        dayOfMonth: 1,
        unrecognizedFields: [],
      })
    })

    it('parses a full natural Spanish sentence with note, cash, and recurrence', () => {
      const sentence = 'gasto de dos con cincuenta en efectivo los días 5 de enero y marzo para Ana con nota cena familiar'
      const parsed = parseVoiceCommand(sentence, mockCategories, mockMembers, 'mem-1')

      expect(parsed).toEqual({
        kind: 'expense',
        amount: 2.5,
        categoryId: 'cat-1', // Comida is fallback as Comida Rápida is not explicitly said and Comida is first
        familyMemberId: 'mem-1',
        occurredOn: '2026-10-15',
        note: 'cena familiar',
        isCash: true,
        isRecurring: true,
        frequency: 'custom',
        months: [1, 3],
        dayOfMonth: 5,
        unrecognizedFields: ['category'], // category was fallback
      })
    })

    it('reports unrecognized fields when important details are missing', () => {
      const sentence = 'un gasto para papá'
      const parsed = parseVoiceCommand(sentence, mockCategories, mockMembers, 'mem-1')

      expect(parsed.unrecognizedFields).toContain('amount')
      expect(parsed.unrecognizedFields).toContain('category')
      expect(parsed.unrecognizedFields).not.toContain('familyMember') // Papá matched exactly
    })
  })
})
