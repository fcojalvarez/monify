import { ref, watch } from 'vue'
import es from './locales/es.json'
import en from './locales/en.json'

export type AppLocale = 'es' | 'en'

const LOCALE_STORAGE_KEY = 'monify:locale'

const messages = {
  es,
  en,
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
