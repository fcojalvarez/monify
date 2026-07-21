import { ref, watch } from 'vue'

export type AppLocale = 'es' | 'en'

const LOCALE_STORAGE_KEY = 'monify:locale'

const messages = {
  es: {
    language: { label: 'Idioma', spanish: 'Español', english: 'Inglés' },
    dashboard: {
      balance: 'Balance del {period}',
      movements: { day: 'Movimientos de hoy', week: 'Movimientos de esta semana', month: 'Movimientos de este mes', year: 'Movimientos de este año' },
      filter: { day: 'Hoy', week: 'Esta semana', month: 'Este mes', year: 'Este año' },
      period: { day: 'día', week: 'semana', month: 'mes', year: 'año' },
    },
    summary: { income: 'Ingresos', expense: 'Gastos', bank: 'Banco', cash: 'Efectivo', cashBalance: 'Balance de efectivo', wallets: 'Carteras', members: '{count} miembros', noWallets: 'Aún no hay carteras configuradas.' },
    settings: { title: 'Gestionar cuenta', subtitle: 'Personaliza tus preferencias y administra tus datos', preferences: 'Preferencias', currency: 'Moneda por defecto', theme: 'Tema visual', light: 'Modo claro', dark: 'Modo oscuro', savings: '¿Quieres gestionar ahorros?', cash: '¿Quieres gestionar tu efectivo?' },
    recurring: { syncingTitle: 'Actualizando movimientos', syncingPending: 'Estamos creando los ingresos y gastos recurrentes pendientes.' },
    recurringList: { title: 'Movimientos recurrentes', subtitle: 'Consulta las plantillas que se crearán automáticamente.', empty: 'No tienes movimientos recurrentes.', nextExecution: 'Próxima ejecución', noEnd: 'Sin fecha de finalización', end: 'Finaliza el {date}', frequencies: { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' } },
    recurringForm: { title: 'Editar movimiento recurrente', deleteConfirm: '¿Estás seguro de que deseas eliminar este movimiento recurrente? Esta acción no se puede deshacer y no afectará a los movimientos ya creados.' },
  },
  en: {
    language: { label: 'Language', spanish: 'Spanish', english: 'English' },
    dashboard: {
      balance: '{period} balance',
      movements: { day: "Today's transactions", week: "This week's transactions", month: "This month's transactions", year: "This year's transactions" },
      filter: { day: 'Today', week: 'This week', month: 'This month', year: 'This year' },
      period: { day: 'day', week: 'week', month: 'month', year: 'year' },
    },
    summary: { income: 'Income', expense: 'Expenses', bank: 'Bank', cash: 'Cash', cashBalance: 'Cash balance', wallets: 'Wallets', members: '{count} members', noWallets: 'No wallets have been set up yet.' },
    settings: { title: 'Manage account', subtitle: 'Customize your preferences and manage your data', preferences: 'Preferences', currency: 'Default currency', theme: 'Theme', light: 'Light mode', dark: 'Dark mode', savings: 'Manage savings?', cash: 'Manage cash?' },
    recurring: { syncingTitle: 'Updating transactions', syncingPending: 'We are creating pending recurring income and expenses.' },
    recurringList: { title: 'Recurring transactions', subtitle: 'Review templates that will be created automatically.', empty: 'You have no recurring transactions.', nextExecution: 'Next execution', noEnd: 'No end date', end: 'Ends on {date}', frequencies: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' } },
    recurringForm: { title: 'Edit recurring transaction', deleteConfirm: 'Are you sure you want to delete this recurring transaction? This action cannot be undone and will not affect already created transactions.' },
  },
} as const

type MessageValue = string | { readonly [key: string]: MessageValue }

function detectLocale(): AppLocale {
  if (typeof window === 'undefined') return 'es'
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved === 'es' || saved === 'en') return saved
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  return languages.some(language => language.toLowerCase().startsWith('es')) ? 'es' : 'en'
}

const locale = ref<AppLocale>(detectLocale())

function resolveMessage(key: string): MessageValue | undefined {
  return key.split('.').reduce<MessageValue | undefined>((value, segment) => {
    if (!value || typeof value === 'string') return undefined
    return value[segment]
  }, messages[locale.value])
}

export function t(key: string, values: Record<string, string | number> = {}) {
  const message = resolveMessage(key)
  if (typeof message !== 'string') return key
  return message.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
}

export function setLocale(value: AppLocale) {
  locale.value = value
}

export function getIntlLocale() {
  return locale.value === 'es' ? 'es-ES' : 'en-US'
}

export function useI18n() {
  return { locale, setLocale, t }
}

watch(locale, value => {
  if (typeof window !== 'undefined') localStorage.setItem(LOCALE_STORAGE_KEY, value)
  if (typeof document !== 'undefined') document.documentElement.lang = value
}, { immediate: true })

export const localeOptions = [
  { value: 'es', labelKey: 'language.spanish' },
  { value: 'en', labelKey: 'language.english' },
] as const
