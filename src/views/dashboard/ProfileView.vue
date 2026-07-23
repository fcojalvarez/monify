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
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { localeOptions, type AppLocale, useI18n } from '@/i18n'

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
const { locale, setLocale, t } = useI18n()

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
      throw new Error(t('profile.errors.nameEmpty'))
    }

    await auth.updateProfile(name.value.trim())
    profileSuccess.value = true
  } catch (error) {
    profileError.value =
      error instanceof Error
        ? error.message
        : t('profile.errors.profileUpdateFailed')
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
      throw new Error(t('profile.errors.passwordMinLength'))
    }

    if (newPassword.value !== confirmPassword.value) {
      throw new Error(t('profile.errors.passwordMismatch'))
    }

    await auth.updatePassword(newPassword.value)

    passwordSuccess.value = true
    setTimeout(() => {
      passwordSuccess.value = false
    }, 5000);
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    passwordError.value =
      error instanceof Error
        ? error.message
        : t('profile.errors.passwordUpdateFailed')
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

    const headers = [
      t('profile.csv.date'),
      t('profile.csv.type'),
      t('profile.csv.amount'),
      t('profile.csv.note'),
      t('profile.csv.category'),
      t('profile.csv.member'),
    ]

    const rows = list.map((tx) => [
      tx.occurred_on,
      tx.kind === 'income' ? t('form.income') : t('form.expense'),
      tx.amount,
      tx.note || '',
      tx.category?.name || '',
      tx.family_member?.name || '',
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
      `monify_${t('profile.csv.filenamePrefix')}_${new Date().toISOString().slice(0, 10)}.csv`,
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
        : t('profile.errors.clearFailed')
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

const language = computed({
  get: () => locale.value,
  set: async (value: AppLocale) => {
    setLocale(value)
    await profile.updatePreference('locale', value)
  },
})

onMounted(() => {
  void Promise.all([categories.fetchAll(), family.fetchAll()])
})

</script>

<template>
  <div class="min-h-dvh bg-surface pb-12">
    <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <div class="flex items-center gap-3">
        <RouterLink :to="{ name: ROUTE_NAMES.dashboard }"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line transition-colors"
          :title="t('profile.backToDashboard')">
          <AppIcon name="solar:arrow-left-bold" :size="20" />
        </RouterLink>
        <div>
          <h1 class="text-2xl font-bold text-content">{{ t('settings.title') }}</h1>
          <p class="text-xs text-content-muted">
            {{ t('settings.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Sección 1: Datos Personales -->
      <BaseCard as="section" class="order-3 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          {{ t('profile.personalData') }}
        </h2>

        <form @submit.prevent="saveProfile" class="space-y-4">
          <BaseInput :label="t('profile.email')" :model-value="auth.user?.email || ''" disabled icon="solar:letter-bold"
            class="opacity-75" />

          <BaseInput v-model="name" :label="t('profile.fullName')" icon="solar:user-bold"
            :placeholder="t('profile.namePlaceholder')" required />

          <div v-if="profileSuccess"
            class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
            {{ t('profile.profileUpdatedSuccess') }}
          </div>

          <div v-if="profileError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ profileError }}
          </div>

          <div class="flex justify-end pt-1">
            <BaseButton type="submit" :loading="profileSaving">
              {{ t('profile.saveName') }}
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- Sección 2: Seguridad -->
      <BaseCard as="section" class="order-4 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          {{ t('profile.security') }}
        </h2>

        <form @submit.prevent="changePassword" class="space-y-4">
          <BaseInput v-model="newPassword" :label="t('profile.newPassword')" type="password"
            icon="solar:lock-password-bold" :placeholder="t('profile.minCharsPlaceholder')" required />

          <BaseInput v-model="confirmPassword" :label="t('profile.confirmNewPassword')" type="password"
            icon="solar:lock-password-bold" :placeholder="t('profile.repeatPasswordPlaceholder')" required />

          <div v-if="passwordSuccess"
            class="rounded-field bg-primary-50 dark:bg-primary-500/15 p-3 text-sm text-primary-600 dark:text-primary-400">
            {{ t('profile.passwordUpdatedSuccess') }}
          </div>

          <div v-if="passwordError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ passwordError }}
          </div>

          <div class="flex justify-end pt-1">
            <BaseButton type="submit" :loading="passwordSaving">
              {{ t('profile.updatePassword') }}
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- Preferencias -->
      <BaseCard as="section" class="order-1 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          {{ t('settings.preferences') }}
        </h2>

        <div class="space-y-4">
          <div>
            <span class="field-label">{{ t('settings.currency') }}</span>

            <SegmentedControl :model-value="ui.currency" :options="[
              { value: 'EUR', label: 'Euro (€)' },
              { value: 'USD', label: 'Dólar ($)' }
            ]" @update:model-value="ui.setCurrency" />
          </div>

          <div>
            <span class="field-label">{{ t('settings.theme') }}</span>

            <SegmentedControl :model-value="ui.theme" :options="[
              { value: 'light', label: t('settings.light') },
              { value: 'dark', label: t('settings.dark') }
            ]" @update:model-value="(val) => { if (val !== ui.theme) ui.toggleTheme() }" />
          </div>

          <div>
            <BaseSelect v-model="language" :label="t('language.label')" :options="localeOptions.map(option => ({
              value: option.value,
              label: t(option.labelKey),
            }))" />
          </div>

          <BaseSwitch v-model="savingsEnabled" :label="t('settings.savings')" />

          <BaseSwitch v-model="cashEnabled" :label="t('settings.cash')" />
        </div>
      </BaseCard>

      <BaseCard as="section" class="order-2 p-5 space-y-4">
        <div>
          <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
            {{ t('profile.organization') }}
          </h2>
          <p class="mt-1 text-xs text-content-subtle">
            {{ t('profile.organizationSubtitle') }}
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
                <span class="block text-sm font-semibold text-content">{{ t('profile.people') }}</span>
                <span class="block text-xs text-content-subtle">{{ t('profile.peopleDescription') }}</span>
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
                <span class="block text-sm font-semibold text-content">{{ t('profile.categories') }}</span>
                <span class="block text-xs text-content-subtle">{{ t('profile.categoriesDescription') }}</span>
              </span>
            </span>
            <AppIcon name="solar:alt-arrow-right-linear" :size="18" class="shrink-0 text-content-subtle" />
          </button>

          <RouterLink :to="{ name: ROUTE_NAMES.recurring }"
            class="flex w-full items-center justify-between rounded-field border border-line p-3.5 text-left transition-colors hover:bg-surface-muted">
            <span class="flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted">
                <AppIcon name="solar:repeat-bold" :size="18" />
              </span>
              <span>
                <span class="block text-sm font-semibold text-content">{{ t('recurringList.title') }}</span>
                <span class="block text-xs text-content-subtle">{{ t('recurringList.subtitle') }}</span>
              </span>
            </span>
            <AppIcon name="solar:alt-arrow-right-linear" :size="18" class="shrink-0 text-content-subtle" />
          </RouterLink>
        </div>
      </BaseCard>

      <!-- Administración de datos -->
      <BaseCard as="section" class="order-5 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">
          {{ t('profile.dataAdministration') }}
        </h2>

        <p class="text-xs text-content-subtle">
          {{ t('profile.dataAdministrationSubtitle') }}
        </p>

        <div class="space-y-3 pt-2">
          <div
            class="flex flex-col gap-3 rounded-field border border-line p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-content">{{ t('profile.exportMovements') }}</p>
              <p class="text-xs text-content-subtle">
                {{ t('profile.exportMovementsDescription') }}
              </p>
            </div>

            <BaseButton type="button" variant="secondary" class="flex shrink-0 items-center justify-center gap-2"
              :loading="exporting" @click="exportToCSV">
              <AppIcon name="solar:download-bold" :size="16" />
              {{ t('profile.downloadCsv') }}
            </BaseButton>
          </div>

          <div
            class="flex flex-col gap-3 rounded-field border border-expense/20 bg-expense-light/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-content">{{ t('profile.deleteMovements') }}</p>
              <p class="text-xs text-content-subtle">
                {{ t('profile.deleteMovementsDescription') }}
              </p>
            </div>

            <BaseButton type="button" variant="danger" class="flex shrink-0 items-center justify-center gap-2"
              @click="showClearDialog = true">
              <AppIcon name="solar:trash-bin-trash-bold" :size="16" />
              {{ t('profile.deleteAll') }}
            </BaseButton>
          </div>

          <div v-if="clearSuccess"
            class="rounded-field bg-primary-50 p-3 text-sm text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            {{ t('profile.clearSuccessMessage') }}
          </div>

          <div v-if="clearError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
            {{ clearError }}
          </div>
        </div>
      </BaseCard>

      <div class="order-6 space-y-1 py-2 text-center">
        <p v-if="joinedDate" class="text-xs text-content-subtle">
          {{ t('profile.memberSince') }}
          <strong class="text-content-muted">{{ joinedDate }}</strong>
        </p>

        <p class="text-[10px] uppercase tracking-widest text-content-subtle/60">
          {{ t('profile.footer') }}
        </p>
      </div>
    </main>

    <BaseDialog v-model="showClearDialog" variant="danger" :title="t('profile.clearDialog.title')"
      :confirm-text="t('profile.clearDialog.confirmText')" :cancel-text="t('common.cancel')" show-cancel
      :loading="clearing" @confirm="confirmClearData">
      <p class="text-content">
        {{ t('profile.clearDialog.bodyPart1') }}
        <strong>{{ t('profile.clearDialog.bodyStrong') }}</strong>?
      </p>

      <p class="mt-2 text-sm text-content-subtle">
        {{ t('profile.clearDialog.warning') }}
      </p>
    </BaseDialog>

    <BaseSheet v-model="showCategories" :title="t('profile.categories')" :has-changes="categoryManagerRef?.hasChanges">
      <template #actions>
        <button v-if="categoryManagerRef?.view === 'list'" type="button"
          class="inline-flex h-7 items-center gap-2 rounded-full border border-primary-500 px-3 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-muted"
          :aria-label="t('profile.newCategory')" @click="categoryManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" :size="20" />
          <span>{{ t('common.add') }}</span>
        </button>
      </template>
      <CategoryManager ref="categoryManagerRef" />
    </BaseSheet>

    <BaseSheet v-model="showFamily" :title="t('profile.people')" :has-changes="familyManagerRef?.hasChanges">
      <template #actions>
        <button v-if="familyManagerRef?.view === 'list'" type="button"
          class="inline-flex h-7 items-center gap-2 rounded-full border border-primary-500 px-3 text-sm font-medium text-primary-500 transition-colors hover:bg-surface-muted"
          :aria-label="t('profile.addPerson')" @click="familyManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" :size="20" />
          <span>{{ t('common.add') }}</span>
        </button>
      </template>
      <FamilyManager ref="familyManagerRef" />
    </BaseSheet>
  </div>
</template>
