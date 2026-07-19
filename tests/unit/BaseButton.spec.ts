import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renderiza el contenido del slot por defecto', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Enviar',
      },
    })
    expect(wrapper.text()).toBe('Enviar')
  })

  it('aplica las clases correctas según la variant', () => {
    const primaryWrapper = mount(BaseButton, {
      props: { variant: 'primary' },
    })
    expect(primaryWrapper.classes()).toContain('bg-primary-500')

    const dangerWrapper = mount(BaseButton, {
      props: { variant: 'danger' },
    })
    expect(dangerWrapper.classes()).toContain('bg-expense')
  })

  it('aplica las clases correctas según el size', () => {
    const smWrapper = mount(BaseButton, {
      props: { size: 'sm' },
    })
    expect(smWrapper.classes()).toContain('h-9')

    const lgWrapper = mount(BaseButton, {
      props: { size: 'lg' },
    })
    expect(lgWrapper.classes()).toContain('h-12')
  })

  it('aplica la clase de bloque cuando block es verdadero', () => {
    const wrapper = mount(BaseButton, {
      props: { block: true },
    })
    expect(wrapper.classes()).toContain('w-full')
  })

  it('muestra el spinner de carga y deshabilita el botón cuando loading es verdadero', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Enviar' }
    })
    
    // Debería tener el SVG de animación de spinner
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').classes()).toContain('animate-spin')
    
    // Debería estar deshabilitado
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('deshabilita el botón cuando disabled es verdadero', () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
