<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { SavingsTransaction } from '@/types'
import { useSavingsStore } from '@/stores/savings'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { savingsAccountLabel } from '@/utils/savings'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ transaction: SavingsTransaction }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const savings = useSavingsStore()
const { t } = useI18n()

const accountName = computed(() =>
  savingsAccountLabel(savings.items.find((s) => s.id === props.transaction.savings_id), 'long'),
)

const form = reactive({
  direction: (props.transaction.amount >= 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
  amount: String(Math.abs(props.transaction.amount)),
  occurredOn: (props.transaction.occurred_on ?? '').slice(0, 10),
  note: props.transaction.note ?? '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)

function validate(): boolean {
  const amount = parseAmount(form.amount)
  errors.amount = isPositiveAmount(amount) ? undefined : t('savings.errors.invalidAmount')
  return !errors.amount
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return

  saving.value = true
  try {
    await savings.updateTransaction(props.transaction.id, {
      amount: parseAmount(form.amount),
      isDeposit: form.direction === 'deposit',
      note: form.note.trim() || null,
      occurredOn: form.occurredOn || undefined,
    })
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('savings.errors.generic')
  } finally {
    saving.value = false
  }
}

async function onDeleteConfirm() {
  showDeleteConfirm.value = false
  deleting.value = true
  try {
    await savings.deleteTransaction(props.transaction.id)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('savings.errors.generic')
  } finally {
    deleting.value = false
  }
}

const initial = { ...form }
const hasChanges = computed(
  () =>
    form.direction !== initial.direction ||
    form.amount !== initial.amount ||
    form.occurredOn !== initial.occurredOn ||
    form.note !== initial.note,
)

defineExpose({ hasChanges })
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <p class="text-xs text-content-muted">
      {{ t('savings.account') }}: <span class="font-bold text-content">{{ accountName }}</span>
    </p>

    <SegmentedControl v-model="form.direction" :options="[
      { value: 'deposit', label: t('savings.edit.deposit') },
      { value: 'withdrawal', label: t('savings.edit.withdrawal') },
    ]" />

    <BaseInput v-model="form.occurredOn" :label="t('savings.date')" type="date" icon="solar:calendar-bold" />

    <BaseInput v-model="form.amount" :label="t('savings.amount')" type="number" step="any" icon="solar:tag-price-bold"
      :placeholder="t('cash.amountPlaceholder')" :error="errors.amount" />

    <BaseInput v-model="form.note" :label="t('savings.noteLabel')" icon="solar:pen-bold"
      :placeholder="t('savings.notePlaceholder')" />

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving">
        {{ t('common.save') }}
      </BaseButton>

      <BaseButton type="button" variant="danger" block :loading="deleting" @click="showDeleteConfirm = true">
        {{ t('savings.edit.delete') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" :title="t('savings.edit.deleteTitle')"
    :confirm-text="t('savings.edit.delete')" :cancel-text="t('common.cancel')" show-cancel @confirm="onDeleteConfirm">
    <p class="text-content">
      {{ t('savings.edit.deleteConfirm') }}
    </p>
  </BaseDialog>
</template>
