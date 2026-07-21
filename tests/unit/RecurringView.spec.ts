import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import RecurringView from '@/views/dashboard/RecurringView.vue'
import { setLocale, t } from '@/i18n'
import { useCategoriesStore } from '@/stores/categories'

const list = vi.hoisted(() => vi.fn())

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: { list },
}))

const sampleTransaction = {
  id: 'recurring-1',
  kind: 'expense' as const,
  amount: 25,
  note: 'Netflix',
  category_id: 'cat-1',
  frequency: 'monthly' as const,
  next_execution: '2026-08-01',
  end_on: null,
}

describe('RecurringView', () => {
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
    list.mockReset()
  })

  it('lista frecuencia, próxima ejecución y una recurrencia sin fecha final', async () => {
    list.mockResolvedValueOnce([sampleTransaction])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    expect(wrapper.text()).toContain(t('recurringList.title'))
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain(t('recurringList.frequencies.monthly'))
    expect(wrapper.text()).toContain(t('recurringList.noEnd'))
    expect(wrapper.text()).toContain(t('recurringList.nextExecution'))
  })

  it('muestra el estado vacío', async () => {
    list.mockResolvedValueOnce([])
    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(wrapper.text()).toContain(t('recurringList.empty')))
  })

  it('muestra items con cursor-pointer para permitir edición', async () => {
    list.mockResolvedValueOnce([sampleTransaction])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    const items = wrapper.findAll('.cursor-pointer')
    expect(items.length).toBe(1)
  })

  it('abre el modal de edición al hacer click en un movimiento recurrente', async () => {
    list.mockResolvedValueOnce([sampleTransaction])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    const item = wrapper.find('.cursor-pointer')
    await item.trigger('click')
    await nextTick()

    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editingItem).toEqual(sampleTransaction)
  })

  it('abre el modal de creación al pulsar Añadir', async () => {
    list.mockResolvedValueOnce([])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    const addButton = wrapper.find('[aria-label="Añadir movimiento recurrente"]')
    await addButton.trigger('click')
    await nextTick()

    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editingItem).toBeUndefined()
  })

  it('recarga la lista al guardar desde el formulario', async () => {
    list
      .mockResolvedValueOnce([sampleTransaction])
      .mockResolvedValueOnce([sampleTransaction, {
        ...sampleTransaction,
        id: 'recurring-2',
        note: 'Spotify',
      }])

    const wrapper = mount(RecurringView)
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    await nextTick()

    wrapper.vm.showForm = true
    await wrapper.vm.onSaved()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))

    expect(wrapper.vm.showForm).toBe(false)
    expect(wrapper.text()).toContain('Spotify')
  })
})
