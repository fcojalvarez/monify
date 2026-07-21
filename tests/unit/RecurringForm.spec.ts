import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import RecurringForm from '@/components/transactions/RecurringForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { setLocale } from '@/i18n'
import type { Category, FamilyMember } from '@/types'

vi.mock('@/services/recurring-transactions.service', () => ({
  recurringTransactionsService: {
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

const category: Partial<Category> = {
  id: 'cat-1',
  name: 'Ocio',
  icon: 'solar:gamepad-bold',
  color: '#ff0000',
  kind: 'expense',
  monthly_limit: null,
}

const member: Partial<FamilyMember> = {
  id: 'mem-1',
  name: 'Yo',
  color: '#00b894',
  avatar_icon: 'solar:user-bold',
  is_self: true,
}

const recurringTransaction = {
  id: 'recurring-1',
  kind: 'expense' as const,
  amount: 25,
  gross: null,
  category_id: 'cat-1',
  family_member_id: 'mem-1',
  payment_method: 'bank' as const,
  note: 'Netflix',
  frequency: 'monthly' as const,
  start_on: '2026-07-01',
  next_execution: '2026-08-01',
  end_on: null,
}

function mountForm(props: { transaction?: typeof recurringTransaction } = {}) {
  const wrapper = mount(RecurringForm, {
    props,
    global: {
      stubs: {
        BaseInput: {
          props: ['modelValue', 'error'],
          emits: ['update:modelValue'],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
        },
        BaseSelect: {
          props: ['modelValue', 'options', 'error'],
          emits: ['update:modelValue'],
          template: `
            <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
              <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          `,
        },
      },
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            categories: { items: [category], loaded: true },
            family: { items: [member], loaded: true },
          },
        }),
      ],
    },
  })

  return {
    wrapper,
    store: useRecurringTransactionsStore(),
  }
}

describe('RecurringForm', () => {
  beforeEach(() => {
    setLocale('es')
    vi.clearAllMocks()
  })

  it('muestra el botón Crear y oculta eliminar en modo creación', () => {
    const { wrapper } = mountForm()

    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.exists()).toBe(true)
    expect(submitButton.text()).toContain('Crear')

    const dangerButtons = wrapper.findAll('.flex.flex-col.gap-3 button')
    expect(dangerButtons).toHaveLength(1)
  })

  it('muestra el botón Editar y eliminar en modo edición', () => {
    const { wrapper } = mountForm({ transaction: recurringTransaction })

    expect(wrapper.text()).toContain('Editar')
    expect(wrapper.text()).toContain('Eliminar')
  })

  it('no crea la recurrencia si falta el importe', async () => {
    const { wrapper, store } = mountForm()

    await wrapper.find('form').trigger('submit.prevent')

    expect(store.create).not.toHaveBeenCalled()
    expect(store.sync).not.toHaveBeenCalled()
  })

  it('crea la recurrencia con datos válidos y sincroniza', async () => {
    const { wrapper, store } = mountForm()
    ;(store.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-recurring' })
    ;(store.sync as ReturnType<typeof vi.fn>).mockResolvedValue(0)

    await wrapper.find('input[type="number"]').setValue('42.5')

    const selects = wrapper.findAll('select')
    await selects[0].setValue('mem-1')
    await selects[1].setValue('cat-1')

    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.create).toHaveBeenCalledTimes(1))
    expect(store.sync).toHaveBeenCalledTimes(1)
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'expense',
        amount: 42.5,
        category_id: 'cat-1',
        family_member_id: 'mem-1',
        frequency: 'monthly',
      }),
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('actualiza la recurrencia en modo edición', async () => {
    const { wrapper } = mountForm({ transaction: recurringTransaction })
    ;(recurringTransactionsService.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    await wrapper.find('input[type="number"]').setValue('30')

    const selects = wrapper.findAll('select')
    await selects[0].setValue('mem-1')
    await selects[1].setValue('cat-1')

    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(recurringTransactionsService.update).toHaveBeenCalledTimes(1))
    expect(recurringTransactionsService.update).toHaveBeenCalledWith(
      'recurring-1',
      expect.objectContaining({
        amount: 30,
        category_id: 'cat-1',
      }),
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('elimina la recurrencia al confirmar en el diálogo', async () => {
    const { wrapper } = mountForm({ transaction: recurringTransaction })
    ;(recurringTransactionsService.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const deleteBtn = wrapper.find('button[class*="bg-expense"]')
    expect(deleteBtn.exists()).toBe(true)

    await deleteBtn.trigger('click')
    await nextTick()

    const dialog = wrapper.findComponent(BaseDialog)
    dialog.vm.$emit('confirm')
    await nextTick()

    await vi.waitFor(() => expect(recurringTransactionsService.remove).toHaveBeenCalledWith('recurring-1'))
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
