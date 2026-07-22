import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileView from '@/views/dashboard/ProfileView.vue'
import { transactionsService } from '@/services/transactions.service'
import { useTransactionsStore } from '@/stores/transactions'
import { setLocale } from '@/i18n'

vi.mock('@/services/transactions.service', () => ({
  transactionsService: { list: vi.fn().mockResolvedValue([]) },
}))

const sheetStub = {
  props: ['modelValue', 'title'],
  template: '<section v-if="modelValue" class="sheet-stub" :data-title="title"><slot /><slot name="actions" /></section>',
}

function mountView() {
  return mount(ProfileView, {
    global: {
      plugins: [createTestingPinia({
        createSpy: vi.fn,
        initialState: {
          auth: { user: { email: 'ana@example.com', created_at: '2026-01-01', user_metadata: { display_name: 'Ana' } } },
          profile: { profile: { savings_enabled: false, cash_enabled: false } },
        },
      })],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' }, AppIcon: true, BaseSheet: sheetStub,
        BaseDialog: true, CategoryManager: true, FamilyManager: true,
      },
    },
  })
}

describe('ProfileView', () => {
  beforeEach(() => setLocale('es'))

  it('prioriza preferencias y organización antes de los ajustes poco frecuentes', () => {
    const wrapper = mountView()
    
    // Verificar que existen las secciones con las clases de orden correctas
    const order1Card = wrapper.find('.order-1')
    const order2Card = wrapper.find('.order-2')
    
    expect(order1Card.exists()).toBe(true)
    expect(order2Card.exists()).toBe(true)
    expect(wrapper.text()).toContain('Preferencias')
    expect(wrapper.text()).toContain('Organización')
  })

  it('abre los paneles de personas y categorías desde Organización', async () => {
    const wrapper = mountView()
    const buttons = wrapper.findAll('button')
    const persons = buttons.find(button => button.text().includes('Personas'))
    const categories = buttons.find(button => button.text().includes('Categorías'))

    await persons!.trigger('click')
    expect(wrapper.find('.sheet-stub[data-title="Personas"]').exists()).toBe(true)

    await categories!.trigger('click')
    expect(wrapper.find('.sheet-stub[data-title="Categorías"]').exists()).toBe(true)
  })

  it('exporta los movimientos a CSV descargando un fichero', async () => {
    const rows = [
      { occurred_on: '2026-03-10', kind: 'income', amount: 2500, note: 'Nómina', category: { name: 'Sueldo' }, family_member: { name: 'Ana' } },
      { occurred_on: '2026-03-12', kind: 'expense', amount: 40, note: null, category: { name: 'Ocio' }, family_member: { name: 'Ana' } },
    ]
    vi.mocked(transactionsService.list).mockResolvedValue(rows as any)

    const createObjectURL = vi.fn(() => 'blob:mock')
    ;(URL as any).createObjectURL = createObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountView()
    await (wrapper.vm as any).exportToCSV()
    await flushPromises()

    expect(transactionsService.list).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    clickSpy.mockRestore()
  })

  it('borra todos los movimientos llamando a clearAll del store', async () => {
    const wrapper = mountView()
    const store = useTransactionsStore()
    ;(store.clearAll as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await (wrapper.vm as any).confirmClearData()
    await flushPromises()

    expect(store.clearAll).toHaveBeenCalledTimes(1)
    expect((wrapper.vm as any).clearSuccess).toBe(true)
    expect((wrapper.vm as any).showClearDialog).toBe(false)
  })
})
