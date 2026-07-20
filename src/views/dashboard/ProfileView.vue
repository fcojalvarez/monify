<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/profile'
import { useTransactionsStore } from '@/stores/transactions'
import { useSavingsStore } from '@/stores/savings'
import { useCashStore } from '@/stores/cash'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { ROUTE_NAMES } from '@/constants'
import { formatDate } from '@/utils/format'
import { transactionsService } from '@/services/transactions.service'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const CategoryManager = defineAsyncComponent(() => import('@/components/categories/CategoryManager.vue'))
const FamilyManager = defineAsyncComponent(() => import('@/components/family/FamilyManager.vue'))

const auth = useAuthStore()
const profile = useProfileStore()
const ui = useUiStore()
const transactions = useTransactionsStore()
const savingsStore = useSavingsStore()
const cashStore = useCashStore()
const categories = useCategoriesStore()
const family = useFamilyStore()

const showCategories = ref(false)
const showFamily = ref(false)
const categoryManagerRef = ref<InstanceType<typeof CategoryManager> | null>(null)
const familyManagerRef = ref<InstanceType<typeof FamilyManager> | null>(null)

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
    profileError.value =
      error instanceof Error
        ? error.message
        : 'No se pudo actualizar el perfil.'
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
    passwordError.value =
      error instanceof Error
        ? error.message
        : 'No se pudo cambiar la contraseña.'
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
      ...rows.map((r) =>
        r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `monify_movimientos_${new Date().toISOString().slice(0, 10)}.csv`,
    )

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
    clearError.value =
      error instanceof Error
        ? error.message
        : 'No se pudieron eliminar los movimientos.'
  } finally {
    clearing.value = false
  }
}

const joinedDate = computed(() => {
  if (!auth.user?.created_at) return ''

  return formatDate(auth.user.created_at.slice(0, 10))
})

const savingsEnabled = computed({
  get: () => profile.savingsEnabled,

  set: async (enabled: boolean) => {
    try {
      await profile.updatePreference('savings_enabled', enabled)

      if (!enabled) {
        savingsStore.$reset()
      }
    } catch (error) {
      console.error(error)
    }
  },
})

const cashEnabled = computed({
  get: () => profile.cashEnabled,

  set: async (enabled: boolean) => {
    try {
      await profile.updatePreference('cash_enabled', enabled)

      if (enabled) {
        await cashStore.fetch()
      } else {
        cashStore.$reset()
      }
    } catch (error) {
      console.error(error)
    }
  },
})

onMounted(() => {
  void Promise.all([categories.fetchAll(), family.fetchAll()])
})

