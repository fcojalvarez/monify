<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { ROUTE_NAMES } from '@/constants'
import AppLogo from '@/components/ui/AppLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

async function signOut() {
  await auth.signOut()
  router.push({ name: ROUTE_NAMES.login })
}
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur-lg">
    <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
      <RouterLink :to="{ name: ROUTE_NAMES.dashboard }" class="focus-visible:ring-0">
        <AppLogo :size="30" />
      </RouterLink>
      <div class="flex items-center gap-1">
        <RouterLink
          v-if="auth.isAuthenticated"
          :to="{ name: ROUTE_NAMES.history }"
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted hover:text-content"
          title="Histórico de movimientos"
        >
          <AppIcon name="solar:bill-list-bold" :size="20" />
        </RouterLink>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          :aria-label="ui.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
          @click="ui.toggleTheme"
        >
          <AppIcon :name="ui.theme === 'dark' ? 'solar:sun-bold' : 'solar:moon-bold'" :size="20" />
        </button>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          aria-label="Cerrar sesión"
          @click="signOut"
        >
          <AppIcon name="solar:logout-3-bold" :size="20" />
        </button>
      </div>
    </div>
  </header>
</template>
