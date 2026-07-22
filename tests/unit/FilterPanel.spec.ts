import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import { setLocale } from '@/i18n'

const mountPanel = () =>
  mount(FilterPanel, {
    props: { title: 'Filtros', clearLabel: 'Limpiar filtros' },
    slots: { default: '<p class="fields">campos</p>' },
    global: {
      stubs: {
        AppIcon: true,
        BaseCard: { template: '<div><slot /></div>' },
      },
    },
  })

describe('FilterPanel', () => {
  beforeEach(() => setLocale('es'))

  it('mantiene el contenido oculto hasta que se abre la cabecera', async () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.fields').exists()).toBe(false)

    await wrapper.find('.cursor-pointer').trigger('click')

    expect(wrapper.find('.fields').exists()).toBe(true)
    expect(wrapper.text()).toContain('Filtros')
  })

  it('emite el evento clear al pulsar limpiar', async () => {
    const wrapper = mountPanel()
    await wrapper.find('.cursor-pointer').trigger('click')

    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('Limpiar filtros'))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
  })
})
