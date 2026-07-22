<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import { useI18n } from '@/i18n'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string; password?: string }>({})
const serverError = ref<string | null>(null)

function validate(): boolean {
  errors.email = isValidEmail(form.email) ? undefined : t('auth.errors.invalidEmail')
  errors.password = form.password ? undefined : t('auth.errors.passwordRequired')
  return !errors.email && !errors.password
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return
  try {
    await auth.signIn(form.email, form.password)
    const redirect = (route.query.redirect as string) || undefined
    router.push(redirect ?? { name: ROUTE_NAMES.dashboard })
  } catch {
    serverError.value = t('auth.errors.invalidCredentials')
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <h2 class="text-xl font-bold text-content">{{ t('auth.login.title') }}</h2>
    <p class="mt-1 text-sm text-content-muted">{{ t('auth.login.subtitle') }}</p>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.email"
        :label="t('auth.fields.emailLabel')"
        type="email"
        icon="solar:letter-bold"
        :placeholder="t('auth.fields.emailPlaceholder')"
        autocomplete="email"
        :error="errors.email"
      />
      <BaseInput
        v-model="form.password"
        :label="t('auth.fields.passwordLabel')"
        type="password"
        icon="solar:lock-password-bold"
        :placeholder="t('auth.login.passwordPlaceholder')"
        autocomplete="current-password"
        :error="errors.password"
      />

      <div class="flex justify-end">
        <RouterLink
          :to="{ name: ROUTE_NAMES.forgotPassword }"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {{ t('auth.login.forgotPasswordLink') }}
        </RouterLink>
      </div>

      <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

      <BaseButton type="submit" block size="lg" :loading="auth.loading">{{ t('auth.login.submit') }}</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-content-muted">
      {{ t('auth.login.noAccount') }}
      <RouterLink
        :to="{ name: ROUTE_NAMES.register }"
        class="font-semibold text-primary-600 hover:text-primary-700"
      >
        {{ t('auth.login.registerLink') }}
      </RouterLink>
    </p>
  </div>
</template>
