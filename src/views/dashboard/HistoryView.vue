<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import type { TransactionWithRelations } from '@/types'
import { transactionsService, type TransactionFilters } from '@/services/transactions.service'
import { useFamilyStore } from '@/stores/family'
import { useCategoriesStore } from '@/stores/categories'
import { formatCurrency } from '@/utils/format'

import TransactionItem from '@/components/transactions/TransactionItem.vue'

import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDateInput from '@/components/ui/BaseDateInput.vue'
import FilterPanel from '@/components/ui/FilterPanel.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'
import { useMemberOptions, useKindOptions, useCategoryOptions } from '@/composables/useEntityOptions'

const TransactionForm = defineAsyncComponent(() => import('@/components/transactions/TransactionForm.vue'))

const family = useFamilyStore()
const categories = useCategoriesStore()
const { t } = useI18n()

const initDates = () => {
  const today = new Date()
  const fromDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)

  const pad = (n: number) => String(n).padStart(2, '0')

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  return {
    from: formatDate(fromDate),
    to: formatDate(today),
  }
}

const dates = initDates()

const filterFrom = ref(dates.from)
const filterTo = ref(dates.to)

const activeMemberId = ref('')
const activeKind = ref<'all' | 'expense' | 'income'>('all')
const activeCategoryId = ref('')


const historyItems = ref<TransactionWithRelations[]>([])
const loading = ref(false)

/**
 * Scroll top
 */
const showScrollTop = ref(false)

function handleScroll() {
  showScrollTop.value = window.scrollY > 500
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const showTransaction = ref(false)
const editingTransaction = ref<TransactionWithRelations>()
const transactionFormRef = ref<InstanceType<typeof TransactionForm> | null>(null)

const memberOptions = useMemberOptions({ include: true })
const kindOptions = useKindOptions({ include: true })
const categoryOptions = useCategoryOptions(() => activeKind.value, { include: true })

const summary = computed(() => {
  const list = historyItems.value

  const income = list
    .filter(transaction => transaction.kind === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const expense = list
    .filter(transaction => transaction.kind === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  return {
    income,
    expense,
    balance: income - expense,
  }
})

async function fetchHistory() {
  loading.value = true

  try {
    const filters: TransactionFilters = {
      from: filterFrom.value || undefined,
      to: filterTo.value || undefined,
      familyMemberId: activeMemberId.value || undefined,
      categoryId: activeCategoryId.value || undefined,
    }

    let data = await transactionsService.list(filters)

    if (activeKind.value !== 'all') {
      data = data.filter(transaction => transaction.kind === activeKind.value)
    }

    historyItems.value = data
  } catch (err) {
    console.error('Error fetching history:', err)
  } finally {
    loading.value = false
  }
}

watch(
  [
    filterFrom,
    filterTo,
    activeMemberId,
    activeKind,
    activeCategoryId,
  ],
  fetchHistory,
)

watch(activeKind, newKind => {
  if (!activeCategoryId.value) return

  const selectedCategory = categories.items.find(
    category => category.id === activeCategoryId.value,
  )

  if (
    selectedCategory &&
    newKind !== 'all' &&
    selectedCategory.kind !== newKind
  ) {
    activeCategoryId.value = ''
  }
})

function openEditTransaction(transaction: TransactionWithRelations) {
  editingTransaction.value = transaction
  showTransaction.value = true
}

async function onTransactionSaved() {
  showTransaction.value = false
  await fetchHistory()
  await family.fetchAll(true)
}

function clearFilters() {
  const defaultDates = initDates()

  filterFrom.value = defaultDates.from
  filterTo.value = defaultDates.to

  activeMemberId.value = ''
  activeKind.value = 'all'
  activeCategoryId.value = ''
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)

  await Promise.all([
    categories.fetchAll(),
    family.fetchAll(),
  ])

  await fetchHistory()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-12">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div class="flex items-center gap-3">

        <div>
          <h1 class="text-2xl font-bold text-content">
            {{ t('history.title') }}
          </h1>

          <p class="text-xs text-content-muted">
            {{ t('history.subtitle') }}
          </p>
        </div>
      </div>

      <FilterPanel :title="t('history.filters')" :clear-label="t('history.clearFilters')" @clear="clearFilters">
        <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
          <div>
            <BaseDateInput v-model="filterFrom" :label="t('history.from')" />
          </div>

          <div>
            <BaseDateInput v-model="filterTo" :label="t('history.to')" />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BaseSelect v-model="activeMemberId" :label="t('history.member')" :options="memberOptions" />

          <BaseSelect v-model="activeKind" :label="t('history.flowType')" :options="kindOptions" />

          <BaseSelect v-model="activeCategoryId" :label="t('history.category')" :options="categoryOptions" />
        </div>
      </FilterPanel>

      <div class="flex gap-3">
        <BaseCard v-if="['income', 'all'].includes(activeKind)"
          class="flex-1 border border-line bg-surface-raised p-4 text-center">
          <p class="text-xs font-semibold text-content-muted">
            {{ t('summary.income') }}
          </p>

          <p class="mt-1 text-lg font-bold text-income">
            {{ formatCurrency(summary.income) }}
          </p>
        </BaseCard>

        <BaseCard v-if="['expense', 'all'].includes(activeKind)"
          class="flex-1 border border-line bg-surface-raised p-4 text-center">
          <p class="text-xs font-semibold text-content-muted">
            {{ t('summary.expense') }}
          </p>

          <p class="mt-1 text-lg font-bold text-expense">
            {{ formatCurrency(summary.expense) }}
          </p>
        </BaseCard>

        <BaseCard class="flex-1 border border-line bg-surface-raised p-4 text-center">
          <p class="text-xs font-semibold text-content-muted">
            {{ t('history.netBalance') }}
          </p>

          <p class="mt-1 text-lg font-bold" :class="summary.balance >= 0 ? 'text-income' : 'text-expense'">
            {{ formatCurrency(summary.balance) }}
          </p>
        </BaseCard>
      </div>

      <BaseCard as="section" class="p-4">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">
          {{ t('history.results') }}
        </h2>

        <BaseSpinner v-if="loading" />

        <EmptyState v-else-if="!historyItems.length" icon="solar:wallet-money-bold-duotone"
          :title="t('history.emptyResults')" />

        <ul v-else class="animate-fade-in divide-y divide-line">
          <TransactionItem v-for="transaction in historyItems" :key="transaction.id" :transaction="transaction"
            class="cursor-pointer rounded-field px-2 transition-colors hover:bg-surface-muted/30"
            @click="openEditTransaction(transaction)" />
        </ul>
      </BaseCard>
    </main>

    <BaseSheet v-model="showTransaction" :title="t('history.editMovement')"
      :has-changes="transactionFormRef?.hasChanges">
      <TransactionForm ref="transactionFormRef" :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>

    <!-- Botón volver arriba -->
    <Transition enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in" enter-from-class="translate-y-4 opacity-0"
      leave-to-class="translate-y-4 opacity-0">
      <button v-if="showScrollTop" type="button"
        class="fixed bottom-24 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition hover:bg-primary-600 active:scale-95"
        :aria-label="t('history.scrollTop')" :title="t('history.scrollTop')" @click="scrollToTop">
        <AppIcon name="solar:alt-arrow-up-bold" :size="22" />
      </button>
    </Transition>
  </div>
</template>