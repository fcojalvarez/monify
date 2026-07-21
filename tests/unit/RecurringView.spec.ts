import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RecurringView from '@/views/dashboard/RecurringView.vue'
import { setLocale } from '@/i18n'

const list = vi.hoisted(() => vi.fn())

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: { list },
}))

describe('RecurringView', () => {
  beforeEach(() => setLocale('es'))

  it('lista frecuencia, próxima ejecución y una recurrencia sin fecha final', async () => {
    list.mockResolvedValueOnce([{
      id: 'recurring-1', kind: 'expense', amount: 25, note: 'Netflix',
      frequency: 'monthly', next_execution: '2026-08-01', end_on: null,
    }])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    expect(wrapper.text()).toContain('Movimientos recurrentes')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('Mensual')
    expect(wrapper.text()).toContain('Sin fecha de finalización')
    expect(wrapper.text()).toContain('Próxima ejecución')
  })

  it('muestra el estado vacío', async () => {
    list.mockResolvedValueOnce([])
    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(wrapper.text()).toContain('No tienes movimientos recurrentes.'))
  })

  it('muestra items con cursor-pointer para permitir edición', async () => {
    list.mockResolvedValueOnce([{
      id: 'recurring-1', kind: 'expense', amount: 25, note: 'Netflix',
      frequency: 'monthly', next_execution: '2026-08-01', end_on: null,
    }])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    const items = wrapper.findAll('.cursor-pointer')
    expect(items.length).toBe(1)
  })

  it('abre el modal de edición al hacer click en un movimiento recurrente', async () => {
    const transaction = {
      id: 'recurring-1', kind: 'expense' as const, amount: 25, note: 'Netflix',
      frequency: 'monthly' as const, next_execution: '2026-08-01', end_on: null,
    }
    list.mockResolvedValueOnce([transaction])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    const item = wrapper.find('.cursor-pointer')
    await item.trigger('click')

    expect(wrapper.vm.showEdit).toBe(true)
    expect(wrapper.vm.editingItem).toEqual(transaction)
  })
})