</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div class="flex items-center gap-3">
        <RouterLink :to="{ name: ROUTE_NAMES.dashboard }"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line transition-colors"
          title="Volver al Dashboard">
          <AppIcon name="solar:arrow-left-bold" :size="20" />
        </RouterLink>
        <div>
          <h1 class="text-2xl font-bold text-content">Gestionar cuenta</h1>
          <p class="text-xs text-content-muted">
            Personaliza tus preferencias y administra tus datos
          </p>
        </div>
      </div>

      <!-- Sección 1: Datos Personales -->
      <BaseCard as="section" class="order-3 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          Datos Personales
        </h2>

        <form @submit.prevent="saveProfile" class="space-y-4">
          <BaseInput label="Email" :model-value="auth.user?.email || ''" disabled icon="solar:letter-bold"
            class="opacity-75" />

          <BaseInput v-model="name" label="Nombre completo" icon="solar:user-bold" placeholder="Introduce tu nombre"
            required />

          <div v-if="profileSuccess"
            class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
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

      <!-- Sección 2: Seguridad -->
      <BaseCard as="section" class="order-4 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          Seguridad
        </h2>

        <form @submit.prevent="changePassword" class="space-y-4">
          <BaseInput v-model="newPassword" label="Nueva contraseña" type="password" icon="solar:lock-password-bold"
            placeholder="Mínimo 6 caracteres" required />

          <BaseInput v-model="confirmPassword" label="Confirmar nueva contraseña" type="password"
            icon="solar:lock-password-bold" placeholder="Repite la contraseña" required />

          <div v-if="passwordSuccess"
            class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
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

      <!-- Preferencias -->
      <BaseCard as="section" class="order-1 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          Preferencias
        </h2>

        <div class="space-y-4">
          <div>
            <span class="field-label">Moneda por defecto</span>

            <SegmentedControl :model-value="ui.currency" :options="[
              { value: 'EUR', label: 'Euro (€)' },
              { value: 'USD', label: 'Dólar ($)' }
            ]" @update:model-value="ui.setCurrency" />
          </div>

          <div>
            <span class="field-label">Tema visual</span>

            <SegmentedControl :model-value="ui.theme" :options="[
              { value: 'light', label: 'Modo claro' },
              { value: 'dark', label: 'Modo oscuro' }
            ]" @update:model-value="(val) => { if (val !== ui.theme) ui.toggleTheme() }" />
          </div>

          <label class="flex cursor-pointer items-center justify-between">
            <span class="text-sm font-medium text-content">
              ¿Quieres gestionar ahorros?
            </span>

            <div class="relative shrink-0 ml-4">
              <input v-model="savingsEnabled" type="checkbox" class="sr-only" />

              <span class="relative block h-6 w-11 rounded-pill transition-colors"
                :class="savingsEnabled ? 'bg-primary-500' : 'bg-line'">
                <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                  :class="savingsEnabled ? 'translate-x-5' : 'translate-x-0'" />
              </span>
            </div>
          </label>

          <label class="flex cursor-pointer items-center justify-between">
            <span class="text-sm font-medium text-content">
              ¿Quieres gestionar tu efectivo?
            </span>

            <div class="relative shrink-0 ml-4">
              <input v-model="cashEnabled" type="checkbox" class="sr-only" />

              <span class="relative block h-6 w-11 rounded-pill transition-colors"
                :class="cashEnabled ? 'bg-primary-500' : 'bg-line'">
                <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                  :class="cashEnabled ? 'translate-x-5' : 'translate-x-0'" />
              </span>
            </div>
          </label>
        </div>
      </BaseCard>

      <BaseCard as="section" class="order-2 p-5 space-y-4">
        <div>
          <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
            Organización
          </h2>
          <p class="mt-1 text-xs text-content-subtle">
            Configura las opciones que usas con menos frecuencia.
          </p>
        </div>

        <div class="space-y-3">
          <button type="button"
            class="flex w-full items-center justify-between rounded-field border border-line p-3.5 text-left transition-colors hover:bg-surface-muted"
            @click="showFamily = true">
            <span class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted">
                <AppIcon name="solar:users-group-rounded-bold" :size="18" />
              </span>
              <span>
                <span class="block text-sm font-semibold text-content">Personas</span>
                <span class="block text-xs text-content-subtle">Añade o edita los miembros de tu familia.</span>
              </span>
            </span>
            <AppIcon name="solar:alt-arrow-right-linear" :size="18" class="shrink-0 text-content-subtle" />
          </button>

          <button type="button"
            class="flex w-full items-center justify-between rounded-field border border-line p-3.5 text-left transition-colors hover:bg-surface-muted"
            @click="showCategories = true">
            <span class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted">
                <AppIcon name="solar:tag-bold" :size="18" />
              </span>
              <span>
                <span class="block text-sm font-semibold text-content">Categorías</span>
                <span class="block text-xs text-content-subtle">Gestiona las categorías de ingresos y gastos.</span>
              </span>
            </span>
            <AppIcon name="solar:alt-arrow-right-linear" :size="18" class="shrink-0 text-content-subtle" />
          </button>
        </div>
      </BaseCard>

      <!-- Administración de datos -->
      <BaseCard as="section" class="order-5 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          Administración de datos
        </h2>

        <p class="text-xs text-content-subtle">
          Realiza copias de seguridad de tus movimientos o limpia el histórico de tu cuenta.
        </p>

        <div class="space-y-3 pt-2">
          <div
            class="flex flex-col gap-3 rounded-field border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-content">Exportar movimientos</p>
              <p class="text-xs text-content-subtle">
                Descarga todos tus registros de ingresos y gastos en formato CSV.
              </p>
            </div>

            <BaseButton type="button" variant="secondary" class="flex shrink-0 items-center justify-center gap-2"
              :loading="exporting" @click="exportToCSV">
              <AppIcon name="solar:download-bold" :size="16" />
              Descargar CSV
            </BaseButton>
          </div>

          <div
            class="flex flex-col gap-3 rounded-field border border-expense/20 bg-expense-light/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-content">Borrar movimientos</p>
              <p class="text-xs text-content-subtle">
                Elimina de forma permanente todo tu histórico de transacciones.
              </p>
            </div>

            <BaseButton type="button" variant="danger" class="flex shrink-0 items-center justify-center gap-2"
              @click="showClearDialog = true">
              <AppIcon name="solar:trash-bin-trash-bold" :size="16" />
              Borrar todo
            </BaseButton>
          </div>

          <div v-if="clearSuccess"
            class="rounded-field bg-primary-50 p-3 text-sm text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            ¡Historial de movimientos eliminado con éxito!
          </div>

          <div v-if="clearError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ clearError }}
          </div>
        </div>
      </BaseCard>

      <div class="order-6 space-y-1 py-2 text-center">
        <p v-if="joinedDate" class="text-xs text-content-subtle">
          Miembro de Monify desde:
          <strong class="text-content-muted">{{ joinedDate }}</strong>
        </p>

        <p class="text-[10px] uppercase tracking-widest text-content-subtle/60">
          Monify v0.1.0 • Desarrollado con Supabase & Vue
        </p>
      </div>
    </main>

    <BaseDialog v-model="showClearDialog" variant="danger" title="¿Borrar todos tus movimientos?"
      confirm-text="Sí, borrar todo" cancel-text="Cancelar" show-cancel :loading="clearing" @confirm="confirmClearData">
      <p class="text-content">
        ¿Estás completamente seguro de que deseas eliminar
        <strong>todos tus movimientos registrados</strong>?
      </p>

      <p class="mt-2 text-sm text-content-subtle">
        Esta acción es definitiva y eliminará permanentemente todos tus ingresos y
        gastos de la base de datos. No se puede deshacer.
      </p>
    </BaseDialog>

    <BaseSheet v-model="showCategories" title="Categorías" :has-changes="categoryManagerRef?.hasChanges">
      <template #actions>
        <button v-if="categoryManagerRef?.view === 'list'" type="button"
          class="inline-flex h-7 items-center gap-2 rounded-full border border-primary-500 px-3 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-muted"
          aria-label="Nueva categoría" @click="categoryManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" :size="20" />
          <span>Añadir</span>
        </button>
      </template>
      <CategoryManager ref="categoryManagerRef" />
    </BaseSheet>

    <BaseSheet v-model="showFamily" title="Personas" :has-changes="familyManagerRef?.hasChanges">
      <template #actions>
        <button v-if="familyManagerRef?.view === 'list'" type="button"
          class="inline-flex h-7 items-center gap-2 rounded-full border border-primary-500 px-3 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-muted"
          aria-label="Añadir persona" @click="familyManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" :size="20" />
          <span>Añadir</span>
        </button>
      </template>
      <FamilyManager ref="familyManagerRef" />
    </BaseSheet>
  </div>
</template>
