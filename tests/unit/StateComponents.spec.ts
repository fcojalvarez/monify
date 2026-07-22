import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { setLocale } from '@/i18n'

describe('BaseSpinner', () => {
  beforeEach(() => setLocale('es'))

  it('muestra el spinner animado y el mensaje por defecto (Cargando…)', () => {
    const wrapper = mount(BaseSpinner)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cargando…')
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('acepta un mensaje personalizado', () => {
    const wrapper = mount(BaseSpinner, { props: { message: 'Cargando estadísticas...' } })
    expect(wrapper.text()).toContain('Cargando estadísticas...')
  })
})

describe('EmptyState', () => {
  it('muestra el título y la pista opcional', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Sin datos', hint: 'Añade algo' },
      global: { stubs: { AppIcon: true } },
    })
    expect(wrapper.text()).toContain('Sin datos')
    expect(wrapper.text()).toContain('Añade algo')
  })

  it('omite la pista cuando no se pasa', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Vacío' },
      global: { stubs: { AppIcon: true } },
    })
    expect(wrapper.text()).toContain('Vacío')
    expect(wrapper.findAll('p')).toHaveLength(1)
  })
})
