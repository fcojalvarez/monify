import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileView from '@/views/dashboard/ProfileView.vue'

const sheetStub = {
  props: ['modelValue', 'title'],
  template: '<section v-if="modelValue" class="sheet-stub" :data-title="title"><slot /><slot name="actions" /></section>',
}

function mountView() {
  return mount(ProfileView, {
    global: {
      plugins: [createTestingPinia({
        createSpy: vi.fn,
        initialState: {
          auth: { user: { email: 'ana@example.com', created_at: '2026-01-01', user_metadata: { display_name: 'Ana' } } },
          profile: { profile: { savings_enabled: false, cash_enabled: false } },
        },
      })],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' }, AppIcon: true, BaseSheet: sheetStub,
        BaseDialog: true, CategoryManager: true, FamilyManager: true,
      },
    },
  })
}

describe('ProfileView', () => {
  it('prioriza preferencias y organización antes de los ajustes poco frecuentes', () => {
    const wrapper = mountView()
    const cards = wrapper.findAll('main > *').filter(node => node.classes().includes('p-5'))

    expect(cards.find(card => card.text().includes('Preferencias'))?.classes()).toContain('order-1')
    expect(cards.find(card => card.text().includes('Organización'))?.classes()).toContain('order-2')
    expect(wrapper.text()).toContain('Organización')
  })

  it('abre los paneles de personas y categorías desde Organización', async () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('button')
    const persons = buttons.find(button => button.text().includes('Personas'))
    const categories = buttons.find(button => button.text().includes('Categorías'))

    await persons!.trigger('click')
    expect(wrapper.find('.sheet-stub[data-title="Personas"]').exists()).toBe(true)

    await categories!.trigger('click')
    expect(wrapper.find('.sheet-stub[data-title="Categorías"]').exists()).toBe(true)
  })
})
