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

/** Movimiento recurrente. */
export type RecurringTransaction = Tables<'recurring_transactions'>

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

/** Cuenta o meta de ahorro. */
export interface Savings {
  id: string
  owner_id: string
  name: string
  balance: number
  target: number | null
  color: string
  created_at: string
  type: 'bank' | 'cash'
  status: 'active' | 'completed'
}

/** Movimiento de la cuenta de ahorros. */
export interface SavingsTransaction {
  id: string
  owner_id: string
  savings_id: string
  amount: number
  note: string | null
  occurred_on: string
  created_at: string
}

/** Movimiento de ahorro con su cuenta asociada (opcional). */
export interface SavingsTransactionWithRelations extends SavingsTransaction {
  savings?: Savings | null
}
