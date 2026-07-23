import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDateInput from '@/components/ui/BaseDateInput.vue'

describe('BaseDateInput.vue', () => {
  it('se renderiza correctamente y muestra la fecha formateada cuando tiene valor', () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: '2026-07-23',
      },
    })

    // Debe contener el año o el mes formateado en español/inglés
    expect(wrapper.text()).toContain('2026')
  })

  it('muestra el placeholder cuando modelValue es nulo o vacío', () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: null,
        placeholder: 'Fecha personalizada',
      },
    })

    expect(wrapper.text()).toContain('Fecha personalizada')
  })

  it('abre el selector de fecha (calendario) al hacer clic en el botón disparador', async () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: null,
      },
    })

    // Inicialmente no está el dropdown visible
    expect(wrapper.find('.grid-cols-7').exists()).toBe(false)

    // Clic en el botón
    await wrapper.find('button').trigger('click')

    // Ahora el dropdown debe estar abierto
    expect(wrapper.find('.grid-cols-7').exists()).toBe(true)
  })

  it('permite cambiar de mes usando los botones de navegación', async () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: '2026-07-23',
      },
    })

    await wrapper.find('button').trigger('click') // Abrir
    const headerTitleInitial = wrapper.find('.font-bold.text-content').text()

    // Clic en anterior mes
    const navButtons = wrapper.findAll('button')
    // El segundo botón suele ser el de mes anterior
    await navButtons[1].trigger('click')

    const headerTitleAfter = wrapper.find('.font-bold.text-content').text()
    expect(headerTitleInitial).not.toBe(headerTitleAfter)
  })

  it('emite el valor correcto al hacer clic en un día del calendario', async () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: '2026-07-23',
      },
    })

    await wrapper.find('button').trigger('click') // Abrir

    // Buscar los botones de días en la cuadrícula de días
    const dayButtons = wrapper.findAll('.grid-cols-7 button')

    // Hacemos clic en uno de los días que tenga un número
    await dayButtons[15].trigger('click') // clic en algún botón del grid

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('no abre el selector de fecha cuando está deshabilitado', async () => {
    const wrapper = mount(BaseDateInput, {
      props: {
        modelValue: null,
        disabled: true,
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.grid-cols-7').exists()).toBe(false)
  })
})
