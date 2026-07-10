/** Validaciones ligeras y sin dependencias para los formularios. */

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

/**
 * Reglas de contraseña: mínimo 8 caracteres, con letra y número.
 * Devuelve `null` si es válida, o el mensaje de error si no.
 */
export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return 'Debe incluir al menos una letra y un número'
  }
  return null
}

/** Convierte importes con coma/punto a número. Devuelve NaN si no es válido. */
export function parseAmount(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'))
}

export const isPositiveAmount = (value: number): boolean => Number.isFinite(value) && value > 0
