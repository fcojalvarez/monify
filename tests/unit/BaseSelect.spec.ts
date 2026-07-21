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

    // Limpiamos el spy antes de probar la propagación del backdrop
    parentClickSpy.mockClear()

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

  it('muestra un mensaje cuando la búsqueda no encuentra opciones', async () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        teleport: false,
        options: Array.from({ length: 9 }, (_, index) => ({
          value: String(index),
          label: `Categoría ${index + 1}`,
        })),
      },
    })

    await wrapper.find('button').trigger('click')
    await wrapper.find('input[placeholder="Buscar..."]').setValue('sin coincidencias')

    expect(wrapper.text()).toContain('No hay resultados para esta búsqueda.')
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('expone el método focus() y el elemento DOM', () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        options: [{ value: '1', label: 'Opción 1' }],
      },
    })
    
    expect(wrapper.vm.focus).toBeDefined()
    expect(typeof wrapper.vm.focus).toBe('function')
    expect(wrapper.vm.$el).toBeDefined()
  })

  it('hace focus en el botón al llamar al método focus()', () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        options: [{ value: '1', label: 'Opción 1' }],
      },
    })
    
    const button = wrapper.find('button')
    const focusSpy = vi.spyOn(button.element, 'focus')
    
    wrapper.vm.focus()
    
    expect(focusSpy).toHaveBeenCalled()
  })

  it('muestra borde rojo y mensaje de error cuando hay error', () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        error: 'Debes seleccionar una opción',
        options: [{ value: '1', label: 'Opción 1' }],
      },
    })
    
    const button = wrapper.find('button')
    expect(button.classes()).toContain('border-expense')
    expect(wrapper.text()).toContain('Debes seleccionar una opción')
  })

  it('no muestra borde rojo cuando no hay error', () => {
    const wrapper = mount(BaseSelect, {
      ...globalOptions,
      props: {
        modelValue: '',
        options: [{ value: '1', label: 'Opción 1' }],
      },
    })
    
    const button = wrapper.find('button')
    expect(button.classes()).not.toContain('border-expense')
    expect(button.classes()).toContain('border-transparent')
  })
})
