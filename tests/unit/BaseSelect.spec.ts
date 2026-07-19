import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const globalOptions = {
  global: {
    stubs: {
      AppIcon: true,
    },
  },
}

describe('BaseSelect', () => {
  it('muestra la etiqueta y el valor seleccionado', () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '1',
        label: 'Categoría',
        placeholder: 'Selecciona una categoría',
        options: [
          { value: '1', label: 'Alimentación' },
          { value: '2', label: 'Transporte' },
        ],
      },
    })

    expect(wrapper.text()).toContain('Categoría')
    expect(wrapper.text()).toContain('Alimentación')
  })

  it('abre las opciones al hacer clic en el botón del select', async () => {
    // Limpiamos el body antes del test
    document.body.innerHTML = ''

    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        options: [
          { value: '1', label: 'Alimentación' },
        ],
      },
    })

    // El portal/backdrop no debería estar visible al inicio
    expect(document.body.innerHTML).not.toContain('Alimentación')

    // Clic en el botón para abrir
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Ahora debería estar en el body (teleportado)
    expect(document.body.innerHTML).toContain('Alimentación')
  })

  it('cierra el selector y detiene la propagación al hacer clic en el backdrop', async () => {
    const parentClickSpy = vi.fn()
    const TestComponent = {
      components: { BaseSelect },
      template: `
        <div @click="parentClick">
          <BaseSelect
            model-value=""
            :options="[{ value: '1', label: 'Alimentación' }]"
          />
        </div>
      `,
      methods: {
        parentClick: parentClickSpy
      }
    }

    const wrapper = mount(TestComponent, {
      global: {
        stubs: {
          AppIcon: true,
          Teleport: true, // Stub para renderizar inline y poder comprobar la propagación en el DOM del test
        }
      }
    })

    // Abrimos el select
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Buscamos el backdrop overlay
    const selectInstance = wrapper.findComponent(BaseSelect)
    const backdrop = selectInstance.find('div[class*="inset-0"]')
    expect(backdrop.exists()).toBe(true)

    // Clic en el backdrop (usamos click.self para simular el click.self en el backdrop)
    await backdrop.trigger('click')
    await nextTick()

    // El select debe haberse cerrado (su ref open pasa a ser false)
    expect(selectInstance.find('div[class*="inset-0"]').exists()).toBe(false)

    // La propagación debe haberse detenido (.stop), por lo que el padre no recibe el evento click
    expect(parentClickSpy).not.toHaveBeenCalled()
  })
})
