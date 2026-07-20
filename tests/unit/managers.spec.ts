import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CategoryManager from '@/components/categories/CategoryManager.vue'
import FamilyManager from '@/components/family/FamilyManager.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'

const dialogStub = {
  props: ['modelValue'],
  template: '<div v-if="modelValue" class="dialog"><slot /><button class="confirm" @click="$emit(\'confirm\')">Confirmar</button></div>',
}

const global = (pinia: ReturnType<typeof createPinia>) => ({
  plugins: [pinia],
  stubs: { AppIcon: true, BaseDialog: dialogStub, CategoryForm: { template: '<div class="category-form" />' }, FamilyForm: { template: '<div class="family-form" />' } },
})

describe('gestores de categorías y personas', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('agrupa categorías, abre su formulario y confirma su eliminación', async () => {
    const store = useCategoriesStore()
    store.items = [
      { id: 'expense', name: 'Comida', kind: 'expense', color: '#f00', icon: 'solar:cart-large-2-bold', monthly_limit: 50 },
      { id: 'income', name: 'Nómina', kind: 'income', color: '#0f0', icon: 'solar:wallet-money-bold', monthly_limit: null },
    ] as any
    const remove = vi.spyOn(store, 'remove').mockResolvedValue()
    const wrapper = mount(CategoryManager, { global: global(pinia) })

    expect(wrapper.text()).toContain('Gastos')
    expect(wrapper.text()).toContain('Ingresos')
    await wrapper.findAll('[aria-label="Eliminar"]')[0].trigger('click')
    await wrapper.get('.confirm').trigger('click')
    expect(remove).toHaveBeenCalledWith('expense')
  })

  it('abre el formulario de categoría desde su API expuesta', async () => {
    const wrapper = mount(CategoryManager, { global: global(pinia) })

    ;(wrapper.vm as any).openForm()
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).view).toBe('form')
    expect(wrapper.find('.category-form').exists()).toBe(true)
  })

  it('no permite eliminar a la persona principal y sí permite eliminar otra', async () => {
    const store = useFamilyStore()
    store.items = [
      { id: 'self', name: 'Yo', is_self: true, color: '#f00', avatar_icon: 'solar:user-bold' },
      { id: 'other', name: 'Alex', is_self: false, color: '#0f0', avatar_icon: 'solar:user-bold' },
    ] as any
    const remove = vi.spyOn(store, 'remove').mockResolvedValue()
    const wrapper = mount(FamilyManager, { global: global(pinia) })

    expect(wrapper.text()).toContain('(tú)')
    expect(wrapper.findAll('[aria-label="Eliminar"]')).toHaveLength(1)
    await wrapper.get('[aria-label="Eliminar"]').trigger('click')
    await wrapper.get('.confirm').trigger('click')

    expect(remove).toHaveBeenCalledWith('other')
  })
})
