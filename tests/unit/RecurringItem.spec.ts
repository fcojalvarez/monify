import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RecurringItem from '@/components/transactions/RecurringItem.vue'
import { setLocale } from '@/i18n'

describe('RecurringItem', () => {
  beforeEach(() => setLocale('es'))

  it('muestra la información del movimiento recurrente de gasto', () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('Mensual')
    expect(wrapper.text()).toContain('Sin fecha de finalización')
    expect(wrapper.text()).toContain('Próxima ejecución')
    expect(wrapper.text()).toContain('−25')
  })

  it('muestra la información del movimiento recurrente de ingreso', () => {
    const transaction = {
      id: 'recurring-2',
      kind: 'income' as const,
      amount: 1000,
      note: 'Salario',
      frequency: 'monthly' as const,
      next_execution: '2026-08-01',
      end_on: '2026-12-31',
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain('Salario')
    expect(wrapper.text()).toContain('Mensual')
    expect(wrapper.text()).toContain('Finaliza el')
    expect(wrapper.text()).toContain('2026')
    expect(wrapper.text()).toContain('Próxima ejecución')
    expect(wrapper.text()).toContain('+1000')
  })

  it('muestra la frecuencia como nota cuando no hay nota personalizada', () => {
    const transaction = {
      id: 'recurring-3',
      kind: 'expense' as const,
      amount: 50,
      note: null,
      frequency: 'weekly' as const,
      next_execution: '2026-08-01',
      end_on: null,
    }

    const wrapper = mount(RecurringItem, {
      props: { transaction },
    })

    expect(wrapper.text()).toContain('Semanal')
  })

  it('emite el evento click al hacer click en el item', async () => {
    const transaction = {
      id: 'recurring-1',
      kind: 'expense' as const,
      amount: 25,
      note: 'Netflix',
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
})
