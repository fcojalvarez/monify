<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CategoryKind, TransactionWithRelations } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { useTransactionsStore } from '@/stores/transactions'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { todayISO, formatDateWithMonthName } from '@/utils/format'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'

const props = defineProps<{ transaction?: TransactionWithRelations }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()
const recurringTransactions = useRecurringTransactionsStore()

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

const form = reactive({
  kind: (props.transaction?.kind ?? 'expense') as CategoryKind,
  gross: props.transaction ? String(props.transaction.gross) : '',
  amount: props.transaction ? String(props.transaction.amount) : '',
  categoryId: props.transaction?.category_id ?? '',
  familyMemberId: props.transaction?.family_member_id ?? family.self?.id ?? '',
  occurredOn: props.transaction?.occurred_on ?? defaultDate(),
  note: props.transaction?.note ?? '',
  isCash: props.transaction?.payment_method === 'cash',
  isRecurring: false,
  frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
  endOn: '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)

const grossInputRef = ref<InstanceType<typeof BaseInput> | null>(null)
const amountInputRef = ref<InstanceType<typeof BaseInput> | null>(null)
const familyMemberInputRef = ref<InstanceType<typeof BaseSelect> | null>(null)
const categoryInputRef = ref<InstanceType<typeof BaseSelect> | null>(null)

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
    errors.gross = isPositiveAmount(parseAmount(form.gross)) ? undefined : 'Introduce un importe mayor que 0'
  } else {
    errors.gross = undefined
  }

  errors.amount = isPositiveAmount(amount) ? undefined : 'Introduce un importe mayor que 0'
  errors.categoryId = form.categoryId ? undefined : 'Elige una categoría'
  errors.familyMemberId = (!form.isCash || form.familyMemberId) ? undefined : 'Elige un miembro'

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
      const errMsg = `No hay esa cantidad en la cartera de ${selectedMember?.name ?? 'esta persona'}`
      errors.familyMemberId = errMsg
      serverError.value = errMsg
      focusFirstError()
      return false
    }
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
        await recurringTransactions.create({
          ...baseData,
          gross,
          frequency: form.frequency,
          start_on: form.occurredOn,
          next_execution: form.occurredOn,
          end_on: form.endOn || null,
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
    await transactions.remove(props.transaction.id)
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
  occurredOn: form.occurredOn,
  note: form.note,
  isCash: form.isCash,
  isRecurring: form.isRecurring,
  frequency: form.frequency,
  endOn: form.endOn,
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

    <BaseInput v-if="form.kind === 'income'" ref="grossInputRef" v-model="form.gross" label="Importe bruto" type="number"
      icon="solar:tag-price-bold" placeholder="0,00" :error="errors.gross" />

    <BaseInput ref="amountInputRef" v-model="form.amount" label="Importe" type="number" icon="solar:tag-price-bold" placeholder="0,00"
      :error="errors.amount" />

    <BaseSelect ref="familyMemberInputRef" v-model="form.familyMemberId" label="Pertenece a" placeholder="Selecciona un miembro"
      :options="memberOptions" :error="errors.familyMemberId" />

    <BaseSelect v-if="categoryOptions.length" ref="categoryInputRef" v-model="form.categoryId" label="Categoría"
      placeholder="Selecciona una categoría" :options="categoryOptions" :error="errors.categoryId" />
    <p v-else class="rounded-field bg-surface-muted p-3 text-sm text-content-muted">
      No tienes categorías de {{ form.kind === 'income' ? 'ingreso' : 'gasto' }} todavía. Puedes crearlas en
      Gestionar cuenta → Organización → Categorías.
    </p>

    <BaseInput v-model="form.occurredOn" label="Fecha" type="date" icon="solar:calendar-bold" />

    <BaseInput v-model="form.note" label="Nota (opcional)" icon="solar:pen-bold" placeholder="Descripción breve" />

    <template v-if="!isEdit">
      <div class="flex items-center justify-between py-1">
        <span class="text-sm font-medium text-content">Repetir este movimiento</span>
        <label class="relative cursor-pointer shrink-0 ml-4">
          <input v-model="form.isRecurring" type="checkbox" class="sr-only" />
          <span class="relative block h-6 w-11 rounded-pill transition-colors duration-200"
            :class="form.isRecurring ? 'bg-primary-500' : 'bg-line'">
            <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
              :class="form.isRecurring ? 'translate-x-5' : 'translate-x-0'" />
          </span>
        </label>
      </div>
      <div v-if="form.isRecurring" class="space-y-3 rounded-field border border-line p-3">
        <BaseSelect v-model="form.frequency" label="Frecuencia" :options="[
          { value: 'daily', label: 'Diaria' }, { value: 'weekly', label: 'Semanal' },
          { value: 'monthly', label: 'Mensual' }, { value: 'yearly', label: 'Anual' },
        ]" />
        <BaseInput v-model="form.endOn" label="Fecha de fin (opcional)" type="date" icon="solar:calendar-bold" />
        <p class="text-xs text-content-muted">
          {{ form.endOn ? `Finalizará el ${formatDateWithMonthName(form.endOn)}.` : `No tiene fecha de
          finalización.` }}
        </p>
      </div>
    </template>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving" :disabled="!categoryOptions.length">
        {{ isEdit ? 'Guardar' : 'Añadir' }}
      </BaseButton>

      <BaseButton v-if="isEdit" type="button" variant="danger" block :loading="deleting"
        @click="showDeleteConfirm = true">
        Eliminar movimiento
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showDeleteConfirm" variant="danger" title="Eliminar movimiento" confirm-text="Eliminar"
    cancel-text="Cancelar" show-cancel @confirm="onDeleteConfirm">
    <p class="text-content">
      ¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.
    </p>
  </BaseDialog>
</template>
