import { t } from '@/i18n'
import type { Savings } from '@/types'

/**
 * Nombre legible de una hucha. Las cuentas "general" se muestran con una etiqueta
 * traducida ("Ahorro Banco"/"Ahorro Efectivo" en versión corta, o "Ahorro bancario"/
 * "Ahorro en efectivo" en versión larga); el resto usa su nombre propio.
 */
export function savingsAccountLabel(
  account: Savings | undefined,
  variant: 'short' | 'long' = 'short',
): string {
  if (!account) return t('savings.savingLabel')

  if (account.name === 'general') {
    if (variant === 'long') {
      return account.type === 'bank' ? t('savings.bankSaving') : t('savings.cashSaving')
    }
    return account.type === 'bank' ? t('savings.bankSavingShort') : t('savings.cashSavingShort')
  }
  return account.name
}

/** Color identificador de una hucha (con color por defecto si no se encuentra). */
export function savingsAccountColor(account: Savings | undefined): string {
  return account?.color ?? '#8b5cf6'
}
