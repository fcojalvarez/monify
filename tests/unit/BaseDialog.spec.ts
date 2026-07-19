import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

describe('BaseDialog', () => {
  const globalOptions = {
    global: {
      stubs: {
        AppIcon: true,
        BaseButton: {
          template: '<button class="base-button-stub"><slot /></button>',
        },
      },
    },
  }

  it('abre y cierra el diálogo nativo al cambiar modelValue', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: false,
      },
    })

    const dialogEl = wrapper.find('dialog').element as HTMLDialogElement
    expect(dialogEl.open).toBe(false)

    // Cambiar modelValue a true
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    expect(dialogEl.open).toBe(true)

    // Cambiar modelValue a false
    await wrapper.setProps({ modelValue: false })
    await nextTick()
    expect(dialogEl.open).toBe(false)
  })

  it('renderiza el título y el contenido del slot', () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        title: 'Confirmar acción',
      },
      slots: {
        default: '<p class="content">¿Estás seguro?</p>',
      },
    })

    expect(wrapper.text()).toContain('Confirmar acción')
    expect(wrapper.find('.content').exists()).toBe(true)
  })

  it('emite el evento close y update:modelValue al hacer clic en el botón de cerrar', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        showClose: true,
      },
    })

    const closeBtn = wrapper.find('header button')
    expect(closeBtn.exists()).toBe(true)

    await closeBtn.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('emite confirm al pulsar el botón de confirmación en la variante confirm', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        variant: 'confirm',
        confirmText: 'Sí, borrar',
      },
    })

    const confirmBtn = wrapper.find('footer button')
    expect(confirmBtn.exists()).toBe(true)
    expect(confirmBtn.text()).toContain('Sí, borrar')

    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emite cancel al pulsar el botón de cancelar', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        variant: 'confirm',
        showCancel: true,
        cancelText: 'No, esperar',
      },
    })

    const buttons = wrapper.findAll('footer button')
    const cancelBtn = buttons.find((btn) => btn.text().includes('No, esperar'))
    expect(cancelBtn).toBeDefined()

    await cancelBtn!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('se cierra al hacer clic en el backdrop si closeOnBackdrop es true', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        closeOnBackdrop: true,
      },
    })

    const dialog = wrapper.find('dialog')
    
    // Para simular hacer clic en el backdrop, el target del evento debe ser el propio elemento <dialog>
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: dialog.element, enumerable: true })
    dialog.element.dispatchEvent(clickEvent)
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('no se cierra al hacer clic en el backdrop si es persistent o closeOnBackdrop es false', async () => {
    const wrapper = mount(BaseDialog, {
      ...globalOptions,
      props: {
        modelValue: true,
        persistent: true,
      },
    })

    const dialog = wrapper.find('dialog')
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: dialog.element, enumerable: true })
    dialog.element.dispatchEvent(clickEvent)
    await nextTick()

    expect(wrapper.emitted('close')).toBeFalsy()
  })
})
