import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  validatePassword,
  parseAmount,
  isPositiveAmount,
} from '@/utils/validation'

describe('validation utils', () => {
  describe('isValidEmail', () => {
    it('acepta emails válidos', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('  user@example.com  ')).toBe(true)
    })
    it('rechaza emails inválidos', () => {
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('no-arroba.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('devuelve null para contraseñas válidas', () => {
      expect(validatePassword('abc12345')).toBeNull()
    })
    it('exige longitud mínima', () => {
      expect(validatePassword('ab12')).toMatch(/8 caracteres/)
    })
    it('exige letra y número', () => {
      expect(validatePassword('12345678')).toMatch(/letra y un número/)
      expect(validatePassword('abcdefgh')).toMatch(/letra y un número/)
    })
  })

  describe('parseAmount', () => {
    it('normaliza comas y espacios', () => {
      expect(parseAmount('1,50')).toBe(1.5)
      expect(parseAmount(' 20 ')).toBe(20)
    })
  })

  describe('isPositiveAmount', () => {
    it('solo acepta importes positivos finitos', () => {
      expect(isPositiveAmount(10)).toBe(true)
      expect(isPositiveAmount(0)).toBe(false)
      expect(isPositiveAmount(-5)).toBe(false)
      expect(isPositiveAmount(NaN)).toBe(false)
    })
  })
})
