import type { CategoryKind } from '@/types'

export const ROUTE_NAMES = {
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
  authCallback: 'auth-callback',
  dashboard: 'dashboard',
  history: 'history',
} as const

export const CATEGORY_KIND: Record<CategoryKind, CategoryKind> = {
  income: 'income',
  expense: 'expense',
}

/** Paleta sugerida al crear categorías / miembros (tokens de marca y acentos). */
export const PALETTE = [
  '#00b894',
  '#3a53a8',
  '#f5492a',
  '#f6a609',
  '#8b5cf6',
  '#0ea5e9',
  '#ec4899',
  '#14b8a6',
] as const

/** Iconos por defecto (nombres de Iconify) para arrancar rápido el picker. */
export const SUGGESTED_ICONS = [
  'solar:cart-large-2-bold',
  'solar:home-2-bold',
  'solar:dish-bold',
  'solar:bus-bold',
  'solar:health-bold',
  'solar:gamepad-bold',
  'solar:t-shirt-bold',
  'solar:wallet-money-bold',
  'solar:hand-money-bold',
  'solar:graph-up-bold',
] as const

export const DEFAULT_CATEGORY_ICON = 'solar:tag-bold'
