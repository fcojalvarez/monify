import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMemberOptions, useKindOptions, useCategoryOptions } from '@/composables/useEntityOptions'
import { useFamilyStore } from '@/stores/family'
import { useCategoriesStore } from '@/stores/categories'
import { setLocale } from '@/i18n'

describe('useEntityOptions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setLocale('es')
    const family = useFamilyStore()
    family.items = [
      { id: 'm1', name: 'Ana' },
      { id: 'm2', name: 'Luis' },
    ] as any
    const categories = useCategoriesStore()
    categories.items = [
      { id: 'c1', name: 'Ocio', kind: 'expense' },
      { id: 'c2', name: 'Nómina', kind: 'income' },
    ] as any
  })

  it('useMemberOptions mapea miembros y antepone "todos" opcional', () => {
    expect(useMemberOptions().value).toEqual([
      { value: 'm1', label: 'Ana' },
      { value: 'm2', label: 'Luis' },
    ])
    const withAll = useMemberOptions({ include: true })
    expect(withAll.value[0]).toEqual({ value: '', label: 'Todos' })
    expect(withAll.value).toHaveLength(3)
  })

  it('useKindOptions devuelve gasto/ingreso y "todos" con valor "all"', () => {
    const opts = useKindOptions({ include: true })
    expect(opts.value.map((o) => o.value)).toEqual(['all', 'expense', 'income'])
    expect(opts.value[1].label).toBe('Gasto')
    expect(opts.value[2].label).toBe('Ingreso')
  })

  it('useCategoryOptions filtra por tipo y respeta la etiqueta "todas" personalizada', () => {
    const expenseOnly = useCategoryOptions(() => 'expense')
    expect(expenseOnly.value).toEqual([{ value: 'c1', label: 'Ocio' }])

    const allKinds = useCategoryOptions(() => 'all', { include: true, label: 'Todas' })
    expect(allKinds.value[0]).toEqual({ value: '', label: 'Todas' })
    expect(allKinds.value).toHaveLength(3)
  })
})
