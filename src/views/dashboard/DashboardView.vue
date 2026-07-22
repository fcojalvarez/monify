<script setup lang="ts">
import { computed, onMounted, ref, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import type { TransactionWithRelations } from '@/types'
import { useProfileStore } from '@/stores/profile'
import { useTransactionsStore } from '@/stores/transactions'
import { useSavingsStore } from '@/stores/savings'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { useCashStore } from '@/stores/cash'
import { useUiStore } from '@/stores/ui'

import BalanceSummary from '@/components/dashboard/BalanceSummary.vue'
import CategoryProgress from '@/components/dashboard/CategoryProgress.vue'
import TransactionItem from '@/components/transactions/TransactionItem.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  currentPeriodRange,
  type DashboardPeriod,
} from '@/utils/period'
import { useI18n } from '@/i18n'

const TransactionForm = defineAsyncComponent(() => import('@/components/transactions/TransactionForm.vue'))

const profile = useProfileStore()
const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()
const savingsStore = useSavingsStore()
const cashStore = useCashStore()
const ui = useUiStore()
const { t } = useI18n()

const { summary, usageByCategory, items, loading } = storeToRefs(transactions)
const { items: savings } = storeToRefs(savingsStore)
const { cashEnabled } = storeToRefs(profile)
const { balance: cash } = storeToRefs(cashStore)

const savingsLoaded = ref(false)
const activeMember = ref<string | null>(null)
const activeFilter = ref<DashboardPeriod>('day')

const filterLabel = computed(() => t(`dashboard.movements.${activeFilter.value}`))
const balancePeriodLabel = computed(() => t(`dashboard.period.${activeFilter.value}`))

/** Neto de efectivo (entradas − salidas) del periodo activo para la tarjeta de balance. */
const cashPeriodNet = computed(() => {
  const { from, to } = currentPeriodRange(activeFilter.value)
  return cashStore.netForRange(from, to)
})

const filteredItems = computed(() => items.value)

const limitedUsage = computed(() =>
  usageByCategory.value.filter((u) => u.limit != null).slice(0, 5),
)

const showTransaction = ref(false)
const editingTransaction = ref<TransactionWithRelations | undefined>()

const transactionFormRef = ref<InstanceType<typeof TransactionForm> | null>(null)

function openNewTransaction() {
  editingTransaction.value = undefined
  showTransaction.value = true
}

function openEditTransaction(transaction: TransactionWithRelations) {
  editingTransaction.value = transaction
  showTransaction.value = true
}

async function onTransactionSaved() {
  showTransaction.value = false
  await fetchTransactions()
  if (profile.cashEnabled) {
    await cashStore.refresh()
    await family.fetchAll(true)
  }
}

async function selectMember(memberId: string | null) {
  activeMember.value = memberId

  await fetchTransactions()
}

async function fetchTransactions() {
  await transactions.fetch({
    ...currentPeriodRange(activeFilter.value),
    familyMemberId: activeMember.value ?? undefined,
  })
}

async function selectPeriod() {
  await fetchTransactions()
}

const showSavingsPrompt = ref(false)

async function activateSavings() {
  await profile.updatePreference('savings_enabled', true)
  ui.setSavingsPromptDismissed(true)
  showSavingsPrompt.value = false
  await savingsStore.fetchAll()
}

function dismissSavingsPrompt() {
  ui.setSavingsPromptDismissed(true)
  showSavingsPrompt.value = false
}

onMounted(async () => {
  const promises: Promise<unknown>[] = [
    categories.fetchAll(),
    family.fetchAll(),
    fetchTransactions(),
  ]

  if (profile.cashEnabled) {
    promises.push(cashStore.refresh())
  }

  await Promise.all(promises)

  if (profile.savingsEnabled) {
    await savingsStore.fetchAll()
  }

  savingsLoaded.value = true

  if (!profile.savingsEnabled && !ui.savingsPromptDismissed) {
    setTimeout(() => {
      showSavingsPrompt.value = true
    }, 1000)
  }
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div v-if="showSavingsPrompt"
        class="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-card border border-violet-100 bg-violet-50/50 text-violet-950 dark:border-violet-100/30 dark:bg-violet-950/20 dark:text-violet-200">
        <div class="flex gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100/80 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            <AppIcon name="solar:safe-2-bold-duotone" :size="22" />
          </span>

          <div>
            <h3 class="font-bold text-sm leading-snug text-content">
              {{ t('dashboard.savingsPromptTitle') }}
            </h3>

            <p class="text-xs mt-0.5 text-content-muted leading-normal">
              {{ t('dashboard.savingsPromptText') }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field text-content hover:bg-surface-muted transition-colors"
            @click="dismissSavingsPrompt">
            {{ t('dashboard.savingsPromptDismiss') }}
          </button>

          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
            @click="activateSavings">
            {{ t('dashboard.savingsPromptActivate') }}
          </button>
        </div>
      </div>

      <BalanceSummary :summary="summary" :period-label="balancePeriodLabel" :savings="savings" :cash="cash"
        :cash-period-net="cashPeriodNet" :savings-loaded="savingsLoaded" :cash-enabled="cashEnabled"
        :members="family.items" />

      <div v-if="family.items.length > 0" class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === null ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted hover:bg-line'"
          @click="selectMember(null)">
          {{ t('dashboard.allMembers') }}
        </button>

        <button v-for="member in family.items" :key="member.id"
          class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === member.id ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted hover:bg-line'"
          @click="selectMember(member.id)">
          {{ member.name }}
        </button>

      </div>

      <BaseCard v-if="limitedUsage.length" as="section">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">
          {{ t('dashboard.categoryLimits') }}
        </h2>

        <div class="space-y-4">
          <CategoryProgress v-for="usage in limitedUsage" :key="usage.category.id" :usage="usage" />
        </div>
      </BaseCard>

      <BaseCard as="section">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-content-muted m-0">
            {{ filterLabel }}
          </h2>

          <div class="relative flex items-center">
            <select v-model="activeFilter" @change="selectPeriod"
              class="appearance-none rounded-field bg-surface-muted pl-2.5 pr-7 py-1 text-xs font-medium text-content-muted border border-transparent hover:border-line focus:outline-none focus:border-primary-500 cursor-pointer transition-colors">
              <option value="day">{{ t('dashboard.filter.day') }}</option>
              <option value="week">{{ t('dashboard.filter.week') }}</option>
              <option value="month">{{ t('dashboard.filter.month') }}</option>
              <option value="year">{{ t('dashboard.filter.year') }}</option>
            </select>

            <AppIcon name="solar:alt-arrow-down-linear" :size="14"
              class="absolute right-2.5 pointer-events-none text-content-muted" />
          </div>
        </div>

        <BaseSpinner v-if="loading" />

        <EmptyState v-else-if="!filteredItems.length" icon="solar:wallet-money-bold-duotone"
          :title="t('dashboard.emptyPeriod')" />

        <ul v-else class="animate-fade-in divide-y divide-line">
          <TransactionItem v-for="transaction in filteredItems" :key="transaction.id" :transaction="transaction"
            class="cursor-pointer" @click="openEditTransaction(transaction)" />
        </ul>
      </BaseCard>
    </main>

    <button
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      :aria-label="t('dashboard.addAria')" @click="openNewTransaction">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      {{ t('common.add') }}
    </button>

    <BaseSheet v-model="showTransaction"
      :title="editingTransaction ? t('dashboard.editMovement') : t('dashboard.newMovement')"
      :has-changes="transactionFormRef?.hasChanges">
      <TransactionForm ref="transactionFormRef" :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>

  </div>
</template>
