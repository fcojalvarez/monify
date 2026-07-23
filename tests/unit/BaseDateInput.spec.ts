import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDateInput from '@/components/ui/BaseDateInput.vue'

const globalOptions = {
  global: {
    stubs: {
      Teleport: true,
      AppIcon: true,
    },
  },
}

describe('BaseDateInput.vue', () => {
  it('se renderiza correctamente y muestra la fecha formateada cuando tiene valor', () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
      props: {
        modelValue: '2026-07-23',
      },
    })

    // Debe contener el año o el mes formateado en español/inglés
    expect(wrapper.text()).toContain('2026')
  })

  it('muestra el placeholder cuando modelValue es nulo o vacío', () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
      props: {
        modelValue: null,
        placeholder: 'Fecha personalizada',
      },
    })

    expect(wrapper.text()).toContain('Fecha personalizada')
  })

  it('abre el selector de fecha (calendario) al hacer clic en el botón disparador', async () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
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
      ...globalOptions,
      props: {
        modelValue: '2026-07-23',
      },
    })

    await wrapper.find('button').trigger('click') // Abrir

    // El tercer botón es el botón del mes (p. ej., "Julio" o "July")
    const initialMonth = wrapper.findAll('button')[2].text()

    // Clic en anterior mes (el segundo botón en el componente es prevAction)
    const navButtons = wrapper.findAll('button')
    await navButtons[1].trigger('click')

    const afterMonth = wrapper.findAll('button')[2].text()
    expect(initialMonth).not.toBe(afterMonth)
  })

  it('emite el valor correcto al hacer clic en un día del calendario', async () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
      props: {
        modelValue: '2026-07-23',
      },
    })

    await wrapper.find('button').trigger('click') // Abrir

    // Buscar los botones de días en la cuadrícula de días
    const dayButtons = wrapper.findAll('.grid-cols-7 + .grid button')

    // Hacemos clic en uno de los días que tenga un número
    await dayButtons[10].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('no abre el selector de fecha cuando está deshabilitado', async () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
      props: {
        modelValue: null,
        disabled: true,
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.grid-cols-7').exists()).toBe(false)
  })

  it('renderiza el slot-label para descripciones y contenidos adicionales en la etiqueta', () => {
    const wrapper = mount(BaseDateInput, {
      ...globalOptions,
      props: {
        modelValue: null,
        label: 'Fecha fin',
      },
      slots: {
        'label-slot': '<span class="extra-slot-content">(opcional)</span>',
      },
    })

    expect(wrapper.html()).toContain('extra-slot-content')
    expect(wrapper.text()).toContain('(opcional)')
  })
})
