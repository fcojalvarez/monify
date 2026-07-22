import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { nextTick } from 'vue'
import SavingsMovementForm from '@/components/savings/SavingsMovementForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useSavingsStore } from '@/stores/savings'
import { setLocale } from '@/i18n'

const savingAccount = {
  id: 'sav-1',
  name: 'Vacaciones',
  type: 'bank',
  balance: 120,
  target: null,
  color: '#8b5cf6',
  status: 'active',
  owner_id: 'u1',
  created_at: '',
}

const transaction = {
  id: 'stx-1',
  savings_id: 'sav-1',
  owner_id: 'u1',
  amount: 30,
  note: 'Aportación',
  occurred_on: '2026-07-15',
  created_at: '2026-07-15T00:00:00Z',
} as any

function mountForm() {
  const wrapper = mount(SavingsMovementForm, {
    props: { transaction },
    global: {
      stubs: {
        BaseInput: {
          props: ['modelValue', 'error'],
          emits: ['update:modelValue'],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
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
          initialState: { savings: { items: [savingAccount] } },
        }),
      ],
    },
  })

  return { wrapper, store: useSavingsStore() }
}

describe('SavingsMovementForm', () => {
  beforeEach(() => {
    setLocale('es')
    vi.clearAllMocks()
  })

  it('muestra la cuenta y precarga el importe', () => {
    const { wrapper } = mountForm()
    expect(wrapper.text()).toContain('Vacaciones')
    expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe('30')
  })

  it('guarda con importe positivo cuando es aportación', async () => {
    const { wrapper, store } = mountForm()
    ;(store.updateTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('input[type="number"]').setValue('45')
    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.updateTransaction).toHaveBeenCalledTimes(1))
    expect(store.updateTransaction).toHaveBeenCalledWith(
      'stx-1',
      expect.objectContaining({ amount: 45, isDeposit: true, note: 'Aportación', occurredOn: '2026-07-15' }),
    )
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('cambia a retirada y guarda', async () => {
    const { wrapper, store } = mountForm()
    ;(store.updateTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('button[data-value="withdrawal"]').trigger('click')
    await wrapper.find('form').trigger('submit.prevent')

    await vi.waitFor(() => expect(store.updateTransaction).toHaveBeenCalledTimes(1))
    expect(store.updateTransaction).toHaveBeenCalledWith('stx-1', expect.objectContaining({ isDeposit: false }))
  })

  it('elimina el movimiento al confirmar', async () => {
    const { wrapper, store } = mountForm()
    ;(store.deleteTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await wrapper.find('button[class*="bg-expense"]').trigger('click')
    await nextTick()

    wrapper.findComponent(BaseDialog).vm.$emit('confirm')
    await nextTick()

    await vi.waitFor(() => expect(store.deleteTransaction).toHaveBeenCalledWith('stx-1'))
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
