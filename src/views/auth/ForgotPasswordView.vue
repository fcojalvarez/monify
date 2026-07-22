<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import { useI18n } from '@/i18n'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const email = ref('')
const error = ref<string | null>(null)
const sent = ref(false)

async function onSubmit() {
  error.value = null
  if (!isValidEmail(email.value)) {
    error.value = t('auth.errors.invalidEmail')
    return
  }
  try {
    await auth.requestPasswordReset(email.value)
    sent.value = true
  } catch {
    error.value = t('auth.errors.resetFailed')
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="sent" class="py-4 text-center">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600"
      >
        <AppIcon name="solar:check-circle-bold" :size="28" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-content">{{ t('auth.forgot.successTitle') }}</h2>
      <p class="mt-1 text-sm text-content-muted">
        {{ t('auth.forgot.sentPrefix') }} <strong>{{ email }}</strong
        >{{ t('auth.forgot.sentSuffix') }}
      </p>
      <BaseButton
        class="mt-6"
        block
        variant="secondary"
        @click="router.push({ name: ROUTE_NAMES.login })"
      >
        {{ t('auth.common.backToLogin') }}
      </BaseButton>
    </div>

    <template v-else>
      <h2 class="text-xl font-bold text-content">{{ t('auth.forgot.title') }}</h2>
      <p class="mt-1 text-sm text-content-muted">
        {{ t('auth.forgot.subtitle') }}
      </p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
        <BaseInput
          v-model="email"
          :label="t('auth.fields.emailLabel')"
          type="email"
          icon="solar:letter-bold"
          :placeholder="t('auth.fields.emailPlaceholder')"
          autocomplete="email"
          :error="error"
        />
        <BaseButton type="submit" block size="lg" :loading="auth.loading">
          {{ t('auth.forgot.submit') }}
        </BaseButton>
      </form>

      <p class="mt-6 text-center text-sm">
        <RouterLink
          :to="{ name: ROUTE_NAMES.login }"
          class="font-semibold text-primary-600 hover:text-primary-700"
        >
          {{ t('auth.forgot.backToLoginLink') }}
        </RouterLink>
      </p>
    </template>
  </div>
</template>
