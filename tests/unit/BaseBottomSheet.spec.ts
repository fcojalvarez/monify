import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseBottomSheet from '@/components/ui/BaseBottomSheet.vue'

describe('BaseBottomSheet', () => {
  it('abre y cierra el diálogo nativo según la propiedad modelValue', async () => {
    const wrapper = mount(BaseBottomSheet, {
      props: {
        modelValue: false,
      },
    })

    const dialogEl = wrapper.find('dialog').element as HTMLDialogElement
    expect(dialogEl.open).toBe(false)

    // Abrir
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    expect(dialogEl.open).toBe(true)

    // Cerrar
    await wrapper.setProps({ modelValue: false })
    await nextTick()
    expect(dialogEl.open).toBe(false)
  })

  it('renderiza el contenido del slot', () => {
    const wrapper = mount(BaseBottomSheet, {
      props: {
        modelValue: true,
      },
      slots: {
        default: '<div class="sheet-content">Contenido de la hoja inferior</div>',
      },
    })

    expect(wrapper.find('.sheet-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Contenido de la hoja inferior')
  })

  it('se cierra al hacer clic en el backdrop', async () => {
    const wrapper = mount(BaseBottomSheet, {
      props: {
        modelValue: true,
      },
    })

    const dialog = wrapper.find('dialog')
    // Simular el clic en el backdrop (el target del evento click es el dialog mismo)
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: dialog.element, enumerable: true })
    dialog.element.dispatchEvent(clickEvent)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
