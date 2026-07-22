import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { setLocale } from '@/i18n'

const options = [
  { value: 'a', label: 'Opción A' },
  { value: 'b', label: 'Opción B' },
]

const global = { stubs: { AppIcon: true } }

let wrappers: { unmount: () => void }[] = []

function track<T extends { unmount: () => void }>(wrapper: T): T {
  wrappers.push(wrapper)
  return wrapper
}

describe('BaseSelect · apilado del desplegable (top layer)', () => {
  beforeEach(() => setLocale('es'))

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers = []
    document.body.innerHTML = ''
  })

  it('teletransporta el desplegable DENTRO del <dialog> cuando vive en uno (mismo top layer)', async () => {
    const Host = {
      components: { BaseSelect },
      data: () => ({ model: '', options }),
      template: `<dialog open data-testid="host-dialog"><BaseSelect :model-value="model" :options="options" label="Ubicación" /></dialog>`,
    }

    const wrapper = track(mount(Host, { global, attachTo: document.body }))
    await wrapper.find('button').trigger('click')
    await nextTick()

    const dialog = document.querySelector('[data-testid="host-dialog"]')
    const overlay = document.querySelector('[data-testid="select-overlay"]')

    expect(dialog).not.toBeNull()
    expect(overlay).not.toBeNull()
    // El desplegable debe estar DENTRO del diálogo → comparte su top layer y queda por delante.
    expect(dialog!.contains(overlay!)).toBe(true)
    expect(overlay!.closest('dialog')).toBe(dialog)
  })

  it('teletransporta el desplegable a <body> cuando NO está dentro de un diálogo', async () => {
    const Host = {
      components: { BaseSelect },
      data: () => ({ model: '', options }),
      template: `<div><BaseSelect :model-value="model" :options="options" label="Persona" /></div>`,
    }

    const wrapper = track(mount(Host, { global, attachTo: document.body }))
    await wrapper.find('button').trigger('click')
    await nextTick()

    const overlay = document.querySelector('[data-testid="select-overlay"]')
    expect(overlay).not.toBeNull()
    // Sin diálogo ancestro, va a body (z-index alto) y no queda dentro de ningún diálogo.
    expect(overlay!.closest('dialog')).toBeNull()
    expect(overlay!.classList.contains('z-[999999]')).toBe(true)
  })

  it('respeta teleport=false (desplegable en flujo, sin teletransporte)', async () => {
    const Host = {
      components: { BaseSelect },
      data: () => ({ model: '', options }),
      template: `<dialog open data-testid="host-dialog"><BaseSelect :model-value="model" :options="options" :teleport="false" /></dialog>`,
    }

    const wrapper = track(mount(Host, { global, attachTo: document.body }))
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Con teleport desactivado el desplegable se renderiza en el propio árbol del select.
    const overlay = wrapper.find('[data-testid="select-overlay"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('absolute')
  })
})
