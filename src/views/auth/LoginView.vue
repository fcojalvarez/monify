<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string; password?: string }>({})
const serverError = ref<string | null>(null)

function validate(): boolean {
  errors.email = isValidEmail(form.email) ? undefined : 'Introduce un email válido'
  errors.password = form.password ? undefined : 'Introduce tu contraseña'
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
    serverError.value = 'Email o contraseña incorrectos.'
  }
}
</script>

<template>
  <div class="animate-fade-in">
    <h2 class="text-xl font-bold text-content">Bienvenido de nuevo</h2>
    <p class="mt-1 text-sm text-content-muted">Inicia sesión para continuar.</p>

    <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        icon="solar:letter-bold"
        placeholder="tucorreo@ejemplo.com"
        autocomplete="email"
        :error="errors.email"
      />
      <BaseInput
        v-model="form.password"
        label="Contraseña"
        type="password"
        icon="solar:lock-password-bold"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
      />

      <div class="flex justify-end">
        <RouterLink
          :to="{ name: ROUTE_NAMES.forgotPassword }"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ¿Olvidaste tu contraseña?
        </RouterLink>
      </div>

      <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

      <BaseButton type="submit" block size="lg" :loading="auth.loading">Iniciar sesión</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-content-muted">
      ¿No tienes cuenta?
      <RouterLink
        :to="{ name: ROUTE_NAMES.register }"
        class="font-semibold text-primary-600 hover:text-primary-700"
      >
        Regístrate
      </RouterLink>
    </p>
  </div>
</template>
