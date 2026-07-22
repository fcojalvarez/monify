<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CategoryKind, TransactionWithRelations } from '@/types'
import { useFamilyStore } from '@/stores/family'
import { useMemberOptions, useCategoryOptions } from '@/composables/useEntityOptions'
import { useTransactionsStore } from '@/stores/transactions'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { todayISO, formatDateWithMonthName } from '@/utils/format'
import { customOccurrenceOnOrAfter, normalizeMonths } from '@/utils/recurring'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import CustomMonthsField from '@/components/transactions/CustomMonthsField.vue'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { useI18n } from '@/i18n'

const props = defineProps<{ transaction?: TransactionWithRelations }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const family = useFamilyStore()
const transactions = useTransactionsStore()
const recurringTransactions = useRecurringTransactionsStore()
const { t } = useI18n()

const isEdit = computed(() => !!props.transaction)

function defaultDate() {
  const activeFrom = transactions.filters.from
  if (activeFrom) {
    const today = todayISO()

    if (today >= activeFrom && today <= (transactions.filters.to || '')) {
      return today
    }
    return activeFrom
  }
  return todayISO()
}

const initialDate = props.transaction?.occurred_on ?? defaultDate()

const form = reactive({
  kind: (props.transaction?.kind ?? 'expense') as CategoryKind,
  gross: props.transaction ? String(props.transaction.gross) : '',
  amount: props.transaction ? String(props.transaction.amount) : '',
  categoryId: props.transaction?.category_id ?? '',
  familyMemberId: props.transaction?.family_member_id ?? family.self?.id ?? '',
  occurredOn: initialDate,
  note: props.transaction?.note ?? '',
  isCash: props.transaction?.payment_method === 'cash',
  isRecurring: false,
  frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
  endOn: '',
  months: [] as number[],
  dayOfMonth: String(Number(initialDate.split('-')[2]) || 1),
})

const isCustomRecurring = computed(() => form.isRecurring && form.frequency === 'custom')

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)

const grossInputRef = ref<{ focus: () => void; $el?: { scrollIntoView?: (options?: ScrollIntoViewOptions) => void } } | null>(null)
const amountInputRef = ref<{ focus: () => void; $el?: { scrollIntoView?: (options?: ScrollIntoViewOptions) => void } } | null>(null)
const familyMemberInputRef = ref<{ focus: () => void; $el?: { scrollIntoView?: (options?: ScrollIntoViewOptions) => void } } | null>(null)
const categoryInputRef = ref<{ focus: () => void; $el?: { scrollIntoView?: (options?: ScrollIntoViewOptions) => void } } | null>(null)

const categoryOptions = useCategoryOptions(() => form.kind)
const memberOptions = useMemberOptions()

watch(
  () => form.kind,
  () => {
    if (!categoryOptions.value.some((o) => o.value === form.categoryId)) form.categoryId = ''
  },
)
function focusFirstError() {
  if (errors.gross && grossInputRef.value) {
    grossInputRef.value.focus()
    grossInputRef.value.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }
  if (errors.amount && amountInputRef.value) {
    amountInputRef.value.focus()
    amountInputRef.value.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }
  if (errors.categoryId && categoryInputRef.value) {
    categoryInputRef.value.focus()
    categoryInputRef.value.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }
  if (errors.familyMemberId && familyMemberInputRef.value) {
    familyMemberInputRef.value.focus()
    familyMemberInputRef.value.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }
}

