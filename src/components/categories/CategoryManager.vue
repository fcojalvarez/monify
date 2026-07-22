<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Category } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { formatCurrency } from '@/utils/format'
import CategoryForm from './CategoryForm.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'

const categories = useCategoriesStore()
const { t } = useI18n()

type Mode = { view: 'list' } | { view: 'form'; category?: Category }
const mode = ref<Mode>({ view: 'list' })

const sections = ['expense', 'income'] as const

const grouped = computed(() => ({
  expense: categories.items.filter((c) => c.kind === 'expense'),
  income: categories.items.filter((c) => c.kind === 'income'),
}))

const showDeleteDialog = ref(false)
const categoryToDelete = ref<Category>()

function onDelete(category: Category) {
  categoryToDelete.value = category
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!categoryToDelete.value) return

  await categories.remove(categoryToDelete.value.id)

  showDeleteDialog.value = false
  categoryToDelete.value = undefined
}

const categoryFormRef = ref<InstanceType<typeof CategoryForm> | null>(null)

const view = computed(() => mode.value.view)

const hasChanges = computed(() => {
  return mode.value.view === 'form' && (categoryFormRef.value?.hasChanges ?? false)
})

function openForm(category?: Category) {
  mode.value = { view: 'form', category }
}

defineExpose({
  view,
  openForm,
  hasChanges,
})
</script>

<template>
  <div v-if="mode.view === 'form'">
    <CategoryForm ref="categoryFormRef" :category="mode.category" @saved="mode = { view: 'list' }" @cancel="mode = { view: 'list' }" />
  </div>

  <div v-else class="space-y-5">
    <BaseSpinner v-if="categories.loading && !categories.items.length" />

    <EmptyState v-else-if="!categories.items.length" icon="solar:tag-linear" :title="t('categories.empty')" />

    <template v-else>
      <template v-for="section in sections" :key="section">
        <div v-if="grouped[section].length">
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-subtle">
            {{ section === 'expense' ? t('categories.expenseSection') : t('categories.incomeSection') }}
          </h3>

          <ul class="space-y-1">
            <li v-for="category in grouped[section]" :key="category.id"
              class="flex items-center gap-3 rounded-field p-2 hover:bg-surface-muted">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                :style="{ backgroundColor: category.color }">
                <AppIcon :name="category.icon" :size="18" />
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-content">
                  {{ category.name }}
                </p>

                <p v-if="category.monthly_limit" class="text-xs text-content-subtle">
                  {{ t('categories.limitAmount', { amount: formatCurrency(category.monthly_limit) }) }}
                </p>
              </div>

              <button class="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:bg-line"
                :aria-label="t('categories.editAria')" @click="mode = { view: 'form', category }">
                <AppIcon name="solar:pen-2-linear" :size="18" />
              </button>

              <button class="flex h-8 w-8 items-center justify-center rounded-full text-expense hover:bg-expense-light"
                :aria-label="t('categories.deleteAria')" @click="onDelete(category)">
                <AppIcon name="solar:trash-bin-trash-linear" :size="18" />
              </button>
            </li>
          </ul>
        </div>
      </template>
    </template>
  </div>

  <BaseDialog v-model="showDeleteDialog" variant="danger" :title="t('categories.deleteTitle')"
    :confirm-text="t('categories.deleteAria')" show-cancel @confirm="confirmDelete">
    <p class="text-content">
      {{ t('categories.deleteConfirmPrefix') }}
      <strong>{{ categoryToDelete?.name }}</strong>?
    </p>

    <p class="mt-2 text-sm text-content-subtle">
      {{ t('categories.deleteHint') }}
    </p>
  </BaseDialog>
</template>