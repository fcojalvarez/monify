import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'monify:theme'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>(initialTheme())

  function apply(value: Theme) {
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  watch(
    theme,
    (value) => {
      apply(value)
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value)
    },
    { immediate: true },
  )

  return { theme, toggleTheme }
})
