import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Category, CategoryKind, TablesInsert, TablesUpdate } from '@/types'
import { categoriesService } from '@/services/categories.service'

export const useCategoriesStore = defineStore('categories', () => {
  const items = ref<Category[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const byKind = (kind: CategoryKind) => computed(() => items.value.filter((c) => c.kind === kind))
  const incomeCategories = byKind('income')
  const expenseCategories = byKind('expense')
  const getById = (id: string) => items.value.find((c) => c.id === id) ?? null

  async function fetchAll(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      items.value = await categoriesService.list()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Omit<TablesInsert<'categories'>, 'owner_id'>) {
    const created = await categoriesService.create(payload)
    items.value.push(created)
    return created
  }

  /**
   * Devuelve la categoría que coincide con `name` (sin distinguir mayúsculas) y `kind`,
   * creándola si no existe. Centraliza la lógica de "categoría automática" que usan
   * los movimientos de efectivo y ahorros para reflejarse en la cuenta principal.
   */
  async function getOrCreate(payload: {
    name: string
    kind: CategoryKind
    icon?: string
    color?: string
  }) {
    await fetchAll()

    const existing = items.value.find(
      (c) => c.name.toLowerCase() === payload.name.toLowerCase() && c.kind === payload.kind,
    )
    if (existing) return existing

    return create({
      name: payload.name,
      kind: payload.kind,
      icon: payload.icon,
      color: payload.color,
    })
  }

  async function update(id: string, changes: TablesUpdate<'categories'>) {
    const updated = await categoriesService.update(id, changes)
    const index = items.value.findIndex((c) => c.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function remove(id: string) {
    await categoriesService.remove(id)
    items.value = items.value.filter((c) => c.id !== id)
  }

  return {
    items,
    loading,
    loaded,
    incomeCategories,
    expenseCategories,
    getById,
    fetchAll,
    create,
    getOrCreate,
    update,
    remove,
  }
})
