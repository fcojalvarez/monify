import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useTransactionsStore } from '@/stores/transactions'
import type { Category, FamilyMember } from '@/types'

const category: Partial<Category> = {
  id: 'cat-1',
  name: 'Alimentación',
  icon: 'solar:cart-large-2-bold',
  color: '#f5492a',
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

function mountForm() {
  const wrapper = mount(TransactionForm, {
    global: {
      stubs: {
        BaseSelect: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template: `
        <select
          :value="modelValue"
          @change="$emit('update:modelValue', $event.target.value)"
        >
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
          >
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

  return { wrapper, store: useTransactionsStore() }
}

describe('TransactionForm', () => {
  it('no crea el movimiento si falta el importe', async () => {
    const { wrapper, store } = mountForm()

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Introduce un importe mayor que 0')
    expect(store.create).not.toHaveBeenCalled()
  })

  it('crea el movimiento con datos válidos', async () => {
    const { wrapper, store } = mountForm()
    ;(store.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    await wrapper.find('input[type="number"]').setValue('42.5')
    await wrapper.find('select').setValue('cat-1')
    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.create).toHaveBeenCalledTimes(1))

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'expense',
        amount: 42.5,
        category_id: 'cat-1',
        family_member_id: 'mem-1',
      }),
    )

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('muestra el botón de eliminar y elimina al confirmar', async () => {
    const tx = {
      id: 'tx-123',
      kind: 'expense',
      amount: 50,
      gross: null,
      category_id: 'cat-1',
      family_member_id: 'mem-1',
      occurred_on: '2026-07-01',
      note: 'test note',
    } as any

    const wrapper = mount(TransactionForm, {
      props: { transaction: tx },
      global: {
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

    const store = useTransactionsStore()
    ;(store.remove as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const deleteBtn = wrapper.find('button[class*="bg-expense"]')

    expect(deleteBtn.exists()).toBe(true)
    expect(deleteBtn.text()).toContain('Eliminar movimiento')

    // Abre el diálogo
    await deleteBtn.trigger('click')
    await nextTick()

    // Simula que el usuario confirma en BaseDialog
    const dialog = wrapper.findComponent(BaseDialog)
    expect(dialog.exists()).toBe(true)

    dialog.vm.$emit('confirm')
    await nextTick()

    await vi.waitFor(() => expect(store.remove).toHaveBeenCalledWith('tx-123'))

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('usa la fecha de inicio del filtro como valor por defecto si hoy no está en el mes activo', async () => {
    const wrapper = mount(TransactionForm, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              categories: { items: [category], loaded: true },
              family: { items: [member], loaded: true },
              transactions: {
                filters: {
                  from: '2026-05-01',
                  to: '2026-05-31',
                },
              },
            },
          }),
        ],
      },
    })

    const dateInput = wrapper.find('input[type="date"]')

    expect((dateInput.element as HTMLInputElement).value).toBe('2026-05-01')
  })
})
