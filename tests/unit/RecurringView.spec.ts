import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import RecurringView from '@/views/dashboard/RecurringView.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { setLocale, t } from '@/i18n'

const list = vi.hoisted(() => vi.fn())

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: { list },
}))

const sampleExpense = {
  id: 'recurring-1',
  kind: 'expense' as const,
  amount: 25,
  note: 'Netflix',
  category_id: 'cat-1',
  family_member_id: 'mem-1',
  frequency: 'monthly' as const,
  next_execution: '2026-08-01',
  end_on: null,
}

const sampleIncome = {
  id: 'recurring-2',
  kind: 'income' as const,
  amount: 1500,
  note: 'Salario',
  category_id: 'cat-2',
  family_member_id: 'mem-1',
  frequency: 'monthly' as const,
  next_execution: '2026-07-01',
  end_on: null,
}

function mountView() {
  return mount(RecurringView, {
    global: {
      stubs: {
        RecurringItem: {
          props: ['transaction'],
          template: '<li class="recurring-item">{{ transaction.note }}</li>',
        },
        RecurringForm: true,
        BaseSheet: true,
        AppIcon: true,
        Teleport: true,
      },
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            categories: {
              items: [
                { id: 'cat-1', name: 'Ocio', kind: 'expense', icon: 'x', color: '#f00', owner_id: 'u1', created_at: '', updated_at: '' },
                { id: 'cat-2', name: 'Nómina', kind: 'income', icon: 'x', color: '#0f0', owner_id: 'u1', created_at: '', updated_at: '' },
              ],
              loaded: true,
            },
            family: {
              items: [{ id: 'mem-1', name: 'Yo', color: '#000', avatar_icon: 'x', is_self: true }],
              loaded: true,
            },
          },
        }),
      ],
    },
  })
}

async function openSearch(wrapper: ReturnType<typeof mountView>) {
  await wrapper.find(`[aria-label="${t('recurringList.openSearch')}"]`).trigger('click')
  await nextTick()
}

describe('RecurringView', () => {
  beforeEach(() => {
    setLocale('es')
    list.mockReset()
  })

  it('lista frecuencia, próxima ejecución y una recurrencia sin fecha final', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Netflix'))

    expect(wrapper.text()).toContain(t('recurringList.title'))
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
  })

  it('abre el buscador al pulsar el icono y oculta el título', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Netflix'))

    await openSearch(wrapper)

    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(t('recurringList.subtitle'))
    expect(wrapper.find(`[aria-label="${t('recurringList.openSearch')}"]`).exists()).toBe(false)
  })

  it('restaura el título al cerrar el buscador', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Netflix'))

    await openSearch(wrapper)
    await wrapper.find(`[aria-label="${t('recurringList.closeSearch')}"]`).trigger('click')
    await nextTick()

    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(t('recurringList.title'))
  })

  it('muestra el estado vacío', async () => {
    list.mockResolvedValueOnce([])
    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.text()).toContain(t('recurringList.empty')))
  })

  it('muestra items en el listado para permitir edición', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.findAll('.recurring-item')).toHaveLength(1))
  })

  it('abre el modal de edición al hacer click en un movimiento recurrente', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.find('.recurring-item').exists()).toBe(true))

    await wrapper.find('.recurring-item').trigger('click')
    await nextTick()

    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editingItem).toEqual(sampleExpense)
  })

  it('abre el modal de creación al pulsar Añadir', async () => {
    list.mockResolvedValueOnce([])

    const wrapper = mountView()
    await vi.waitFor(() => expect(list).toHaveBeenCalled())
    await nextTick()

    await wrapper.find('[aria-label="Añadir movimiento recurrente"]').trigger('click')
    await nextTick()

    expect(wrapper.vm.showForm).toBe(true)
    expect(wrapper.vm.editingItem).toBeUndefined()
  })

  it('recarga la lista al guardar desde el formulario', async () => {
    list
      .mockResolvedValueOnce([sampleExpense])
      .mockResolvedValueOnce([sampleExpense, { ...sampleExpense, id: 'recurring-2', note: 'Spotify' }])

    const wrapper = mountView()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    await nextTick()

    wrapper.vm.showForm = true
    await wrapper.vm.onSaved()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))

    expect(wrapper.vm.showForm).toBe(false)
    expect(wrapper.text()).toContain('Spotify')
  })

  it('filtra por texto de búsqueda', async () => {
    list.mockResolvedValueOnce([sampleExpense, sampleIncome])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.findAll('.recurring-item')).toHaveLength(2))

    await openSearch(wrapper)
    await wrapper.find('input[type="search"]').setValue('Salario')
    await nextTick()

    expect(wrapper.findAll('.recurring-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Salario')
    expect(wrapper.text()).not.toContain('Netflix')
  })

  it('filtra por tipo de flujo', async () => {
    list.mockResolvedValueOnce([sampleExpense, sampleIncome])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.findAll('.recurring-item')).toHaveLength(2))

    await wrapper.find('.cursor-pointer').trigger('click')
    await nextTick()

    const kindSelect = wrapper.findAllComponents(BaseSelect)[1]
    await kindSelect.vm.$emit('update:modelValue', 'expense')
    await nextTick()

    expect(wrapper.findAll('.recurring-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Netflix')
  })

  it('muestra mensaje sin resultados cuando los filtros no coinciden', async () => {
    list.mockResolvedValueOnce([sampleExpense])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.findAll('.recurring-item')).toHaveLength(1))

    await openSearch(wrapper)
    await wrapper.find('input[type="search"]').setValue('inexistente')
    await nextTick()

    expect(wrapper.text()).toContain(t('common.noResults'))
    expect(wrapper.findAll('.recurring-item')).toHaveLength(0)
  })

  it('permite limpiar todos los filtros', async () => {
    list.mockResolvedValueOnce([sampleExpense, sampleIncome])

    const wrapper = mountView()
    await vi.waitFor(() => expect(wrapper.findAll('.recurring-item')).toHaveLength(2))

    wrapper.vm.searchQuery = 'Netflix'
    wrapper.vm.activeKind = 'expense'
    await nextTick()

    expect(wrapper.findAll('.recurring-item')).toHaveLength(1)

    await wrapper.find('.cursor-pointer').trigger('click')
    await nextTick()

    const clearBtn = wrapper.findAll('button').find(button => button.text().includes(t('recurringList.clearFilters')))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')
    await nextTick()

    expect(wrapper.vm.searchQuery).toBe('')
    expect(wrapper.vm.activeKind).toBe('all')
    expect(wrapper.findAll('.recurring-item')).toHaveLength(2)
  })
})
