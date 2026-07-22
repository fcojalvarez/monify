import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { setLocale } from '@/i18n'

describe('BaseSheet', () => {
  beforeEach(() => {
    setLocale('es')
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  const globalOptions = {
    global: {
      stubs: {
        Teleport: true,
        BaseDialog: {
          template: '<div class="base-dialog-stub" v-if="modelValue"><slot /><button class="confirm" @click="$emit(\'confirm\')">Confirmar</button></div>',
          props: ['modelValue']
        }
      },
    },
  }

  it('no renderiza nada cuando modelValue es falso', () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: false,
      },
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('renderiza el título y los slots cuando modelValue es verdadero', () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: true,
        title: 'Detalle de transacción',
      },
      slots: {
        default: '<span class="test-body">Cuerpo del sheet</span>',
        actions: '<button class="test-action">Acción</button>'
      }
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Detalle de transacción')
    expect(wrapper.find('.test-body').exists()).toBe(true)
    expect(wrapper.find('.test-action').exists()).toBe(true)
  })

  it('aplica overflow: hidden al body cuando se abre y lo limpia al cerrar', async () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: false,
      },
    })
    expect(document.body.style.overflow).toBe('')

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ modelValue: false })
    await nextTick()
    expect(document.body.style.overflow).toBe('')
  })

  it('cierra directamente si se hace clic en cerrar y no hay cambios', async () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: true,
        hasChanges: false,
      },
    })

    const closeBtn = wrapper.find('header button[aria-label="Cerrar"]')
    expect(closeBtn.exists()).toBe(true)

    await closeBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('muestra diálogo de confirmación si se intenta cerrar con cambios pendientes', async () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: true,
        hasChanges: true,
      },
    })

    const closeBtn = wrapper.find('header button[aria-label="Cerrar"]')
    await closeBtn.trigger('click')

    // No debería haber emitido la orden de cerrar el sheet aún
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()

    // El diálogo de confirmación debe mostrarse
    const confirmDialog = wrapper.findComponent(BaseDialog)
    expect(confirmDialog.exists()).toBe(true)
    expect(confirmDialog.props('modelValue')).toBe(true)

    // Confirmar en el diálogo para descartar cambios
    await confirmDialog.find('button.confirm').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('cierra el sheet al hacer clic en el backdrop por defecto', async () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: true,
      },
    })

    const backdrop = wrapper.find('.sheet-backdrop')
    await backdrop.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('no cierra el sheet al hacer clic en el backdrop si closeOnClickOutside es false', async () => {
    const wrapper = mount(BaseSheet, {
      ...globalOptions,
      props: {
        modelValue: true,
        closeOnClickOutside: false,
      },
    })

    const backdrop = wrapper.find('.sheet-backdrop')
    await backdrop.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
