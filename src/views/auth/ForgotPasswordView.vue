<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const error = ref<string | null>(null)
const sent = ref(false)

async function onSubmit() {
  error.value = null
  if (!isValidEmail(email.value)) {
    error.value = 'Introduce un email válido'
    return
  }
  try {
    await auth.requestPasswordReset(email.value)
    sent.value = true
  } catch {
    error.value = 'No se pudo enviar el email. Inténtalo de nuevo.'
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
      <h2 class="mt-4 text-xl font-bold text-content">Email enviado</h2>
      <p class="mt-1 text-sm text-content-muted">
        Si existe una cuenta con <strong>{{ email }}</strong
        >, recibirás un enlace para restablecer tu contraseña.
      </p>
      <BaseButton
        class="mt-6"
        block
        variant="secondary"
        @click="router.push({ name: ROUTE_NAMES.login })"
      >
        Volver al inicio de sesión
      </BaseButton>
    </div>

    <template v-else>
      <h2 class="text-xl font-bold text-content">Recuperar contraseña</h2>
      <p class="mt-1 text-sm text-content-muted">
        Introduce tu email y te enviaremos un enlace para restablecerla.
      </p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
        <BaseInput
          v-model="email"
          label="Email"
          type="email"
          icon="solar:letter-bold"
          placeholder="tucorreo@ejemplo.com"
          autocomplete="email"
          :error="error"
        />
        <BaseButton type="submit" block size="lg" :loading="auth.loading">
          Enviar enlace
        </BaseButton>
      </form>

      <p class="mt-6 text-center text-sm">
        <RouterLink
          :to="{ name: ROUTE_NAMES.login }"
          class="font-semibold text-primary-600 hover:text-primary-700"
        >
          ← Volver al inicio de sesión
        </RouterLink>
      </p>
    </template>
  </div>
</template>
