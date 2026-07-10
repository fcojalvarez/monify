import type { Tables, CategoryKind } from './database.types'

export type { CategoryKind }

/** Perfil del usuario autenticado (1:1 con auth.users). */
export type Profile = Tables<'profiles'>

/** Persona de la familia dentro de una misma cuenta. */
export type FamilyMember = Tables<'family_members'>

/** Categoría de ingreso o gasto, con icono e (opcional) límite. */
export type Category = Tables<'categories'>

/** Movimiento (ingreso o gasto). */
export type Transaction = Tables<'transactions'>

/** Transacción con sus relaciones ya resueltas (para pintar en UI). */
export interface TransactionWithRelations extends Transaction {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'kind'> | null
  family_member: Pick<FamilyMember, 'id' | 'name' | 'color' | 'avatar_icon'> | null
}

/** Progreso de gasto/ingreso de una categoría respecto a su límite. */
export interface CategoryUsage {
  category: Category
  spent: number
  limit: number | null
  /** Porcentaje 0–100+ (puede pasar de 100 si se supera el límite). */
  percentage: number
  isOverLimit: boolean
}

/** Resumen agregado para el dashboard. */
export interface PeriodSummary {
  income: number
  expense: number
  balance: number
  currency: string
}