function validate(): boolean {
  const amount = parseAmount(form.amount)

  if (form.kind === 'income') {
    errors.gross = isPositiveAmount(parseAmount(form.gross || form.amount)) ? undefined : t('form.errorAmount')
  } else {
    errors.gross = undefined
  }

  errors.amount = isPositiveAmount(amount) ? undefined : t('form.errorAmount')
  errors.categoryId = form.categoryId ? undefined : t('form.errorCategory')
  errors.familyMemberId = (!form.isCash || form.familyMemberId) ? undefined : t('form.errorMember')

  if (errors.amount || errors.categoryId || errors.familyMemberId || errors.gross) {
    focusFirstError()
    return false
  }

  if (form.isCash) {
    const selectedMember = family.items.find((m) => m.id === form.familyMemberId)
    let currentBalance = selectedMember?.cash_balance ?? 0

    if (
      props.transaction &&
      props.transaction.payment_method === 'cash' &&
      props.transaction.family_member_id === form.familyMemberId
    ) {
      const oldAmount = props.transaction.amount
      if (props.transaction.kind === 'expense') {
        currentBalance += oldAmount
      } else {
        currentBalance -= oldAmount
      }
    }

    if (form.kind === 'expense' && currentBalance - amount < 0) {
      const errMsg = t('transactionForm.insufficientWallet', { name: selectedMember?.name ?? t('transactionForm.thisPerson') })
      errors.familyMemberId = errMsg
      serverError.value = errMsg
      focusFirstError()
      return false
    }
  }

  if (isCustomRecurring.value) {
    const day = Number(form.dayOfMonth)
    errors.months = form.months.length ? undefined : t('recurringForm.errorMonths')
    errors.dayOfMonth = Number.isFinite(day) && day >= 1 && day <= 31 ? undefined : t('recurringForm.errorDay')
    if (errors.months || errors.dayOfMonth) return false
  }

  return true
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

    if (props.transaction) {
      await transactions.update(props.transaction.id, {
        ...baseData,
        gross,
        occurred_on: form.occurredOn,
      })
    } else {
      if (form.isRecurring) {
        const day = Number(form.dayOfMonth)
        const scheduleData = form.frequency === 'custom'
          ? {
            frequency: 'custom' as const,
            start_on: form.occurredOn,
            next_execution: customOccurrenceOnOrAfter(form.occurredOn, form.months, day),
            months: normalizeMonths(form.months),
            day_of_month: day,
          }
          : {
            frequency: form.frequency,
            start_on: form.occurredOn,
            next_execution: form.occurredOn,
          }

        await recurringTransactions.create({
          ...baseData,
          gross,
          end_on: form.endOn || null,
          ...scheduleData,
        })

        await recurringTransactions.sync()
      } else {
        await transactions.create({
          transaction: {
            ...baseData,
            occurred_on: form.occurredOn,
          },
          gross: gross ?? 0,
        })
      }
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

async function onDeleteConfirm() {
  if (!props.transaction) return
  showDeleteConfirm.value = false
  deleting.value = true
  try {
    await transactions.remove(props.transaction.id)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('form.genericDeleteError')
  } finally {
    deleting.value = false
  }
}

const initialForm = {
  kind: form.kind,
  gross: form.gross,
  amount: form.amount,
  categoryId: form.categoryId,
  familyMemberId: form.familyMemberId,
  occurredOn: form.occurredOn,
  note: form.note,
  isCash: form.isCash,
  isRecurring: form.isRecurring,
  frequency: form.frequency,
  endOn: form.endOn,
  months: JSON.stringify(form.months),
  dayOfMonth: form.dayOfMonth,
}

const hasChanges = computed(() => {
  return (
    form.kind !== initialForm.kind ||
    form.gross !== initialForm.gross ||
    form.amount !== initialForm.amount ||
    form.categoryId !== initialForm.categoryId ||
    form.familyMemberId !== initialForm.familyMemberId ||
    form.occurredOn !== initialForm.occurredOn ||
    form.note !== initialForm.note ||
    form.isCash !== initialForm.isCash ||
    form.isRecurring !== initialForm.isRecurring ||
    form.frequency !== initialForm.frequency ||
    form.endOn !== initialForm.endOn ||
    JSON.stringify(form.months) !== initialForm.months ||
    form.dayOfMonth !== initialForm.dayOfMonth
  )
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

    <BaseInput v-if="form.kind === 'income'" ref="grossInputRef" v-model="form.gross" :label="t('form.grossAmount')"
      type="number" icon="solar:tag-price-bold" :placeholder="t('form.amountPlaceholder')" :error="errors.gross"
      class="relative">
      <template v-slot:label-slot>
        <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
      </template>
    </BaseInput>

    <BaseInput ref="amountInputRef" v-model="form.amount" :label="t('form.amount')" type="number"
      icon="solar:tag-price-bold" :placeholder="t('form.amountPlaceholder')" :error="errors.amount" />

    <BaseSelect ref="familyMemberInputRef" v-model="form.familyMemberId" :label="t('form.belongsTo')"
      :placeholder="t('form.selectMember')" :options="memberOptions" :error="errors.familyMemberId" />

    <BaseSelect v-if="categoryOptions.length" ref="categoryInputRef" v-model="form.categoryId"
      :no-item-message="`${t('common.noResults')} ${t('common.goToSettingsToCategories')}`" :label="t('form.category')"
      :placeholder="t('form.selectCategory')" :options="categoryOptions" :error="errors.categoryId" />
    <p v-else class="rounded-field bg-surface-muted p-3 text-sm text-content-muted">
      {{ t('form.noCategories', { kind: form.kind === 'income' ? t('form.kindIncome') : t('form.kindExpense') }) }}
    </p>

    <BaseInput v-model="form.occurredOn" :label="t('form.date')" type="date" icon="solar:calendar-bold" />

    <BaseInput v-model="form.note" :label="t('form.note')" icon="solar:pen-bold"
      :placeholder="t('form.notePlaceholder')">
      <template v-slot:label-slot>
        <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
      </template>
    </BaseInput>

    <template v-if="!isEdit">
      <BaseSwitch v-model="form.isRecurring" :label="t('transaction.repeatMovement')" />
      <div v-if="form.isRecurring" class="space-y-3 rounded-field border border-line p-3">
        <BaseSelect v-model="form.frequency" :label="t('transaction.frequency')" :options="[
          { value: 'daily', label: t('recurringList.frequencies.daily') }, { value: 'weekly', label: t('recurringList.frequencies.weekly') },
          { value: 'monthly', label: t('recurringList.frequencies.monthly') }, { value: 'yearly', label: t('recurringList.frequencies.yearly') },
          { value: 'custom', label: t('recurringList.frequencies.custom') },
        ]" />

        <CustomMonthsField v-if="form.frequency === 'custom'" v-model:months="form.months"
          v-model:day-of-month="form.dayOfMonth" :start-on="form.occurredOn" :months-error="errors.months"
          :day-error="errors.dayOfMonth" />

        <BaseInput v-model="form.endOn" :label="t('transaction.endDate')" type="date" icon="solar:calendar-bold">
          <template v-slot:label-slot>
            <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
          </template>
        </BaseInput>
        <p v-if="form.endOn" class="text-xs text-content-muted">
          {{ t('transaction.endsOn', { date: formatDateWithMonthName(form.endOn) }) }}
        </p>
      </div>
    </template>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving" :disabled="!categoryOptions.length">
        {{ isEdit ? t('transactionForm.save') : t('transactionForm.add') }}
      </BaseButton>

      <BaseButton v-if="isEdit" type="button" variant="danger" block :loading="deleting"
        @click="showDeleteConfirm = true">
        {{ t('transactionForm.deleteMovement') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" :title="t('transactionForm.deleteTitle')"
    :confirm-text="t('transactionForm.confirmDelete')" :cancel-text="t('common.cancel')" show-cancel
    @confirm="onDeleteConfirm">
    <p class="text-content">
      {{ t('transactionForm.deleteConfirmBody') }}
    </p>
  </BaseDialog>
</template>
