<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { filterRecurringTransactions } from '@/utils/recurring-filters'
import type { RecurringFrequencyFilter, RecurringKindFilter } from '@/utils/recurring-filters'
import { useI18n } from '@/i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
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
const isShowFilters = ref(false)
const activeMemberId = ref('')
const activeKind = ref<RecurringKindFilter>('all')
const activeCategoryId = ref('')
const activeFrequency = ref<RecurringFrequencyFilter>('all')
const filterNextFrom = ref('')
const filterNextTo = ref('')

const showForm = ref(false)
const editingItem = ref<RecurringTransaction>()
const recurringFormRef = ref<InstanceType<typeof RecurringForm> | null>(null)

const filteredCategories = computed(() => {
  if (activeKind.value === 'all') return categories.items
  return categories.items.filter(category => category.kind === activeKind.value)
})

const memberOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...family.items.map(member => ({ value: member.id, label: member.name })),
])

const kindOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'expense', label: t('recurringList.kind.expense') },
  { value: 'income', label: t('recurringList.kind.income') },
])

const categoryOptions = computed(() => [
  { value: '', label: t('recurringList.allCategories') },
  ...filteredCategories.value.map(category => ({
    value: category.id,
    label: category.name,
  })),
])

const frequencyOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'daily', label: t('recurringList.frequencies.daily') },
  { value: 'weekly', label: t('recurringList.frequencies.weekly') },
  { value: 'monthly', label: t('recurringList.frequencies.monthly') },
  { value: 'yearly', label: t('recurringList.frequencies.yearly') },
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
  <div class="min-h-dvh bg-surface pb-24">
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

      <BaseCard class="space-y-4 p-5">
        <div class="flex cursor-pointer items-center justify-between" @click="isShowFilters = !isShowFilters">
          <div class="flex items-center">
            <AppIcon :name="`solar:alt-arrow-${isShowFilters ? 'up' : 'down'}-linear`" :size="18"
              class="mr-2 text-content-muted" />
            <span class="text-sm font-semibold text-content">
              {{ t('recurringList.filters') }}
            </span>
          </div>

          <button v-if="isShowFilters" type="button"
            class="text-xs font-semibold text-primary-500 transition-colors hover:text-primary-600"
            @click.stop="clearFilters">
            {{ t('recurringList.clearFilters') }}
          </button>
        </div>

        <section v-if="isShowFilters" class="space-y-3">
          <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <label class="field-label">
                {{ t('recurringList.nextFrom') }}
              </label>
              <input v-model="filterNextFrom" type="date"
                class="h-10 w-full rounded-field border border-line bg-surface px-3 text-sm text-content focus-visible:ring-primary-500">
            </div>

            <div>
              <label class="field-label">
                {{ t('recurringList.nextTo') }}
              </label>
              <input v-model="filterNextTo" type="date"
                class="h-10 w-full rounded-field border border-line bg-surface px-3 text-sm text-content focus-visible:ring-primary-500">
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BaseSelect v-model="activeMemberId" :label="t('recurringList.member')" :options="memberOptions" />
            <BaseSelect v-model="activeKind" :label="t('recurringList.flowType')" :options="kindOptions" />
            <BaseSelect v-model="activeCategoryId" :label="t('recurringList.category')" :options="categoryOptions" />
            <BaseSelect v-model="activeFrequency" :label="t('transaction.frequency')" :options="frequencyOptions" />
          </div>
        </section>
      </BaseCard>

      <BaseCard as="section" class="p-4">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">
          {{ t('recurringList.results') }}
        </h2>

        <div v-if="loading" class="py-10 text-center text-sm text-content-subtle">
          Cargando…
        </div>

        <div v-else-if="error" class="py-10 text-center text-sm text-content-subtle">
          {{ t('recurringList.empty') }}
        </div>

        <div v-else-if="!items.length" class="py-10 text-center">
          <AppIcon name="solar:repeat-bold-duotone" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">
            {{ t('recurringList.empty') }}
          </p>
        </div>

        <div v-else-if="!filteredItems.length" class="py-10 text-center">
          <AppIcon name="solar:magnifer-linear" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">
            {{ t('common.noResults') }}
          </p>
        </div>

        <ul v-else class="divide-y divide-line">
          <RecurringItem v-for="item in filteredItems" :key="item.id" :transaction="item" class="cursor-pointer"
            @click="openEdit(item)" />
        </ul>
      </BaseCard>
    </main>

    <button
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      aria-label="Añadir movimiento recurrente" @click="openNew">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      Añadir
    </button>

    <BaseSheet v-model="showForm"
      :title="editingItem ? t('recurringForm.title') : t('recurringForm.createTitle')"
      :has-changes="recurringFormRef?.hasChanges">
      <RecurringForm ref="recurringFormRef" :transaction="editingItem" @saved="onSaved"
        @cancel="showForm = false" />
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
