import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'

type Theme = 'light' | 'dark'
type Currency = 'EUR' | 'USD'

const THEME_KEY = 'monify:theme'
const CURRENCY_KEY = 'monify:currency'
const SAVINGS_PROMPT_KEY = 'monify:savings_prompt_dismissed'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(THEME_KEY) as Theme | null
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialCurrency(): Currency {
  if (typeof window === 'undefined') return 'EUR'
  const stored = localStorage.getItem(CURRENCY_KEY) as Currency | null
  return stored || 'EUR'
}

function initialSavingsPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SAVINGS_PROMPT_KEY) === 'true'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>(initialTheme())
  const currency = ref<Currency>(initialCurrency())
  const savingsPromptDismissed = ref<boolean>(initialSavingsPromptDismissed())

  const locale = computed(() => {
    return currency.value === 'EUR' ? 'es-ES' : 'en-US'
  })

  function applyTheme(value: Theme) {
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setCurrency(value: Currency) {
    currency.value = value
  }

  function setSavingsPromptDismissed(value: boolean) {
    savingsPromptDismissed.value = value
  }

  watch(
    theme,
    (value) => {
      applyTheme(value)
      if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, value)
    },
    { immediate: true },
  )

  watch(currency, (value) => {
    if (typeof window !== 'undefined') localStorage.setItem(CURRENCY_KEY, value)
  })

  watch(savingsPromptDismissed, (value) => {
    if (typeof window !== 'undefined') localStorage.setItem(SAVINGS_PROMPT_KEY, String(value))
  })

  return {
    theme,
    toggleTheme,
    currency,
    locale,
    setCurrency,
    savingsPromptDismissed,
    setSavingsPromptDismissed,
  }
})
