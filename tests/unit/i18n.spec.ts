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

  it('traduce textos comunes en español', () => {
    setLocale('es')
    expect(t('common.close')).toBe('Cerrar')
    expect(t('common.unsavedChanges')).toBe('Cambios sin guardar')
    expect(t('common.discard')).toBe('Descartar')
    expect(t('common.keepEditing')).toBe('Seguir editando')
    expect(t('common.select')).toBe('Selecciona…')
    expect(t('common.search')).toBe('Buscar')
    expect(t('common.noResults')).toBe('No hay resultados para esta búsqueda.')
    expect(t('common.logout')).toBe('Cerrar sesión')
    expect(t('common.cancel')).toBe('Cancelar')
    expect(t('common.save')).toBe('Guardar')
  })

  it('traduce textos comunes en inglés', () => {
    setLocale('en')
    expect(t('common.close')).toBe('Close')
    expect(t('common.unsavedChanges')).toBe('Unsaved changes')
    expect(t('common.discard')).toBe('Discard')
    expect(t('common.keepEditing')).toBe('Keep editing')
    expect(t('common.select')).toBe('Select…')
    expect(t('common.search')).toBe('Search')
    expect(t('common.noResults')).toBe('No results for this search.')
    expect(t('common.logout')).toBe('Log out')
    expect(t('common.cancel')).toBe('Cancel')
    expect(t('common.save')).toBe('Save')
  })

  it('traduce textos de transacciones en español', () => {
    setLocale('es')
    expect(t('transaction.recurring')).toBe('Recurrente')
    expect(t('transaction.repeatMovement')).toBe('Repetir este movimiento')
    expect(t('transaction.frequency')).toBe('Frecuencia')
    expect(t('transaction.endsOn', { date: '17 de Julio de 2026' })).toBe(
      'Finalizará el 17 de Julio de 2026',
    )
    expect(t('transaction.noEndDate')).toBe('No tiene fecha de finalización.')
  })

  it('traduce textos de transacciones en inglés', () => {
    setLocale('en')
    expect(t('transaction.recurring')).toBe('Recurring')
    expect(t('transaction.repeatMovement')).toBe('Repeat this transaction')
    expect(t('transaction.frequency')).toBe('Frequency')
    expect(t('transaction.endsOn', { date: 'July 17, 2026' })).toBe('Ends on July 17, 2026')
    expect(t('transaction.noEndDate')).toBe('No end date.')
  })

  it('traduce textos de categorías en español', () => {
    setLocale('es')
    expect(t('category.monthlyLimit')).toBe('Límite mensual')
  })

  it('traduce textos de categorías en inglés', () => {
    setLocale('en')
    expect(t('category.monthlyLimit')).toBe('Monthly limit')
  })

  it('traduce textos de formulario recurrente en español', () => {
    setLocale('es')
    expect(t('recurringForm.startDate')).toBe('Fecha de inicio')
    expect(t('recurringForm.nextExecution')).toBe('Próxima ejecución')
    expect(t('recurringForm.createTitle')).toBe('Nuevo movimiento recurrente')
    expect(t('recurringForm.createButton')).toBe('Crear')
    expect(t('recurringForm.deleteButton')).toBe('Eliminar')
    expect(t('recurringList.noCategory')).toBe('Sin categoría')
    expect(t('recurringList.kind.expense')).toBe('Gasto')
  })

  it('traduce textos de formulario recurrente en inglés', () => {
    setLocale('en')
    expect(t('recurringForm.startDate')).toBe('Start date')
    expect(t('recurringForm.nextExecution')).toBe('Next execution')
    expect(t('recurringForm.createTitle')).toBe('New recurring transaction')
    expect(t('recurringForm.createButton')).toBe('Create')
    expect(t('recurringForm.deleteButton')).toBe('Delete')
    expect(t('recurringList.noCategory')).toBe('No category')
    expect(t('recurringList.kind.income')).toBe('Income')
  })
})
