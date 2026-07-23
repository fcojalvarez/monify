<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Category, CategoryKind } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { DEFAULT_CATEGORY_ICON, PALETTE } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import IconPicker from '@/components/ui/IconPicker.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  category?: Category
  defaultKind?: CategoryKind
  initialName?: string
}>()
const emit = defineEmits<{ saved: [category: Category]; cancel: [] }>()

const categories = useCategoriesStore()
const isEdit = computed(() => !!props.category)
const { t } = useI18n()

const form = reactive({
  name: props.category?.name ?? props.initialName ?? '',
  kind: (props.category?.kind ?? props.defaultKind ?? 'expense') as CategoryKind,
  icon: props.category?.icon ?? DEFAULT_CATEGORY_ICON,
  color: props.category?.color ?? PALETTE[0],
  hasLimit: props.category?.monthly_limit != null,
  limit: props.category?.monthly_limit != null ? String(props.category.monthly_limit) : '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)
const duplicateMatches = ref<Category[]>([])
const showDuplicateDialog = ref(false)

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function similarity(first: string, second: string) {
  const source = normalizeName(first)
  const target = normalizeName(second)
  if (!source || !target) return 0
  const matrix = Array.from({ length: source.length + 1 }, () => Array(target.length + 1).fill(0))

  for (let index = 0; index <= source.length; index++) matrix[index][0] = index
  for (let index = 0; index <= target.length; index++) matrix[0][index] = index

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex++) {
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex++) {
      matrix[sourceIndex][targetIndex] = Math.min(
        matrix[sourceIndex - 1][targetIndex] + 1,
        matrix[sourceIndex][targetIndex - 1] + 1,
        matrix[sourceIndex - 1][targetIndex - 1] + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1),
      )
    }
  }

  return 1 - matrix[source.length][target.length] / Math.max(source.length, target.length)
}

function validate(): boolean {
  errors.name = form.name.trim() ? undefined : t('categories.errorName')
  if (form.hasLimit) {
    errors.limit = isPositiveAmount(parseAmount(form.limit))
      ? undefined
      : t('categories.errorLimit')
  } else {
    errors.limit = undefined
  }
  return !errors.name && !errors.limit
}

async function saveCategory() {
  serverError.value = null
  showDuplicateDialog.value = false
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      icon: form.icon,
      color: form.color,
      monthly_limit: form.hasLimit ? parseAmount(form.limit) : null,
    }
    let result: Category
    if (props.category) {
      result = await categories.update(props.category.id, payload)
    } else {
      result = await categories.create(payload)
    }
    emit('saved', result)
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : t('categories.genericSaveError')
  } finally {
    saving.value = false
  }
}

function onSubmit() {
  if (!validate()) return

  if (!props.category) {
    duplicateMatches.value = categories.items.filter(
      category => category.kind === form.kind && similarity(category.name, form.name) >= 0.70,
    )

    if (duplicateMatches.value.length) {
      showDuplicateDialog.value = true
      return
    }
  }

  void saveCategory()
}

const initialForm = {
  name: form.name,
  kind: form.kind,
  icon: form.icon,
  color: form.color,
  hasLimit: form.hasLimit,
  limit: form.limit,
}

const hasChanges = computed(() => {
  return (
    form.name !== initialForm.name ||
    form.kind !== initialForm.kind ||
    form.icon !== initialForm.icon ||
    form.color !== initialForm.color ||
    form.hasLimit !== initialForm.hasLimit ||
    form.limit !== initialForm.limit
  )
})

const showConfirmDialog = ref(false)

function onCancelClick() {
  if (hasChanges.value) {
    showConfirmDialog.value = true
  } else {
    emit('cancel')
  }
}

defineExpose({
  hasChanges,
})
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="onSubmit">
    <!-- Vista previa -->
    <div class="flex items-center gap-3">
      <span class="flex h-12 w-12 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: form.color }">
        <AppIcon :name="form.icon" :size="24" />
      </span>
      <span class="text-sm text-content-muted">{{ t('categories.previewCaption') }}</span>
    </div>

    <SegmentedControl v-model="form.kind" :options="[
      { value: 'expense', label: t('categories.kindExpense') },
      { value: 'income', label: t('categories.kindIncome') },
    ]" />

    <BaseInput v-model="form.name" :label="t('categories.nameLabel')" icon="solar:tag-bold"
      :placeholder="t('categories.namePlaceholder')" :error="errors.name" />

    <div>
      <span class="field-label">{{ t('categories.iconLabel') }}</span>
      <IconPicker v-model="form.icon" :color="form.color" />
    </div>

    <div>
      <span class="field-label">{{ t('categories.colorLabel') }}</span>
      <ColorPicker v-model="form.color" />
    </div>

    <!-- Límite mensual opcional (vale también para ingresos) -->
    <div>
      <label class="flex cursor-pointer items-center justify-between">
        <span class="text-sm font-medium text-content">{{ t('category.monthlyLimit') }}</span>

        <div class="relative shrink-0 ml-4">
          <input v-model="form.hasLimit" type="checkbox" class="sr-only" />

          <span class="relative block h-6 w-11 rounded-pill transition-colors duration-200"
            :class="form.hasLimit ? 'bg-primary-500' : 'bg-line'">
            <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
              :class="form.hasLimit ? 'translate-x-5' : 'translate-x-0'" />
          </span>
        </div>
      </label>

      <div v-if="form.hasLimit" class="mt-3">
        <BaseInput v-model="form.limit" type="number" icon="solar:tag-price-bold"
          :placeholder="t('categories.limitPlaceholder')" :error="errors.limit" />
      </div>
    </div>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex gap-3 pt-1">
      <BaseButton type="button" variant="secondary" block @click="onCancelClick">
        {{ t('common.cancel') }}
      </BaseButton>
      <BaseButton type="submit" block :loading="saving">
        {{ isEdit ? t('common.save') : t('common.createCategory') }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog v-model="showConfirmDialog" variant="danger" :title="t('common.unsavedChanges')"
    :confirm-text="t('common.discard')" :cancel-text="t('common.keepEditing')" show-cancel @confirm="emit('cancel')">
    <p class="text-content">
      {{ t('common.unsavedChangesMessage') }}
    </p>
  </BaseDialog>

  <BaseDialog v-model="showDuplicateDialog" variant="confirm" :title="t('common.similarCategory')"
    :confirm-text="t('common.createAnyway')" :cancel-text="t('common.review')" show-cancel @confirm="saveCategory">
    <p class="text-content">
      {{ duplicateMatches.length === 1 ? t('common.duplicateCategoryOne') : t('common.duplicateCategoryMany') }}:
      <strong>{{duplicateMatches.map(category => category.name).join(', ')}}</strong>.
    </p>
    <p class="mt-2 text-sm text-content-subtle">
      {{ duplicateMatches.length === 1 ? t('common.reviewOne') : t('common.reviewMany') }} {{ t('categories.beforeCreating') }}
      {{ t('common.duplicateWarning') }}.
    </p>
  </BaseDialog>
</template>
