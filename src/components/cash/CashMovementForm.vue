<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { CashTransaction } from '@/services/cash.service'
import { useCashStore } from '@/stores/cash'
import { useFamilyStore } from '@/stores/family'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ transaction: CashTransaction }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const cash = useCashStore()
const family = useFamilyStore()
const { t } = useI18n()

const form = reactive({
  direction: (props.transaction.amount >= 0 ? 'deposit' : 'withdrawal') as 'deposit' | 'withdrawal',
  amount: String(Math.abs(props.transaction.amount)),
  familyMemberId: props.transaction.family_member_id ?? family.self?.id ?? '',
  occurredOn: (props.transaction.occurred_on ?? '').slice(0, 10),
  note: props.transaction.note ?? '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)

const memberOptions = computed(() =>
  family.items.map((m) => ({ value: m.id, label: m.name })),
)

function validate(): boolean {
  const amount = parseAmount(form.amount)
  errors.amount = isPositiveAmount(amount) ? undefined : t('cash.errors.amountPositive')
  errors.familyMemberId = form.familyMemberId ? undefined : t('cash.errors.noMember')
  return !errors.amount && !errors.familyMemberId
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return

  saving.value = true
  try {
    await cash.updateTransaction(props.transaction.id, {
      amount: parseAmount(form.amount),
      isDeposit: form.direction === 'deposit',
      note: form.note.trim() || null,
      familyMemberId: form.familyMemberId,
      occurredOn: form.occurredOn || undefined,
    })
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('cash.edit.genericError')
  } finally {
    saving.value = false
  }
}

async function onDeleteConfirm() {
  showDeleteConfirm.value = false
  deleting.value = true
  try {
    await cash.deleteTransaction(props.transaction.id)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('cash.edit.genericError')
  } finally {
    deleting.value = false
  }
}

const initial = { ...form }
const hasChanges = computed(
  () =>
    form.direction !== initial.direction ||
    form.amount !== initial.amount ||
    form.familyMemberId !== initial.familyMemberId ||
    form.occurredOn !== initial.occurredOn ||
    form.note !== initial.note,
)

defineExpose({ hasChanges })
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <SegmentedControl v-model="form.direction" :options="[
      { value: 'deposit', label: t('cash.edit.deposit') },
      { value: 'withdrawal', label: t('cash.edit.withdrawal') },
    ]" />

    <BaseInput v-model="form.occurredOn" :label="t('cash.date')" type="date" icon="solar:calendar-bold" />

    <BaseInput v-model="form.amount" :label="t('cash.amount')" type="number" icon="solar:tag-price-bold"
      :placeholder="t('cash.amountPlaceholder')" :error="errors.amount" />

    <BaseSelect v-model="form.familyMemberId" :label="t('cash.affectedWalletLabel')"
      :placeholder="t('common.select')" :options="memberOptions" :error="errors.familyMemberId" />

    <BaseInput v-model="form.note" :label="t('cash.concept')" icon="solar:pen-bold"
      :placeholder="t('cash.conceptPlaceholder')" />

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving">
        {{ t('common.save') }}
      </BaseButton>

      <BaseButton type="button" variant="danger" block :loading="deleting" @click="showDeleteConfirm = true">
        {{ t('cash.edit.delete') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" :title="t('cash.edit.deleteTitle')"
    :confirm-text="t('cash.edit.delete')" :cancel-text="t('common.cancel')" show-cancel @confirm="onDeleteConfirm">
    <p class="text-content">
      {{ t('cash.edit.deleteConfirm') }}
    </p>
  </BaseDialog>
</template>
