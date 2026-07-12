<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useTransactionsStore } from '@/stores/transactions'
import { ROUTE_NAMES } from '@/constants'
import { formatDate } from '@/utils/format'
import { transactionsService } from '@/services/transactions.service'
import AppHeader from '@/components/layout/AppHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const ui = useUiStore()
const transactions = useTransactionsStore()
const router = useRouter()

// Profile Form
const name = ref(auth.displayName)
const profileSaving = ref(false)
const profileSuccess = ref(false)
const profileError = ref<string | null>(null)

async function saveProfile() {
  profileSaving.value = true
  profileSuccess.value = false
  profileError.value = null
  try {
    if (!name.value.trim()) {
      throw new Error('El nombre no puede estar vacío.')
    }
    await auth.updateProfile(name.value.trim())
    profileSuccess.value = true
  } catch (error) {
    profileError.value = error instanceof Error ? error.message : 'No se pudo actualizar el perfil.'
  } finally {
    profileSaving.value = false
  }
}

// Password Form
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref<string | null>(null)

async function changePassword() {
  passwordSaving.value = true
  passwordSuccess.value = false
  passwordError.value = null
  try {
    if (newPassword.value.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }
    if (newPassword.value !== confirmPassword.value) {
      throw new Error('Las contraseñas no coinciden.')
    }
    await auth.updatePassword(newPassword.value)
    passwordSuccess.value = true
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'
  } finally {
    passwordSaving.value = false
  }
}

// Export Data
const exporting = ref(false)

