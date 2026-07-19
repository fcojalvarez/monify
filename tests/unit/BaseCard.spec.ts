import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCard from '@/components/ui/BaseCard.vue'

describe('BaseCard', () => {
  it('renderiza el contenido del slot', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        default: '<span class="test-content">Contenido de prueba</span>',
      },
    })
    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Contenido de prueba')
  })

  it('aplica la clase padded por defecto', () => {
    const wrapper = mount(BaseCard)
    expect(wrapper.classes()).toContain('p-5')
  })

  it('no aplica la clase padded si padded es falso', () => {
    const wrapper = mount(BaseCard, {
      props: { padded: false },
    })
    expect(wrapper.classes()).not.toContain('p-5')
  })

  it('utiliza la etiqueta HTML indicada por la propiedad "as"', () => {
    const wrapper = mount(BaseCard, {
      props: { as: 'section' },
    })
    expect(wrapper.element.tagName.toLowerCase()).toBe('section')
  })
})
