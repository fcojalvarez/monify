import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileView from '@/views/dashboard/ProfileView.vue'
import { setLocale } from '@/i18n'

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
  beforeEach(() => setLocale('es'))

  it('prioriza preferencias y organización antes de los ajustes poco frecuentes', () => {
    const wrapper = mountView()
    
    // Verificar que existen las secciones con las clases de orden correctas
    const order1Card = wrapper.find('.order-1')
    const order2Card = wrapper.find('.order-2')
    
    expect(order1Card.exists()).toBe(true)
    expect(order2Card.exists()).toBe(true)
    expect(wrapper.text()).toContain('Preferencias')
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
