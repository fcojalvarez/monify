/** Validaciones ligeras y sin dependencias para los formularios. */

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export type PasswordErrorKey = 'too_short' | 'missing_requirements' | null

/**
 * Reglas de contraseña: mínimo 8 caracteres, con letra y número.
 * Devuelve un código de error libre de strings de interfaz para facilitar su mantenimiento o traducción.
 */
export function validatePassword(value: string): PasswordErrorKey {
  if (value.length < 8) return 'too_short'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return 'missing_requirements'
  }
  return null
}

/**
 * Convierte importes con formato flexible (comas, puntos o espacios de miles) a número limpio.
 * Soporta formatos como "1.234,56", "1234.56" o "1 234,56". Devuelve NaN si no es válido.
 */
export function parseAmount(value: string): number {
  if (!value) return NaN

  // 1. Eliminamos espacios y símbolos comunes como el de moneda (€, $)
  let clean = value.replace(/[\s€$]/g, '')

  // 2. Si detectamos formato europeo clásico (puntos para miles y una coma para decimales):
  // Ejemplo: "1.234,56" -> quitamos el punto y la coma pasa a ser punto decimal.
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      clean = clean.replace(/\./g, '') // Quitamos puntos de miles
    }
  }

  // 3. Normalizamos la coma final como punto decimal
  clean = clean.replace(',', '.')

  const parsed = Number(clean)
  return Number.isNaN(parsed) ? NaN : parsed
}

/** Valida estrictamente si el valor es un número finito y mayor que cero. */
export const isPositiveAmount = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
