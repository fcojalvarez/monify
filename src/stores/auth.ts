import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { authService } from '@/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  /** `false` hasta que se resuelve la sesión inicial → evita parpadeos en el guard. */
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!session.value)
  const displayName = computed(
    () => (user.value?.user_metadata?.display_name as string | undefined) ?? '',
  )

  function setSession(next: Session | null) {
    session.value = next
    user.value = next?.user ?? null
  }

  /** Carga la sesión existente y se suscribe a cambios (login/logout/refresh). */
  async function init() {
    setSession(await authService.getSession())
    authService.onAuthStateChange(setSession)
    initialized.value = true
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    try {
      setSession(await authService.signIn(email, password))
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string, name: string) {
    loading.value = true
    try {
      return await authService.signUp(email, password, name)
    } finally {
      loading.value = false
    }
  }

  async function requestPasswordReset(email: string) {
    loading.value = true
    try {
      await authService.sendPasswordReset(email)
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await authService.signOut()
    setSession(null)
  }

  async function updateProfile(name: string) {
    loading.value = true
    try {
      const updatedUser = await authService.updateProfile(name)
      user.value = updatedUser
    } finally {
      loading.value = false
    }
  }

  async function updatePassword(newPassword: string) {
    loading.value = true
    try {
      await authService.updatePassword(newPassword)
    } finally {
      loading.value = false
    }
  }

  return {
    session,
    user,
    initialized,
    loading,
    isAuthenticated,
    displayName,
    init,
    signIn,
    signUp,
    requestPasswordReset,
    signOut,
    updateProfile,
    updatePassword,
  }
})
