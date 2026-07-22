import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'

describe('BaseSwitch', () => {
  it('muestra la etiqueta y refleja el estado activo', () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: true, label: 'Efectivo' } })

    expect(wrapper.text()).toContain('Efectivo')
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('no renderiza etiqueta si no se pasa', () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: false } })
    expect(wrapper.find('span.text-sm').exists()).toBe(false)
  })

  it('emite update:modelValue al alternar', async () => {
    const wrapper = mount(BaseSwitch, { props: { modelValue: false } })

    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})
