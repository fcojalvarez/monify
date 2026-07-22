import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import CashMovementForm from '@/components/cash/CashMovementForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useCashStore } from '@/stores/cash'
import { setLocale } from '@/i18n'
import type { FamilyMember } from '@/types'

const member: Partial<FamilyMember> = {
  id: 'mem-1',
  name: 'Yo',
  color: '#00b894',
  avatar_icon: 'solar:user-bold',
  is_self: true,
}

const transaction = {
  id: 'ctx-1',
  cash_id: 'cash-1',
  owner_id: 'u1',
  amount: -25,
  note: 'Cena',
  family_member_id: 'mem-1',
  occurred_on: '2026-07-10',
  created_at: '2026-07-10T00:00:00Z',
} as any

function mountForm() {
  const wrapper = mount(CashMovementForm, {
    props: { transaction },
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
              <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          `,
        },
        SegmentedControl: {
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template: `
            <div>
              <button v-for="o in options" :key="String(o.value)" type="button"
                :data-value="o.value" @click="$emit('update:modelValue', o.value)">{{ o.label }}</button>
            </div>
          `,
        },
      },
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: { family: { items: [member] } },
        }),
      ],
    },
  })

  return { wrapper, store: useCashStore() }
}

describe('CashMovementForm', () => {
  beforeEach(() => {
    setLocale('es')
    vi.clearAllMocks()
  })

  it('precarga la dirección, importe y nota del movimiento', () => {
    const { wrapper } = mountForm()
    // amount = valor absoluto
    expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe('25')
    expect(wrapper.text()).toContain('Salida')
  })

  it('guarda los cambios llamando a updateTransaction con el signo correcto', async () => {
    const { wrapper, store } = mountForm()
    ;(store.updateTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('input[type="number"]').setValue('40')
    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.updateTransaction).toHaveBeenCalledTimes(1))
    expect(store.updateTransaction).toHaveBeenCalledWith(
      'ctx-1',
      expect.objectContaining({ amount: 40, isDeposit: false, note: 'Cena', familyMemberId: 'mem-1', occurredOn: '2026-07-10' }),
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('cambia la dirección a entrada y guarda con importe positivo', async () => {
    const { wrapper, store } = mountForm()
    ;(store.updateTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('button[data-value="deposit"]').trigger('click')
    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.updateTransaction).toHaveBeenCalledTimes(1))
    expect(store.updateTransaction).toHaveBeenCalledWith('ctx-1', expect.objectContaining({ isDeposit: true }))
  })

  it('no guarda si el importe no es válido', async () => {
    const { wrapper, store } = mountForm()

    await wrapper.find('input[type="number"]').setValue('0')
    await wrapper.find('form').trigger('submit.prevent')

    expect(store.updateTransaction).not.toHaveBeenCalled()
  })

  it('elimina el movimiento al confirmar en el diálogo', async () => {
    const { wrapper, store } = mountForm()
    ;(store.deleteTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const deleteBtn = wrapper.find('button[class*="bg-expense"]')
    expect(deleteBtn.exists()).toBe(true)
    await deleteBtn.trigger('click')
    await nextTick()

    wrapper.findComponent(BaseDialog).vm.$emit('confirm')
    await nextTick()

    await vi.waitFor(() => expect(store.deleteTransaction).toHaveBeenCalledWith('ctx-1'))
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
