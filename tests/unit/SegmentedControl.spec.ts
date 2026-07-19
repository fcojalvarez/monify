import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

describe('SegmentedControl', () => {
  const options = [
    { value: 'all', label: 'Todos' },
    { value: 'income', label: 'Ingresos' },
    { value: 'expense', label: 'Gastos' },
  ]

  it('renderiza todos los botones de las opciones', () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        modelValue: 'all',
        options,
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0].text()).toBe('Todos')
    expect(buttons[1].text()).toBe('Ingresos')
    expect(buttons[2].text()).toBe('Gastos')
  })

  it('aplica la clase activa correspondiente al valor seleccionado', () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        modelValue: 'income',
        options,
      },
    })

    const buttons = wrapper.findAll('button')
    // El botón de 'Ingresos' (índice 1) debe tener la clase activa de surface elevada
    expect(buttons[1].classes()).toContain('bg-surface-raised')
    // Los otros no deben tenerla
    expect(buttons[0].classes()).not.toContain('bg-surface-raised')
    expect(buttons[2].classes()).not.toContain('bg-surface-raised')
  })

  it('emite el evento update:modelValue al hacer clic en una opción', async () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        modelValue: 'all',
        options,
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['expense'])
  })
})
