import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
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
})
