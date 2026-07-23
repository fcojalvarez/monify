// Validaciones para formularios sin dependencias externas

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export type PasswordErrorKey = 'too_short' | 'missing_requirements' | null

// Mínimo 8 caracteres, letra y número. Retorna código de error o null.
export function validatePassword(value: string): PasswordErrorKey {
  if (value.length < 8) return 'too_short'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return 'missing_requirements'
  }
  return null
}

// Convierte importes flexibles (comas, puntos o espacios) a número o NaN.
export function parseAmount(value: string): number {
  if (!value) return NaN

  let clean = value.replace(/[\s€$]/g, '')

  // Soporte para formato europeo (1.234,56)
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      clean = clean.replace(/\./g, '')
    }
  }

  clean = clean.replace(',', '.')

  const parsed = Number(clean)
  return Number.isNaN(parsed) ? NaN : parsed
}

export const isPositiveAmount = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
