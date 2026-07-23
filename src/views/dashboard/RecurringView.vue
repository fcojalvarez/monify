<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { filterRecurringTransactions } from '@/utils/recurring-filters'
import type { RecurringFrequencyFilter, RecurringKindFilter } from '@/utils/recurring-filters'
import { useI18n } from '@/i18n'
import { useMemberOptions, useKindOptions, useCategoryOptions } from '@/composables/useEntityOptions'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDateInput from '@/components/ui/BaseDateInput.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import RecurringItem from '@/components/transactions/RecurringItem.vue'

const RecurringForm = defineAsyncComponent(() => import('@/components/transactions/RecurringForm.vue'))

const { t } = useI18n()
const categories = useCategoriesStore()
const family = useFamilyStore()

const items = ref<RecurringTransaction[]>([])
const loading = ref(true)
const error = ref(false)

const searchQuery = ref('')
const isSearchOpen = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const activeMemberId = ref('')
const activeKind = ref<RecurringKindFilter>('all')
const activeCategoryId = ref('')
const activeFrequency = ref<RecurringFrequencyFilter>('all')
const filterNextFrom = ref('')
const filterNextTo = ref('')

const showForm = ref(false)
const editingItem = ref<RecurringTransaction>()
const recurringFormRef = ref<InstanceType<typeof RecurringForm> | null>(null)

const memberOptions = useMemberOptions({ include: true })
const kindOptions = useKindOptions({ include: true })
const categoryOptions = useCategoryOptions(() => activeKind.value, {
  include: true,
  label: t('recurringList.allCategories'),
})

const frequencyOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'daily', label: t('recurringList.frequencies.daily') },
  { value: 'weekly', label: t('recurringList.frequencies.weekly') },
  { value: 'monthly', label: t('recurringList.frequencies.monthly') },
  { value: 'yearly', label: t('recurringList.frequencies.yearly') },
  { value: 'custom', label: t('recurringList.frequencies.custom') },
])

const filteredItems = computed(() =>
  filterRecurringTransactions(
    items.value,
    {
      query: searchQuery.value,
      kind: activeKind.value,
      familyMemberId: activeMemberId.value || undefined,
      categoryId: activeCategoryId.value || undefined,
      frequency: activeFrequency.value,
      nextFrom: filterNextFrom.value || undefined,
      nextTo: filterNextTo.value || undefined,
    },
    (categoryId) => categories.getById(categoryId)?.name,
  ),
)

function openNew() {
  editingItem.value = undefined
  showForm.value = true
}

async function loadItems() {
  try {
    items.value = await recurringTransactionsService.list()
    error.value = false
  } catch (cause) {
    console.error('No se pudieron cargar las recurrencias.', cause)
    error.value = true
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      categories.fetchAll(),
      family.fetchAll(),
      loadItems(),
    ])
  } finally {
    loading.value = false
  }
})

watch(activeKind, (newKind) => {
  if (!activeCategoryId.value) return

  const selectedCategory = categories.getById(activeCategoryId.value)
  if (selectedCategory && newKind !== 'all' && selectedCategory.kind !== newKind) {
    activeCategoryId.value = ''
  }
})

function openEdit(item: RecurringTransaction) {
  editingItem.value = item
  showForm.value = true
}

async function onSaved() {
  showForm.value = false
  await loadItems()
}

function clearFilters() {
  searchQuery.value = ''
  activeMemberId.value = ''
  activeKind.value = 'all'
  activeCategoryId.value = ''
  activeFrequency.value = 'all'
  filterNextFrom.value = ''
  filterNextTo.value = ''
}

async function openSearch() {
  isSearchOpen.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

function closeSearch() {
  isSearchOpen.value = false
}
</script>

<template>
  <div class="min-h-dvh bg-surface pb-12">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div class="flex min-h-14 items-center gap-3">
        <Transition name="recurring-header" mode="out-in" class="min-w-0 flex-1">
          <div v-if="!isSearchOpen" key="title" class="min-w-0">
            <h1 class="text-2xl font-bold text-content">
              {{ t('recurringList.title') }}
            </h1>
            <p class="text-xs text-content-muted">
              {{ t('recurringList.subtitle') }}
            </p>
          </div>

          <div v-else key="search" class="relative min-w-0">
            <AppIcon name="solar:magnifer-linear" :size="18"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <input ref="searchInputRef" v-model="searchQuery" type="search"
              :placeholder="t('recurringList.searchPlaceholder')"
              class="h-11 w-full rounded-field border border-line bg-surface pl-10 pr-10 text-sm text-content focus-visible:ring-primary-500">
            <button type="button"
              class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
              :aria-label="t('recurringList.closeSearch')" @click="closeSearch">
              <AppIcon name="solar:close-circle-linear" :size="18" />
            </button>
          </div>
        </Transition>

        <button v-if="!isSearchOpen" type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-content-muted transition-colors hover:border-primary-500/30 hover:text-primary-500"
          :aria-label="t('recurringList.openSearch')" @click="openSearch">
          <AppIcon name="solar:magnifer-linear" :size="20" />
        </button>
      </div>

      <FilterPanel @clear="clearFilters">
        <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <BaseDateInput
              v-model="filterNextFrom"
              :label="t('recurringList.nextFrom') + ' (' + t('history.to').toLowerCase() + ')'"
            />
          </div>

          <div>
            <BaseDateInput
              v-model="filterNextTo"
              :label="t('recurringList.nextTo') + ' (' + t('history.from').toLowerCase() + ')'"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseSelect v-model="activeMemberId" :label="t('recurringList.member')" :options="memberOptions" />
          <BaseSelect v-model="activeKind" :label="t('recurringList.flowType')" :options="kindOptions" />
          <BaseSelect v-model="activeCategoryId" :label="t('recurringList.category')" :options="categoryOptions" />
          <BaseSelect v-model="activeFrequency" :label="t('transaction.frequency')" :options="frequencyOptions" />
        </div>
      </FilterPanel>

      <BaseCard as="section" class="p-4">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">
          {{ t('recurringList.results') }}
        </h2>

        <BaseSpinner v-if="loading" />

        <EmptyState v-else-if="error || !items.length" icon="solar:repeat-bold-duotone"
          :title="t('recurringList.empty')" />

        <EmptyState v-else-if="!filteredItems.length" icon="solar:magnifer-linear" :title="t('common.noResults')" />

        <ul v-else class="animate-fade-in divide-y divide-line">
          <RecurringItem v-for="item in filteredItems" :key="item.id" :transaction="item" class="cursor-pointer"
            @click="openEdit(item)" />
        </ul>
      </BaseCard>
    </main>

    <button
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      :aria-label="t('recurringList.addAria')" @click="openNew">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      {{ t('common.add') }}
    </button>

    <BaseSheet v-model="showForm" :title="editingItem ? t('recurringForm.title') : t('recurringForm.createTitle')"
      :has-changes="recurringFormRef?.hasChanges">
      <RecurringForm ref="recurringFormRef" :transaction="editingItem" @saved="onSaved" @cancel="showForm = false" />
    </BaseSheet>
  </div>
</template>

<style scoped>
.recurring-header-enter-active,
.recurring-header-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.recurring-header-enter-from,
.recurring-header-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
