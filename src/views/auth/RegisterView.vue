<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isValidEmail, validatePassword } from '@/utils/validation'
import { ROUTE_NAMES } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ name: '', email: '', password: '' })
const errors = reactive<{ name?: string; email?: string; password?: string }>({})
const serverError = ref<string | null>(null)
const done = ref(false)

function validate(): boolean {
  errors.name = form.name.trim() ? undefined : 'Dinos cómo te llamas'
  errors.email = isValidEmail(form.email) ? undefined : 'Introduce un email válido'
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
      error instanceof Error ? error.message : 'No se pudo completar el registro.'
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
      <h2 class="mt-4 text-xl font-bold text-content">Revisa tu correo</h2>
      <p class="mt-1 text-sm text-content-muted">
        Te hemos enviado un enlace de confirmación a <strong>{{ form.email }}</strong>.
      </p>
      <BaseButton class="mt-6" block variant="secondary" @click="router.push({ name: ROUTE_NAMES.login })">
        Volver al inicio de sesión
      </BaseButton>
    </div>

    <!-- Formulario -->
    <template v-else>
      <h2 class="text-xl font-bold text-content">Crea tu cuenta</h2>
      <p class="mt-1 text-sm text-content-muted">Empieza a controlar tus finanzas hoy.</p>

      <form class="mt-6 space-y-4" novalidate @submit.prevent="onSubmit">
        <BaseInput v-model="form.name" label="Nombre" icon="solar:user-bold" placeholder="Tu nombre" autocomplete="name"
          :error="errors.name" />
        <BaseInput v-model="form.email" label="Email" type="email" icon="solar:letter-bold"
          placeholder="tucorreo@ejemplo.com" autocomplete="email" :error="errors.email" />
        <BaseInput v-model="form.password" label="Contraseña" type="password" icon="solar:lock-password-bold"
          placeholder="Mínimo 8 caracteres" autocomplete="new-password" :error="errors.password" />

        <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

        <BaseButton type="submit" block size="lg" :loading="auth.loading">Crear cuenta</BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-content-muted">
        ¿Ya tienes cuenta?
        <RouterLink :to="{ name: ROUTE_NAMES.login }" class="font-semibold text-primary-600 hover:text-primary-700">
          Inicia sesión
        </RouterLink>
      </p>
    </template>
  </div>
</template>
