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
})
