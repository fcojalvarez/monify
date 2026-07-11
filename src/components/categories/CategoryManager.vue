<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Category } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { formatCurrency } from '@/utils/format'
import CategoryForm from './CategoryForm.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const categories = useCategoriesStore()

type Mode = { view: 'list' } | { view: 'form'; category?: Category }
const mode = ref<Mode>({ view: 'list' })

const grouped = computed(() => ({
  expense: categories.items.filter((c) => c.kind === 'expense'),
  income: categories.items.filter((c) => c.kind === 'income'),
}))

async function onDelete(category: Category) {
  if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return
  await categories.remove(category.id)
}

const view = computed(() => mode.value.view)
function openForm(category?: Category) {
  mode.value = { view: 'form', category }
}

defineExpose({
  view,
  openForm,
})
</script>

<template>
  <div v-if="mode.view === 'form'">
    <CategoryForm
      :category="mode.category"
      @saved="mode = { view: 'list' }"
      @cancel="mode = { view: 'list' }"
    />
  </div>

  <div v-else class="space-y-5">
    <template v-for="section in ['expense', 'income'] as const" :key="section">
      <div v-if="grouped[section].length">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-subtle">
          {{ section === 'expense' ? 'Gastos' : 'Ingresos' }}
        </h3>
        <ul class="space-y-1">
          <li
            v-for="category in grouped[section]"
            :key="category.id"
            class="flex items-center gap-3 rounded-field p-2 hover:bg-surface-muted"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              :style="{ backgroundColor: category.color }"
            >
              <AppIcon :name="category.icon" :size="18" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-content">{{ category.name }}</p>
              <p v-if="category.monthly_limit" class="text-xs text-content-subtle">
                Límite {{ formatCurrency(category.monthly_limit) }}
              </p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:bg-line"
              aria-label="Editar"
              @click="mode = { view: 'form', category }"
            >
              <AppIcon name="solar:pen-2-linear" :size="18" />
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-expense hover:bg-expense-light"
              aria-label="Eliminar"
              @click="onDelete(category)"
            >
              <AppIcon name="solar:trash-bin-trash-linear" :size="18" />
            </button>
          </li>
        </ul>
      </div>
    </template>

  </div>
</template>
