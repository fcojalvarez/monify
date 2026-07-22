<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_NAMES } from '@/constants'
import { useI18n } from '@/i18n'
import AppLogo from '@/components/ui/AppLogo.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

/**
 * Aterrizaje tras el redirect de Supabase (confirmación de email / reset).
 * `detectSessionInUrl` del cliente ya procesa el token; aquí solo decidimos destino.
 */
onMounted(async () => {
  if (!auth.initialized) await auth.init()
  router.replace({ name: auth.isAuthenticated ? ROUTE_NAMES.dashboard : ROUTE_NAMES.login })
})
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface">
    <AppLogo :size="52" :with-wordmark="false" class="animate-scale-in" />
    <p class="text-sm text-content-muted">{{ t('auth.callback.verifying') }}</p>
  </div>
</template>
