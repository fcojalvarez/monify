import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Profile } from '@/types'
import { profileService } from '@/services/profile.service'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null)
  const loading = ref(false)

  const savingsEnabled = computed(() => profile.value?.savings_enabled ?? false)
  const cashEnabled = computed(() => profile.value?.cash_enabled ?? false)

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

  async function updatePreference<K extends keyof Profile>(key: K, value: Profile[K]) {
    if (!profile.value) return

    const previous = profile.value[key]

    profile.value[key] = value

    try {
      profile.value = await profileService.update({
        [key]: value,
      } as Partial<Profile>)
    } catch (error) {
      profile.value[key] = previous
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
    cashEnabled,
    updatePreference,
    load,
    refresh,
    update,
    reset,
  }
})
