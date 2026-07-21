<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { ROUTE_NAMES } from '@/constants'
import AppLogo from '@/components/ui/AppLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const profile = useProfileStore()
const ui = useUiStore()
const router = useRouter()
const { t } = useI18n()

const showLogoutDialog = ref(false)

async function signOut() {
  await auth.signOut()
  profile.reset()
  showLogoutDialog.value = false
  router.push({ name: ROUTE_NAMES.login })
}
</script>

<template>
  <header class="app-header sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur-lg">
    <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
      <RouterLink :to="{ name: ROUTE_NAMES.dashboard }" class="focus-visible:ring-0">
        <AppLogo :size="30" />
      </RouterLink>

      <div class="flex items-center gap-1">
        <RouterLink :to="{ name: ROUTE_NAMES.profile }"
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted transition-colors"
          :aria-label="t('common.accountSettings')" :title="t('common.accountSettings')">
          <AppIcon name="solar:settings-bold" :size="20" />
        </RouterLink>

        <button class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          :aria-label="ui.theme === 'dark' ? t('common.lightMode') : t('common.darkMode')" @click="ui.toggleTheme">
          <AppIcon :name="ui.theme === 'dark' ? 'solar:sun-bold' : 'solar:moon-bold'" :size="20" />
        </button>

        <button class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          :aria-label="t('common.logout')" @click="showLogoutDialog = true">
          <AppIcon name="solar:logout-3-bold" :size="20" />
        </button>
      </div>
    </div>
  </header>

  <BaseDialog v-model="showLogoutDialog" variant="confirm" :title="t('common.logout')" :confirm-text="t('common.logout')"
    show-cancel @confirm="signOut">
    <p class="text-content">
      {{ t('common.logoutConfirm') }}
    </p>

    <p class="mt-2 text-sm text-content-subtle">
      {{ t('common.logoutReauth') }}
    </p>
  </BaseDialog>
</template>