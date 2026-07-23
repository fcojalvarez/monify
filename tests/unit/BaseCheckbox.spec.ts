import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'

describe('BaseCheckbox.vue', () => {
  it('se renderiza correctamente con los valores por defecto', () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: false,
      },
    })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('renderiza la etiqueta cuando se proporciona', () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: false,
        label: 'Aceptar términos',
      },
    })

    expect(wrapper.text()).toContain('Aceptar términos')
  })

  it('muestra el icono de verificación cuando modelValue es verdadero', () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: true,
      },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('emite update:modelValue cuando se hace clic', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: false,
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('no emite eventos cuando está deshabilitado', async () => {
    const wrapper = mount(BaseCheckbox, {
      props: {
        modelValue: false,
        disabled: true,
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
