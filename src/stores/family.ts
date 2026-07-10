import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FamilyMember, TablesInsert, TablesUpdate } from '@/types'
import { familyService } from '@/services/family.service'

export const useFamilyStore = defineStore('family', () => {
  const items = ref<FamilyMember[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const self = computed(() => items.value.find((m) => m.is_self) ?? null)
  const getById = (id: string) => items.value.find((m) => m.id === id) ?? null

  async function fetchAll(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      items.value = await familyService.list()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Omit<TablesInsert<'family_members'>, 'owner_id'>) {
    const created = await familyService.create(payload)
    items.value.push(created)
    return created
  }

  async function update(id: string, changes: TablesUpdate<'family_members'>) {
    const updated = await familyService.update(id, changes)
    const index = items.value.findIndex((m) => m.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function remove(id: string) {
    await familyService.remove(id)
    items.value = items.value.filter((m) => m.id !== id)
  }

  return { items, loading, loaded, self, getById, fetchAll, create, update, remove }
})
