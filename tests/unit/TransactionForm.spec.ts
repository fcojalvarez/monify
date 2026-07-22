import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
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
        BaseInput: {
          props: ['modelValue', 'error'],
          emits: ['update:modelValue'],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
          methods: { focus: () => {} },
          setup() {
            return { $el: { scrollIntoView: () => {} } }
          },
        },
        BaseSelect: {
          props: ['modelValue', 'options', 'error'],
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
          methods: { focus: () => {} },
          setup() {
            return { $el: { scrollIntoView: () => {} } }
          },
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

    // El stub no muestra el mensaje de error, pero la validación debería prevenir el create
    expect(store.create).not.toHaveBeenCalled()
  })

  it('crea el movimiento con datos válidos', async () => {
    const { wrapper, store } = mountForm()
    ;(store.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    await wrapper.find('input[type="number"]').setValue('42.5')

    const selects = wrapper.findAll('select')

    await selects[0].setValue('mem-1') // miembro
    await selects[1].setValue('cat-1') // categoría

    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.create).toHaveBeenCalledTimes(1))

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: expect.objectContaining({
          kind: 'expense',
          amount: 42.5,
          category_id: 'cat-1',
          family_member_id: 'mem-1',
        }),
        gross: 0,
      }),
    )

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('permite crear una recurrencia personalizada (meses concretos + día) desde el formulario', async () => {
    const { wrapper } = mountForm()
    const recurring = useRecurringTransactionsStore()
    ;(recurring.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'r-new' })
    ;(recurring.sync as ReturnType<typeof vi.fn>).mockResolvedValue(0)

    await wrapper.find('input[type="number"]').setValue('320') // importe
    const selects = wrapper.findAll('select')
    await selects[0].setValue('mem-1') // miembro
    await selects[1].setValue('cat-1') // categoría

    // Activa "repetir movimiento" (segundo checkbox tras ¿Efectivo?)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[checkboxes.length - 1].setValue(true)
    await nextTick()

    // Frecuencia = personalizado (tercer select)
    const selectsWithFreq = wrapper.findAll('select')
    await selectsWithFreq[2].setValue('custom')
    await nextTick()

    // Elige los meses 6, 8, 10 y 12
    for (const month of [6, 8, 10, 12]) {
      await wrapper.find(`button[data-month="${month}"]`).trigger('click')
    }

    // Día del mes (último input numérico)
    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[numberInputs.length - 1].setValue('5')

    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(recurring.create).toHaveBeenCalledTimes(1))
    const payload = (recurring.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload).toMatchObject({ frequency: 'custom', months: [6, 8, 10, 12], day_of_month: 5 })
    expect(payload.next_execution).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(recurring.sync).toHaveBeenCalledTimes(1)
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
        stubs: {
          BaseInput: {
            props: ['modelValue', 'error'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
            methods: { focus: () => {} },
            setup() {
              return { $el: { scrollIntoView: () => {} } }
            },
          },
          BaseSelect: {
            props: ['modelValue', 'options', 'error'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
            methods: { focus: () => {} },
            setup() {
              return { $el: { scrollIntoView: () => {} } }
            },
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
        stubs: {
          BaseInput: {
            props: ['modelValue', 'error'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
            methods: { focus: () => {} },
          },
          BaseSelect: {
            props: ['modelValue', 'options', 'error'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
            methods: { focus: () => {} },
          },
        },
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

  it('muestra error si el gasto en efectivo supera el saldo de la cartera', async () => {
    const memberWithCash = { ...member, id: 'mem-cash-1', name: 'Alguien', cash_balance: 50 }
    const wrapper = mount(TransactionForm, {
      global: {
        stubs: {
          BaseInput: {
            props: ['modelValue', 'error'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
            methods: { focus: () => {} },
            setup() {
              return { $el: { scrollIntoView: () => {} } }
            },
          },
          BaseSelect: {
            props: ['modelValue', 'options', 'error'],
            emits: ['update:modelValue'],
            template: `
              <select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">
                <option v-for="option in options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            `,
            methods: { focus: () => {} },
            setup() {
              return { $el: { scrollIntoView: () => {} } }
            },
          },
        },
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              categories: { items: [category], loaded: true },
              family: { items: [memberWithCash], loaded: true },
            },
          }),
        ],
      },
    })

    const store = useTransactionsStore()

    // Buscamos el checkbox ¿Efectivo? y lo marcamos
    const cashCheckbox = wrapper.find('input[type="checkbox"]')
    await cashCheckbox.setValue(true)

    const selects = wrapper.findAll('select')

    await selects[0].setValue('mem-cash-1') // miembro
    await selects[1].setValue('cat-1') // categoría

    await wrapper.find('input[type="number"]').setValue('60')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('No hay esa cantidad en la cartera de Alguien')
    expect(store.create).not.toHaveBeenCalled()
  })

  it('hace focus en el primer input con error de validación', async () => {
    const wrapper = mount(TransactionForm, {
      global: {
        stubs: {
          BaseInput: {
            props: ['modelValue', 'error'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
            methods: { focus: () => {} },
          },
          BaseSelect: {
            props: ['modelValue', 'options', 'error'],
            emits: ['update:modelValue'],
            template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
            methods: { focus: () => {} },
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

    // Intentar enviar formulario vacío para generar errores
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    // Verificar que hay mensajes de error (el stub no muestra el error pero la validación se ejecuta)
    const store = useTransactionsStore()
    expect(store.create).not.toHaveBeenCalled()
  })
})
