import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Profile } from '@/types'
import { profileService } from '@/services/profile.service'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null)
  const loading = ref(false)

  const savingsEnabled = computed(() => profile.value?.savings_enabled ?? false)

  const currency = computed(() => profile.value?.currency ?? 'EUR')

  const locale = computed(() => profile.value?.locale ?? 'es')

  async function load() {
    loading.value = true

    try {
      profile.value = await profileService.getProfile()
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    await load()
  }

  async function update(data: Partial<Profile>) {
    loading.value = true

    try {
      profile.value = await profileService.update(data)
    } finally {
      loading.value = false
    }
  }

  async function updateSavingsEnabled(enabled: boolean) {
    if (!profile.value) return

    const previous = profile.value.savings_enabled
    profile.value.savings_enabled = enabled

    try {
      await profileService.update({
        savings_enabled: enabled,
      })
    } catch (error) {
      profile.value.savings_enabled = previous
      throw error
    }
  }

  function reset() {
    profile.value = null
  }

  return {
    profile,
    loading,
    savingsEnabled,
    currency,
    locale,
    load,
    refresh,
    update,
    updateSavingsEnabled,
    reset,
  }
})
