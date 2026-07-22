import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { categoriesService } from '@/services/categories.service'
import { familyService } from '@/services/family.service'

vi.mock('@/services/categories.service', () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

vi.mock('@/services/family.service', () => ({
  familyService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const category = (overrides = {}) => ({
  id: 'category-1', owner_id: 'user-1', name: 'Comida', icon: 'solar:cart-large-2-bold', color: '#ff0000',
  kind: 'expense', monthly_limit: null, created_at: '2026-01-01T00:00:00Z', ...overrides,
}) as any

const member = (overrides = {}) => ({
  id: 'member-1', owner_id: 'user-1', name: 'Ana', color: '#ff0000', avatar_icon: 'solar:user-bold',
  is_self: false, cash_balance: 0, created_at: '2026-01-01T00:00:00Z', ...overrides,
}) as any

describe('stores de categorías y personas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('carga categorías una sola vez y permite forzar la recarga', async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([category()])
    const store = useCategoriesStore()

    await store.fetchAll()
    await store.fetchAll()
    await store.fetchAll(true)

    expect(categoriesService.list).toHaveBeenCalledTimes(2)
    expect(store.loaded).toBe(true)
    expect(store.expenseCategories).toHaveLength(1)
    expect(store.getById('category-1')?.name).toBe('Comida')
  })

  it('getOrCreate devuelve la categoría existente (sin distinguir mayúsculas) sin crear otra', async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([category({ name: 'Ahorros', kind: 'expense' })])
    const store = useCategoriesStore()

    const result = await store.getOrCreate({ name: 'ahorros', kind: 'expense' })

    expect(result.id).toBe('category-1')
    expect(categoriesService.create).not.toHaveBeenCalled()
  })

  it('getOrCreate crea la categoría cuando no existe para ese tipo', async () => {
    vi.mocked(categoriesService.list).mockResolvedValue([category({ name: 'Ahorros', kind: 'expense' })])
    vi.mocked(categoriesService.create).mockResolvedValue(category({ id: 'category-2', name: 'Ahorros', kind: 'income' }))
    const store = useCategoriesStore()

    const result = await store.getOrCreate({ name: 'Ahorros', kind: 'income', icon: 'solar:safe-2-linear', color: '#8b5cf6' })

    expect(categoriesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ahorros', kind: 'income', icon: 'solar:safe-2-linear', color: '#8b5cf6' }),
    )
    expect(result.id).toBe('category-2')
    expect(store.items).toHaveLength(2)
  })

  it('sincroniza altas, cambios y bajas de categorías con el estado local', async () => {
    const store = useCategoriesStore()
    vi.mocked(categoriesService.create).mockResolvedValue(category())
    vi.mocked(categoriesService.update).mockResolvedValue(category({ name: 'Supermercado' }))

    await store.create(category())
    await store.update('category-1', { name: 'Supermercado' })
    await store.remove('category-1')

    expect(store.items).toEqual([])
    expect(categoriesService.remove).toHaveBeenCalledWith('category-1')
  })

  it('mantiene la persona principal y actualiza la lista de miembros', async () => {
    vi.mocked(familyService.list).mockResolvedValue([member({ is_self: true }), member({ id: 'member-2', name: 'Luis' })])
    const store = useFamilyStore()

    await store.fetchAll()
    expect(store.self?.name).toBe('Ana')
    expect(store.getById('member-2')?.name).toBe('Luis')

    vi.mocked(familyService.create).mockResolvedValue(member({ id: 'member-3', name: 'Marta' }))
    vi.mocked(familyService.update).mockResolvedValue(member({ id: 'member-2', name: 'Luis Miguel' }))
    await store.create(member({ id: 'member-3', name: 'Marta' }))
    await store.update('member-2', { name: 'Luis Miguel' })
    await store.remove('member-3')

    expect(store.items.map(({ name }) => name)).toEqual(['Ana', 'Luis Miguel'])
    expect(familyService.remove).toHaveBeenCalledWith('member-3')
  })
})
