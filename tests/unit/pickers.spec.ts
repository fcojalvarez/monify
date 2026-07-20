import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PALETTE, SUGGESTED_ICONS } from '@/constants'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import IconPicker from '@/components/ui/IconPicker.vue'

const global = { stubs: { AppIcon: true } }

describe('selectores de color e icono', () => {
  it('emite el color seleccionado', async () => {
    const wrapper = mount(ColorPicker, { props: { modelValue: PALETTE[0] }, global })

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([PALETTE[1]])
  })

  it('normaliza iconos sugeridos y acepta un icono personalizado', async () => {
    const wrapper = mount(IconPicker, { props: { modelValue: SUGGESTED_ICONS[0] }, global })

    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      SUGGESTED_ICONS[0].includes('set:') ? `solar:${SUGGESTED_ICONS[0].split('set:')[1]}` : SUGGESTED_ICONS[0],
    ])

    await wrapper.get('[aria-label="Otro icono"]').trigger('click')
    await wrapper.get('input').setValue('mdi:cash')
    await wrapper.get('input').trigger('keydown.enter')

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['mdi:cash'])
  })
})
