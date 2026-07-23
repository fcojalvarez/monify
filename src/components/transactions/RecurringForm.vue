<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CategoryKind, RecurringTransaction, Category } from '@/types'
import { useFamilyStore } from '@/stores/family'
import { useMemberOptions, useCategoryOptions } from '@/composables/useEntityOptions'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import CustomMonthsField from '@/components/transactions/CustomMonthsField.vue'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { todayISO, formatDate } from '@/utils/format'
import { customOccurrenceOnOrAfter, normalizeMonths } from '@/utils/recurring'
import { useI18n } from '@/i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import CategoryForm from '@/components/categories/CategoryForm.vue'

const props = defineProps<{ transaction?: RecurringTransaction }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const family = useFamilyStore()
const recurringTransactions = useRecurringTransactionsStore()
const { t } = useI18n()

const isEdit = computed(() => !!props.transaction)
const today = todayISO()

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

const form = reactive({
  kind: (props.transaction?.kind ?? 'expense') as CategoryKind,
  gross: props.transaction ? String(props.transaction.gross ?? '') : '',
  amount: props.transaction ? String(props.transaction.amount) : '',
  categoryId: props.transaction?.category_id ?? '',
  familyMemberId: props.transaction?.family_member_id ?? family.self?.id ?? '',
  note: props.transaction?.note ?? '',
  isCash: props.transaction?.payment_method === 'cash',
  frequency: (props.transaction?.frequency ?? 'monthly') as Frequency,
  startOn: props.transaction?.start_on ?? today,
  nextExecution: props.transaction?.next_execution ?? today,
  endOn: props.transaction?.end_on ?? '',
  months: [...(props.transaction?.months ?? [])] as number[],
  dayOfMonth: props.transaction?.day_of_month
    ? String(props.transaction.day_of_month)
    : String(Number((props.transaction?.start_on ?? today).split('-')[2])),
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)

const isCustom = computed(() => form.frequency === 'custom')

const showCategoryDialog = ref(false)
const categoryFormKind = ref<CategoryKind>('expense')
const initialCategoryName = ref('')

function openCategoryCreator(closeSelect: () => void, search: string) {
  closeSelect()
  categoryFormKind.value = form.kind
  initialCategoryName.value = search.trim()
  showCategoryDialog.value = true
}

function onCategoryCreated(newCategory: Category) {
  showCategoryDialog.value = false
  form.categoryId = newCategory.id
}

const categoryOptions = useCategoryOptions(() => form.kind)
const memberOptions = useMemberOptions()

const frequencyOptions = computed(() => [
  { value: 'daily', label: t('recurringList.frequencies.daily') },
  { value: 'weekly', label: t('recurringList.frequencies.weekly') },
  { value: 'monthly', label: t('recurringList.frequencies.monthly') },
  { value: 'yearly', label: t('recurringList.frequencies.yearly') },
  { value: 'custom', label: t('recurringList.frequencies.custom') },
])

watch(
  () => form.kind,
  () => {
    if (!categoryOptions.value.some((o) => o.value === form.categoryId)) form.categoryId = ''
  },
)

function validate(): boolean {
  const amount = parseAmount(form.amount)

  if (form.kind === 'income') {
    errors.gross = isPositiveAmount(parseAmount(form.gross)) ? undefined : t('form.errorAmount')
  } else {
    errors.gross = undefined
  }

  errors.amount = isPositiveAmount(amount) ? undefined : t('form.errorAmount')
  errors.categoryId = form.categoryId ? undefined : t('form.errorCategory')
  errors.familyMemberId = (!form.isCash || form.familyMemberId) ? undefined : t('form.errorMember')
  errors.startOn = form.startOn ? undefined : t('form.errorStartDate')

  if (isCustom.value) {
    const day = Number(form.dayOfMonth)
    errors.months = form.months.length ? undefined : t('recurringForm.errorMonths')
    errors.dayOfMonth = Number.isFinite(day) && day >= 1 && day <= 31 ? undefined : t('recurringForm.errorDay')
    errors.nextExecution = undefined
  } else {
    errors.months = undefined
    errors.dayOfMonth = undefined
    errors.nextExecution = form.nextExecution ? undefined : t('form.errorNextExecution')
  }

  return !(
    errors.amount ||
    errors.categoryId ||
    errors.familyMemberId ||
    errors.gross ||
    errors.startOn ||
    errors.nextExecution ||
    errors.months ||
    errors.dayOfMonth
  )
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return

  saving.value = true

  try {
    const baseData = {
      kind: form.kind,
      amount: parseAmount(form.amount),
      category_id: form.categoryId,
      family_member_id: form.familyMemberId || family.self?.id || '',
      note: form.note.trim() || null,
      payment_method: (form.isCash ? 'cash' : 'bank') as 'cash' | 'bank',
    }

    const gross = form.kind === 'income'
      ? parseAmount(form.gross || form.amount)
      : null

    const day = Number(form.dayOfMonth)
    // Solo enviamos months/day_of_month para el modo personalizado. Así las recurrencias
    // normales siguen funcionando aunque todavía no se haya aplicado la migración SQL que
    // añade esas columnas (las frecuencias custom sí requieren la migración).
    const scheduleData = isCustom.value
      ? {
        frequency: 'custom' as const,
        start_on: form.startOn,
        next_execution: customOccurrenceOnOrAfter(form.startOn, form.months, day),
        months: normalizeMonths(form.months),
        day_of_month: day,
      }
      : {
        frequency: form.frequency,
        start_on: form.startOn,
        next_execution: form.nextExecution,
      }

    if (isEdit.value) {
      await recurringTransactionsService.update(props.transaction!.id, {
        ...baseData,
        gross,
        end_on: form.endOn || null,
        ...scheduleData,
      })
    } else {
      await recurringTransactions.create({
        ...baseData,
        gross,
        end_on: form.endOn || null,
        ...scheduleData,
      })

      await recurringTransactions.sync()
    }

    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('form.genericSaveError')
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
const showDeleteConfirm = ref(false)
const deleteHistory = ref(false)

async function onDeleteConfirm() {
  if (!props.transaction) return
  showDeleteConfirm.value = false
  deleting.value = true
  try {
    await recurringTransactionsService.remove(props.transaction.id, {
      deleteHistory: deleteHistory.value,
    })
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('form.genericDeleteError')
  } finally {
    deleting.value = false
  }
}

const initialForm = JSON.stringify({
  kind: form.kind,
  gross: form.gross,
  amount: form.amount,
  categoryId: form.categoryId,
  familyMemberId: form.familyMemberId,
  note: form.note,
  isCash: form.isCash,
  frequency: form.frequency,
  startOn: form.startOn,
  nextExecution: form.nextExecution,
  endOn: form.endOn,
  months: [...form.months].sort((a, b) => a - b),
  dayOfMonth: form.dayOfMonth,
})

const hasChanges = computed(() => {
  return initialForm !== JSON.stringify({
    kind: form.kind,
    gross: form.gross,
    amount: form.amount,
    categoryId: form.categoryId,
    familyMemberId: form.familyMemberId,
    note: form.note,
    isCash: form.isCash,
    frequency: form.frequency,
    startOn: form.startOn,
    nextExecution: form.nextExecution,
    endOn: form.endOn,
    months: [...form.months].sort((a, b) => a - b),
    dayOfMonth: form.dayOfMonth,
  })
})

defineExpose({
  hasChanges,
})
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <SegmentedControl v-model="form.kind" :options="[
      { value: 'expense', label: t('form.expense') },
      { value: 'income', label: t('form.income') },
    ]" />

    <BaseSwitch v-model="form.isCash" :label="t('form.isCash')" />

    <BaseInput v-if="form.kind === 'income'" v-model="form.gross" :label="t('form.grossAmount')" type="number"
      icon="solar:tag-price-bold" :placeholder="t('form.amountPlaceholder')" :error="errors.gross">
      <template v-slot:label-slot>
        <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
      </template>
    </BaseInput>

    <BaseInput v-model="form.amount" :label="t('form.amount')" type="number" icon="solar:tag-price-bold"
      :placeholder="t('form.amountPlaceholder')" :error="errors.amount" />

    <BaseSelect v-model="form.familyMemberId" :label="t('form.belongsTo')" :placeholder="t('form.selectMember')"
      :options="memberOptions" :error="errors.familyMemberId" />

    <BaseSelect v-model="form.categoryId" :no-item-message="t('common.noResults')" :label="t('form.category')"
      :placeholder="t('form.selectCategory')" :options="categoryOptions" :error="errors.categoryId">
      <template #header="{ close, search }">
        <button type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold text-primary-500 hover:bg-surface border-b border-line mb-1"
          @click="openCategoryCreator(close, search)">
          <AppIcon name="solar:add-circle-bold" :size="18" />
          <span>{{ t('common.createCategory') }}</span>
        </button>
      </template>
    </BaseSelect>

    <BaseSelect v-model="form.frequency" :label="t('transaction.frequency')" :options="frequencyOptions" />

    <!-- Calendario personalizado: meses concretos + día -->
    <CustomMonthsField v-if="isCustom" v-model:months="form.months" v-model:day-of-month="form.dayOfMonth"
      :start-on="form.startOn" :months-error="errors.months" :day-error="errors.dayOfMonth" />

    <BaseInput v-model="form.startOn" :label="t('recurringForm.startDate')" type="date" icon="solar:calendar-bold"
      :error="errors.startOn" />

    <BaseInput v-if="!isCustom" v-model="form.nextExecution" :label="t('recurringForm.nextExecution')" type="date"
      icon="solar:calendar-bold" :error="errors.nextExecution" />

    <BaseInput v-model="form.endOn" :label="t('transaction.endDate')" type="date" icon="solar:calendar-bold">
      <template v-slot:label-slot>
        <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
      </template>
    </BaseInput>
    <p v-if="form.endOn" class="text-xs text-content-muted">
      {{ t('transaction.endsOn', { date: formatDate(form.endOn) }) }}
    </p>

    <BaseInput v-model="form.note" :label="t('form.note')" icon="solar:pen-bold"
      :placeholder="t('form.notePlaceholder')">
      <template v-slot:label-slot>
        <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
      </template>
    </BaseInput>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving" :disabled="!categoryOptions.length">
        {{ isEdit ? t('recurringForm.editButton') : t('recurringForm.createButton') }}
      </BaseButton>

      <BaseButton v-if="isEdit" type="button" variant="danger" block :loading="deleting"
        @click="showDeleteConfirm = true">
        {{ t('recurringForm.deleteButton') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" :title="t('recurringForm.deleteTitle')"
    :confirm-text="t('recurringForm.deleteButton')" :cancel-text="t('common.cancel')" show-cancel
    @confirm="onDeleteConfirm">
    <div class="space-y-4">
      <p class="text-content">
        {{ t('recurringForm.deleteConfirm') }}
      </p>
      <BaseSwitch v-model="deleteHistory" :label="t('recurringForm.deleteHistoryLabel')" />
    </div>
  </BaseDialog>

  <BaseDialog v-model="showCategoryDialog" :title="t('common.createCategory')" :show-close="true">
    <CategoryForm
      v-if="showCategoryDialog"
      :default-kind="categoryFormKind"
      :initial-name="initialCategoryName"
      @saved="onCategoryCreated"
      @cancel="showCategoryDialog = false"
    />
  </BaseDialog>
</template>
