import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '@/components/ui/BaseInput.vue'

describe('BaseInput', () => {
  const defaultOptions = {
    global: {
      stubs: {
        AppIcon: true,
      },
    },
  }

  it('renderiza la etiqueta si se pasa por prop', () => {
    const wrapper = mount(BaseInput, {
      ...defaultOptions,
      props: {
        modelValue: '',
        label: 'Nombre completo',
      },
    })
    expect(wrapper.text()).toContain('Nombre completo')
  })

  it('enlaza el modelValue al input y emite el evento de actualización', async () => {
    const wrapper = mount(BaseInput, {
      ...defaultOptions,
      props: {
        modelValue: 'Hola',
      },
    })
    const input = wrapper.find('input')
    expect(input.element.value).toBe('Hola')

    await input.setValue('Nuevo Valor')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Nuevo Valor'])
  })

  it('muestra el mensaje de error si existe', () => {
    const wrapper = mount(BaseInput, {
      ...defaultOptions,
      props: {
        modelValue: '',
        error: 'El campo es obligatorio',
      },
    })
    expect(wrapper.text()).toContain('El campo es obligatorio')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  it('alterna la visibilidad de la contraseña al hacer clic en el botón de mostrar contraseña', async () => {
    const wrapper = mount(BaseInput, {
      ...defaultOptions,
      props: {
        modelValue: 'supersecreto',
        type: 'password',
      },
    })

    const input = wrapper.find('input')
    expect(input.attributes('type')).toBe('password')

    const toggleButton = wrapper.find('button')
    expect(toggleButton.exists()).toBe(true)

    // Clic para mostrar
    await toggleButton.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(toggleButton.attributes('aria-label')).toBe('Ocultar contraseña')

    // Clic para ocultar
    await toggleButton.trigger('click')
    expect(input.attributes('type')).toBe('password')
    expect(toggleButton.attributes('aria-label')).toBe('Mostrar contraseña')
  })

  it('renderiza el icono si se proporciona', () => {
    const wrapper = mount(BaseInput, {
      ...defaultOptions,
      props: {
        modelValue: '',
        icon: 'solar:user-bold',
      },
    })
    expect(wrapper.findComponent({ name: 'AppIcon' }).exists()).toBe(true)
  })
})
