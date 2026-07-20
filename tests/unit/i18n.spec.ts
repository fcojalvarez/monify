import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { getIntlLocale, setLocale, t } from '@/i18n'

describe('i18n', () => {
  beforeEach(() => localStorage.clear())

  it('traduce los textos al inglés y actualiza el locale de formato', () => {
    setLocale('en')

    expect(t('summary.cashBalance')).toBe('Cash balance')
    expect(t('dashboard.balance', { period: 'year' })).toBe('year balance')
    expect(getIntlLocale()).toBe('en-US')
  })

  it('traduce los textos al español y persiste el idioma seleccionado', async () => {
    setLocale('es')
    await nextTick()

    expect(t('summary.wallets')).toBe('Carteras')
    expect(localStorage.getItem('monify:locale')).toBe('es')
  })
})
