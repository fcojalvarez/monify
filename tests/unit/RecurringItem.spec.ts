import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecurringItem from '@/components/transactions/RecurringItem.vue'
import { setLocale, t } from '@/i18n'
import { useCategoriesStore } from '@/stores/categories'

describe('RecurringItem', () => {
  beforeEach(() => {
    setLocale('es')
    setActivePinia(createPinia())
    const categories = useCategoriesStore()
    categories.items = [{
      id: 'cat-1',
      name: 'Ocio',
      kind: 'expense',
      icon: 'solar:gamepad-bold',
      color: '#ff0000',
      owner_id: 'user-1',
      created_at: '',
      updated_at: '',
    }]
  })

  it('muestra categor?a, nota, frecuencia, pr?xima ejecuci?n e importe de un gasto', () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
      category_id: 'cat-1',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain('Ocio')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain(t('recurringList.frequencies.monthly'))
    expect(wrapper.text()).toContain(t('recurringList.noEnd'))
    expect(wrapper.text()).toContain(t('recurringList.nextExecution'))
    expect(wrapper.text()).toContain('25,00')
  })

  it('muestra la informaci?n del movimiento recurrente de ingreso con fecha de fin', () => {
    const transaction = {
      id: 'recurring-2',
      kind: 'income' as const,
      amount: 1000,
      note: 'Salario',
      category_id: 'cat-1',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: '2026-12-31',
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain('Salario')
    expect(wrapper.text()).toContain(t('recurringList.frequencies.monthly'))
    expect(wrapper.text()).toContain('Finaliza el')
    expect(wrapper.text()).toContain('2026')
    expect(wrapper.text()).toContain(t('recurringList.nextExecution'))
    expect(wrapper.text()).toContain('1000,00')
  })

  it('muestra la frecuencia aunque no haya nota personalizada', () => {
    const transaction = {
      id: 'recurring-3',
      kind: 'expense' as const,
      amount: 50,
      note: null,
      category_id: 'cat-1',
      frequency: 'weekly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain(t('recurringList.frequencies.weekly'))
    expect(wrapper.text()).not.toContain('null')
  })

  it('muestra el tipo de movimiento en el t?tulo del icono', () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
      category_id: 'cat-1',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    const icon = wrapper.find(`span[title="${t('recurringList.kind.expense')}"]`)
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('h-7')
    expect(icon.classes()).toContain('w-7')
  })

  it('muestra "Sin categor?a" si no encuentra la categor?a', () => {
    const transaction = {
      id: 'recurring-4',
      kind: 'expense' as const,
      amount: 10,
      note: null,
      category_id: 'missing',
      frequency: 'daily' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain(t('recurringList.noCategory'))
    expect(wrapper.text()).toContain(t('recurringList.frequencies.daily'))
  })

  it('muestra el calendario personalizado con día y meses', () => {
    const transaction = {
      id: 'recurring-custom',
      kind: 'expense' as const,
      amount: 320,
      note: 'IBI',
      category_id: 'cat-1',
      frequency: 'custom' as const,
      next_execution: '2026-08-05',
      end_on: null,
      months: [6, 8, 10, 12],
      day_of_month: 5,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction: transaction as any },
    })

    expect(wrapper.text()).toContain(t('recurringList.frequencies.custom'))
    expect(wrapper.text()).toContain('día 5')
    // Meses cortos en español
    expect(wrapper.text()).toContain('jun')
    expect(wrapper.text()).toContain('dic')
  })

  it('emite el evento click al hacer click en el item', async () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
      category_id: 'cat-1',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    await wrapper.find('li').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')?.[0]).toEqual([transaction])
  })

  it('muestra la pr?xima ejecuci?n en una l?nea dedicada', () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
      category_id: 'cat-1',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    const nextExecutionParagraph = wrapper.findAll('p')
      .find(p => p.text().includes(t('recurringList.nextExecution')))
    expect(nextExecutionParagraph).toBeDefined()
    expect(nextExecutionParagraph?.classes()).toContain('text-xs')
  })
})
