import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CategoryForm from '@/components/categories/CategoryForm.vue'
import FamilyForm from '@/components/family/FamilyForm.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { setLocale } from '@/i18n'

const baseInput = {
  props: ['modelValue', 'error'],
  template: '<div><input class="base-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><p v-if="error">{{ error }}</p></div>',
}
const baseButton = { template: '<button><slot /></button>' }
const baseDialog = {
  props: ['modelValue', 'title'],
  template: '<div v-if="modelValue" class="dialog" :data-title="title"><slot /><button class="confirm" @click="$emit(\'confirm\')">Confirmar</button></div>',
}
const global = (pinia: ReturnType<typeof createPinia>) => ({
  plugins: [pinia],
  stubs: { AppIcon: true, BaseInput: baseInput, BaseButton: baseButton, BaseDialog: baseDialog, SegmentedControl: true, IconPicker: true, ColorPicker: true },
})

describe('formularios de catálogos', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    setLocale('es')
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('valida y crea una categoría con el límite opcional', async () => {
    const store = useCategoriesStore()
    const create = vi.spyOn(store, 'create').mockResolvedValue({} as any)
    const wrapper = mount(CategoryForm, { global: global(pinia) })

    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Ponle un nombre')
    expect(create).not.toHaveBeenCalled()

    await wrapper.find('.base-input').setValue('Ocio')
    await wrapper.find('form').trigger('submit')

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ocio', monthly_limit: null }))
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('actualiza una persona existente con los datos editados', async () => {
    const store = useFamilyStore()
    const update = vi.spyOn(store, 'update').mockResolvedValue({} as any)
    const wrapper = mount(FamilyForm, {
      global: global(pinia),
      props: { member: { id: 'member-1', name: 'Ana', color: '#f00', avatar_icon: 'solar:user-bold' } as any },
    })

    await wrapper.find('.base-input').setValue('Ana María')
    await wrapper.find('form').trigger('submit')

    expect(update).toHaveBeenCalledWith('member-1', expect.objectContaining({ name: 'Ana María' }))
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('advierte antes de crear una categoría muy parecida y permite confirmarla', async () => {
    const store = useCategoriesStore()
    store.items = [{ id: 'existing', name: 'Compras', kind: 'expense' }] as any
    const create = vi.spyOn(store, 'create').mockResolvedValue({} as any)
    const wrapper = mount(CategoryForm, { global: global(pinia) })

    await wrapper.find('.base-input').setValue('Comprass')
    await wrapper.find('form').trigger('submit')

    expect(create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Compras')
    expect(wrapper.text()).toContain('Revisa si te refieres a esa categoría')

    await wrapper.get('.dialog[data-title="¿Categoría parecida?"] .confirm').trigger('click')
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Comprass' }))
  })
})
