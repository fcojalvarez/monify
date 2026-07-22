<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail, validatePassword } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import { useI18n } from '@/i18n'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const form = reactive({ name: '', email: '', password: '' })
const errors = reactive<{ name?: string; email?: string; password?: string }>({})
const serverError = ref<string | null>(null)
const done = ref(false)

function validate(): boolean {
  errors.name = form.name.trim() ? undefined : t('auth.errors.nameRequired')
  errors.email = isValidEmail(form.email) ? undefined : t('auth.errors.invalidEmail')
  errors.password = validatePassword(form.password) ?? undefined
  return !errors.name && !errors.email && !errors.password
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return
  try {
    await auth.signUp(form.email, form.password, form.name.trim())
    done.value = true
  } catch (error) {
    serverError.value =
      error instanceof Error ? error.message : t('auth.errors.registerFailed')
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <!-- Estado de éxito: confirmar email -->
    <div v-if="done" class="py-4 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
        <AppIcon name="solar:letter-opened-bold" :size="28" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-content">{{ t('auth.register.successTitle') }}</h2>
      <p class="mt-1 text-sm text-content-muted">
        {{ t('auth.register.confirmationPrefix') }} <strong>{{ form.email }}</strong>{{ t('auth.register.confirmationSuffix') }}
      </p>
      <BaseButton class="mt-6" block variant="secondary" @click="router.push({ name: ROUTE_NAMES.login })">
        {{ t('auth.common.backToLogin') }}
      </BaseButton>
    </div>

    <!-- Formulario -->
    <template v-else>
      <h2 class="text-xl font-bold text-content">{{ t('auth.register.title') }}</h2>
      <p class="mt-1 text-sm text-content-muted">{{ t('auth.register.subtitle') }}</p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
        <BaseInput v-model="form.name" :label="t('auth.register.nameLabel')" icon="solar:user-bold" :placeholder="t('auth.register.namePlaceholder')" autocomplete="name"
          :error="errors.name" />
        <BaseInput v-model="form.email" :label="t('auth.fields.emailLabel')" type="email" icon="solar:letter-bold"
          :placeholder="t('auth.fields.emailPlaceholder')" autocomplete="email" :error="errors.email" />
        <BaseInput v-model="form.password" :label="t('auth.fields.passwordLabel')" type="password" icon="solar:lock-password-bold"
          :placeholder="t('auth.register.passwordPlaceholder')" autocomplete="new-password" :error="errors.password" />

        <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

        <BaseButton type="submit" block size="lg" :loading="auth.loading">{{ t('auth.register.submit') }}</BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-content-muted">
        {{ t('auth.register.hasAccount') }}
        <RouterLink :to="{ name: ROUTE_NAMES.login }" class="font-semibold text-primary-600 hover:text-primary-700">
          {{ t('auth.register.loginLink') }}
        </RouterLink>
      </p>
    </template>
  </div>
</template>
