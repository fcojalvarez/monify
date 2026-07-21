<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CategoryKind, RecurringTransaction } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { todayISO } from '@/utils/format'
import { useI18n } from '@/i18n'

const props = defineProps<{ transaction?: RecurringTransaction }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const categories = useCategoriesStore()
const family = useFamilyStore()
const recurringTransactions = useRecurringTransactionsStore()
const { t } = useI18n()

const isEdit = computed(() => !!props.transaction)
const today = todayISO()

const form = reactive({
  kind: (props.transaction?.kind ?? 'expense') as CategoryKind,
  gross: props.transaction ? String(props.transaction.gross ?? '') : '',
  amount: props.transaction ? String(props.transaction.amount) : '',
  categoryId: props.transaction?.category_id ?? '',
  familyMemberId: props.transaction?.family_member_id ?? family.self?.id ?? '',
  note: props.transaction?.note ?? '',
  isCash: props.transaction?.payment_method === 'cash',
  frequency: (props.transaction?.frequency ?? 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly',
  startOn: props.transaction?.start_on ?? today,
  nextExecution: props.transaction?.next_execution ?? today,
  endOn: props.transaction?.end_on ?? '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)

const categoryOptions = computed(() =>
  categories.items
    .filter((c) => c.kind === form.kind)
    .map((c) => ({ value: c.id, label: c.name })),
)
const memberOptions = computed(() =>
  family.items.map((m) => ({ value: m.id, label: m.name })),
)

watch(
  () => form.kind,
  () => {
    if (!categoryOptions.value.some((o) => o.value === form.categoryId)) form.categoryId = ''
  },
)

function validate(): boolean {
  const amount = parseAmount(form.amount)

  if (form.kind === 'income') {
    errors.gross = isPositiveAmount(parseAmount(form.gross)) ? undefined : 'Introduce un importe mayor que 0'
  } else {
    errors.gross = undefined
  }

  errors.amount = isPositiveAmount(amount) ? undefined : 'Introduce un importe mayor que 0'
  errors.categoryId = form.categoryId ? undefined : 'Elige una categoría'
  errors.familyMemberId = (!form.isCash || form.familyMemberId) ? undefined : 'Elige un miembro'
  errors.startOn = form.startOn ? undefined : 'Introduce una fecha de inicio'
  errors.nextExecution = form.nextExecution ? undefined : 'Introduce una fecha de próxima ejecución'

  if (errors.amount || errors.categoryId || errors.familyMemberId || errors.gross || errors.startOn || errors.nextExecution) {
    return false
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

    if (isEdit.value) {
      await recurringTransactionsService.update(props.transaction!.id, {
        ...baseData,
        gross,
        frequency: form.frequency,
        start_on: form.startOn,
        next_execution: form.nextExecution,
        end_on: form.endOn || null,
      })
    } else {
      await recurringTransactions.create({
        ...baseData,
        gross,
        frequency: form.frequency,
        start_on: form.startOn,
        next_execution: form.nextExecution,
        end_on: form.endOn || null,
      })

      await recurringTransactions.sync()
    }

    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'No se pudo guardar.'
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
    await recurringTransactionsService.remove(props.transaction.id)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'No se pudo eliminar.'
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
  note: form.note,
  isCash: form.isCash,
  frequency: form.frequency,
  startOn: form.startOn,
  nextExecution: form.nextExecution,
  endOn: form.endOn,
}

const hasChanges = computed(() => {
  return (
    form.kind !== initialForm.kind ||
    form.gross !== initialForm.gross ||
    form.amount !== initialForm.amount ||
    form.categoryId !== initialForm.categoryId ||
    form.familyMemberId !== initialForm.familyMemberId ||
    form.note !== initialForm.note ||
    form.isCash !== initialForm.isCash ||
    form.frequency !== initialForm.frequency ||
    form.startOn !== initialForm.startOn ||
    form.nextExecution !== initialForm.nextExecution ||
    form.endOn !== initialForm.endOn
  )
})

defineExpose({
  hasChanges,
})
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <SegmentedControl v-model="form.kind" :options="[
      { value: 'expense', label: 'Gasto' },
      { value: 'income', label: 'Ingreso' },
    ]" />

    <div class="flex items-center justify-between py-1">
      <span class="text-sm font-medium text-content">¿Efectivo?</span>
      <label class="relative cursor-pointer shrink-0 ml-4">
        <input v-model="form.isCash" type="checkbox" class="sr-only" />
        <span class="relative block h-6 w-11 rounded-pill transition-colors duration-200"
          :class="form.isCash ? 'bg-primary-500' : 'bg-line'">
          <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
            :class="form.isCash ? 'translate-x-5' : 'translate-x-0'" />
        </span>
      </label>
    </div>

    <BaseInput v-if="form.kind === 'income'" v-model="form.gross" label="Importe bruto" type="number"
      icon="solar:tag-price-bold" placeholder="0,00" :error="errors.gross" />

    <BaseInput v-model="form.amount" label="Importe" type="number" icon="solar:tag-price-bold" placeholder="0,00"
      :error="errors.amount" />

    <BaseSelect v-model="form.familyMemberId" label="Pertenece a" placeholder="Selecciona un miembro"
      :options="memberOptions" :error="errors.familyMemberId" />

    <BaseSelect v-if="categoryOptions.length" v-model="form.categoryId" label="Categoría"
      placeholder="Selecciona una categoría" :options="categoryOptions" :error="errors.categoryId" />
    <p v-else class="rounded-field bg-surface-muted p-3 text-sm text-content-muted">
      No tienes categorías de {{ form.kind === 'income' ? 'ingreso' : 'gasto' }} todavía. Puedes crearlas en
      Gestionar cuenta → Organización → Categorías.
    </p>

    <BaseSelect v-model="form.frequency" :label="t('transaction.frequency')" :options="[
      { value: 'daily', label: t('recurringList.frequencies.daily') }, { value: 'weekly', label: t('recurringList.frequencies.weekly') },
      { value: 'monthly', label: t('recurringList.frequencies.monthly') }, { value: 'yearly', label: t('recurringList.frequencies.yearly') },
    ]" />

    <BaseInput v-model="form.startOn" :label="t('recurringForm.startDate')" type="date" icon="solar:calendar-bold"
      :error="errors.startOn" />

    <BaseInput v-model="form.nextExecution" :label="t('recurringForm.nextExecution')" type="date"
      icon="solar:calendar-bold" :error="errors.nextExecution" />

    <BaseInput v-model="form.endOn" :label="t('transaction.endDate')" type="date" icon="solar:calendar-bold" />
    <p v-if="form.endOn" class="text-xs text-content-muted">
      {{ t('transaction.endsOn', { date: form.endOn.split("-").reverse().join("-") }) }}
    </p>
    <p v-else class="text-xs text-content-muted">
      {{ t('transaction.noEndDate') }}
    </p>

    <BaseInput v-model="form.note" label="Nota (opcional)" icon="solar:pen-bold" placeholder="Descripción breve" />

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving" :disabled="!categoryOptions.length">
        {{ isEdit ? t('recurringForm.editButton') : t('recurringForm.createButton') }}
      </BaseButton>

      <BaseButton v-if="isEdit" type="button" variant="danger" block :loading="deleting" @click="showDeleteConfirm = true">
        {{ t('recurringForm.deleteButton') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" :title="t('recurringForm.deleteTitle')"
    confirm-text="Eliminar" cancel-text="Cancelar" show-cancel @confirm="onDeleteConfirm">
    <p class="text-content">
      {{ t('recurringForm.deleteConfirm') }}
    </p>
  </BaseDialog>
</template>