async function exportToCSV() {
  exporting.value = true
  try {
    const list = await transactionsService.list({})
    
    const headers = ['Fecha', 'Tipo', 'Importe', 'Nota', 'Categoria', 'Miembro']
    const rows = list.map((t) => [
      t.occurred_on,
      t.kind === 'income' ? 'Ingreso' : 'Gasto',
      t.amount,
      t.note || '',
      t.category?.name || '',
      t.family_member?.name || '',
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `monify_movimientos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error al exportar datos:', error)
  } finally {
    exporting.value = false
  }
}

// Clear Data
const showClearDialog = ref(false)
const clearing = ref(false)
const clearError = ref<string | null>(null)
const clearSuccess = ref(false)

async function confirmClearData() {
  clearing.value = true
  clearError.value = null
  clearSuccess.value = false
  try {
    await transactions.clearAll()
    clearSuccess.value = true
    showClearDialog.value = false
  } catch (error) {
    clearError.value = error instanceof Error ? error.message : 'No se pudieron eliminar los movimientos.'
  } finally {
    clearing.value = false
  }
}

const joinedDate = computed(() => {
  if (!auth.user?.created_at) return ''
  return formatDate(auth.user.created_at.slice(0, 10))
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <AppHeader />

    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <!-- Botón de retorno y cabecera de la vista -->
      <div class="flex items-center gap-3">
        <RouterLink :to="{ name: ROUTE_NAMES.dashboard }"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line transition-colors"
          title="Volver al Dashboard">
          <AppIcon name="solar:arrow-left-bold" :size="20" />
        </RouterLink>
        <div>
          <h1 class="text-2xl font-bold text-content">Gestionar cuenta</h1>
          <p class="text-xs text-content-muted">Personaliza tus preferencias y administra tus datos</p>
        </div>
      </div>

      <!-- Sección 1: Datos Personales -->
      <BaseCard as="section" class="p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">Datos Personales</h2>
        
        <form @submit.prevent="saveProfile" class="space-y-4">
          <BaseInput
            label="Email"
            :model-value="auth.user?.email || ''"
            disabled
            icon="solar:letter-bold"
            class="opacity-75"
          />

          <BaseInput
            v-model="name"
            label="Nombre completo"
            icon="solar:user-bold"
            placeholder="Introduce tu nombre"
            required
          />

          <div v-if="profileSuccess" class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
            ¡Perfil actualizado correctamente!
          </div>

          <div v-if="profileError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ profileError }}
          </div>

          <div class="flex justify-end pt-1">
            <BaseButton type="submit" :loading="profileSaving">
              Guardar nombre
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- Sección 2: Seguridad (Contraseña) -->
      <BaseCard as="section" class="p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">Seguridad</h2>

        <form @submit.prevent="changePassword" class="space-y-4">
          <BaseInput
            v-model="newPassword"
            label="Nueva contraseña"
            type="password"
            icon="solar:lock-password-bold"
            placeholder="Mínimo 6 caracteres"
            required
          />

          <BaseInput
            v-model="confirmPassword"
            label="Confirmar nueva contraseña"
            type="password"
            icon="solar:lock-password-bold"
            placeholder="Repite la contraseña"
            required
          />

          <div v-if="passwordSuccess" class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
            ¡Contraseña actualizada correctamente!
          </div>

          <div v-if="passwordError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ passwordError }}
          </div>

          <div class="flex justify-end pt-1">
            <BaseButton type="submit" :loading="passwordSaving">
              Actualizar contraseña
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- Sección 3: Preferencias -->
      <BaseCard as="section" class="p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">Preferencias</h2>

        <div class="space-y-4">
          <!-- Moneda -->
          <div>
            <span class="field-label">Moneda por defecto</span>
            <SegmentedControl
              :model-value="ui.currency"
              :options="[
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'USD', label: 'Dólar ($)' }
              ]"
              @update:model-value="ui.setCurrency"
            />
          </div>

          <!-- Tema -->
          <div>
            <span class="field-label">Tema visual</span>
            <SegmentedControl
              :model-value="ui.theme"
              :options="[
                { value: 'light', label: 'Modo claro' },
                { value: 'dark', label: 'Modo oscuro' }
              ]"
              @update:model-value="(val) => { if (val !== ui.theme) ui.toggleTheme() }"
            />
          </div>

          <!-- Gestionar Ahorros -->
          <div class="border-t border-line pt-4">
            <label class="flex cursor-pointer items-center justify-between">
              <span class="text-sm font-medium text-content">¿Quieres gestionar ahorros?</span>
              <input v-model="ui.savingsEnabled" type="checkbox" class="peer sr-only" />
              <span
                class="relative h-6 w-11 rounded-pill bg-line transition-colors peer-checked:bg-primary-500"
              >
                <span
                  class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
                />
              </span>
            </label>
            <p class="mt-1 text-xs text-content-subtle">
              Activa una pestaña adicional para fijar metas y guardar dinero.
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- Sección 4: Datos y Copia de seguridad -->
      <BaseCard as="section" class="p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">Administración de datos</h2>
        <p class="text-xs text-content-subtle">
          Realiza copias de seguridad de tus movimientos o limpia el histórico de tu cuenta.
        </p>

        <div class="space-y-3 pt-2">
          <!-- Exportar CSV -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-field border border-line p-3.5">
            <div>
              <p class="text-sm font-semibold text-content">Exportar movimientos</p>
              <p class="text-xs text-content-subtle">Descarga todos tus registros de ingresos y gastos en formato CSV.</p>
            </div>
            <BaseButton
              type="button"
              variant="secondary"
              class="shrink-0 flex items-center justify-center gap-2"
              :loading="exporting"
              @click="exportToCSV"
            >
              <AppIcon name="solar:download-bold" :size="16" />
              Descargar CSV
            </BaseButton>
          </div>

          <!-- Borrar datos -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-field border border-expense/20 bg-expense-light/10 p-3.5">
            <div>
              <p class="text-sm font-semibold text-content">Borrar movimientos</p>
              <p class="text-xs text-content-subtle">Elimina de forma permanente todo tu histórico de transacciones.</p>
            </div>
            <BaseButton
              type="button"
              variant="danger"
              class="shrink-0 flex items-center justify-center gap-2"
              @click="showClearDialog = true"
            >
              <AppIcon name="solar:trash-bin-trash-bold" :size="16" />
              Borrar todo
            </BaseButton>
          </div>

          <div v-if="clearSuccess" class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
            ¡Historial de movimientos eliminado con éxito!
          </div>

          <div v-if="clearError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ clearError }}
          </div>
        </div>
      </BaseCard>

      <!-- Info del Sistema / Pie de página de cuenta -->
      <div class="text-center py-2 space-y-1">
        <p v-if="joinedDate" class="text-xs text-content-subtle">
          Miembro de Monify desde: <strong class="text-content-muted">{{ joinedDate }}</strong>
        </p>
        <p class="text-[10px] text-content-subtle/60 uppercase tracking-widest">
          Monify v0.1.0 • Desarrollado con Supabase & Vue
        </p>
      </div>
    </main>

    <!-- Dialogo de confirmación de eliminación -->
    <BaseDialog
      v-model="showClearDialog"
      variant="danger"
      title="¿Borrar todos tus movimientos?"
      confirm-text="Sí, borrar todo"
      cancel-text="Cancelar"
      show-cancel
      :loading="clearing"
      @confirm="confirmClearData"
    >
      <p class="text-content">
        ¿Estás completamente seguro de que deseas eliminar <strong>todos tus movimientos registrados</strong>?
      </p>
      <p class="mt-2 text-sm text-content-subtle">
        Esta acción es definitiva y eliminará permanentemente todos tus ingresos y gastos de la base de datos. No se puede deshacer.
      </p>
    </BaseDialog>
  </div>
</template>
