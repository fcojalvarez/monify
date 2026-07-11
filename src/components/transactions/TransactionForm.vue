<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { CategoryKind, TransactionWithRelations } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { useTransactionsStore } from '@/stores/transactions'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { todayISO } from '@/utils/format'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const props = defineProps<{ transaction?: TransactionWithRelations }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()

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
  errors.gross = form.kind === 'income' && isPositiveAmount(parseAmount(form.gross)) ? undefined : 'Introduce un importe mayor que 0'
  errors.amount = isPositiveAmount(amount) ? undefined : 'Introduce un importe mayor que 0'
  errors.categoryId = form.categoryId ? undefined : 'Elige una categoría'
  errors.familyMemberId = form.familyMemberId ? undefined : 'Elige un miembro'
  return !errors.amount && !errors.categoryId && !errors.familyMemberId
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      kind: form.kind,
      gross: form.kind === 'income' ? parseAmount(form.gross || form.amount) : null,
      amount: parseAmount(form.amount),
      category_id: form.categoryId,
      family_member_id: form.familyMemberId,
      occurred_on: form.occurredOn,
      note: form.note.trim() || null,
    }
    if (props.transaction) await transactions.update(props.transaction.id, payload)
    else await transactions.create(payload)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)

async function onDelete() {
  if (!props.transaction) return
  if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return
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
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <SegmentedControl v-model="form.kind" :options="[
      { value: 'expense', label: 'Gasto' },
      { value: 'income', label: 'Ingreso' },
    ]" />

    <BaseInput v-if="form.kind === 'income'" v-model="form.gross" label="Importe bruto" type="number"
      icon="solar:tag-price-bold" placeholder="0,00" :error="errors.gross" />

    <BaseInput v-model="form.amount" label="Importe" type="number" icon="solar:tag-price-bold" placeholder="0,00"
      :error="errors.amount" />

    <BaseSelect v-if="categoryOptions.length" v-model="form.categoryId" label="Categoría"
      placeholder="Selecciona una categoría" :options="categoryOptions" :error="errors.categoryId" />
    <p v-else class="rounded-field bg-surface-muted p-3 text-sm text-content-muted">
      No tienes categorías de {{ form.kind === 'income' ? 'ingreso' : 'gasto' }} todavía. Crea una primero.
    </p>

    <BaseSelect v-model="form.familyMemberId" label="Miembro" placeholder="¿De quién es?" :options="memberOptions"
      :error="errors.familyMemberId" />

    <BaseInput v-model="form.occurredOn" label="Fecha" type="date" icon="solar:calendar-bold" />

    <BaseInput v-model="form.note" label="Nota (opcional)" icon="solar:pen-bold" placeholder="Descripción breve" />

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex flex-col gap-3 pt-1">
      <BaseButton type="submit" block :loading="saving" :disabled="!categoryOptions.length">
        {{ isEdit ? 'Guardar' : 'Añadir' }}
      </BaseButton>

      <BaseButton v-if="isEdit" type="button" variant="danger" block :loading="deleting" @click="onDelete">
        Eliminar movimiento
      </BaseButton>
    </div>
  </form>
</template>
