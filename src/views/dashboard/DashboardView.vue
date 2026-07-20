<script setup lang="ts">
import { computed, onMounted, ref, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import type { TransactionWithRelations } from '@/types'
import { useAuthStore } from '@/stores/auth'
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
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  currentPeriodRange,
  dashboardMovementLabels,
  dashboardPeriodLabels,
  type DashboardPeriod,
} from '@/utils/period'

const TransactionForm = defineAsyncComponent(() => import('@/components/transactions/TransactionForm.vue'))

const auth = useAuthStore()
const profile = useProfileStore()
const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()
const savingsStore = useSavingsStore()
const cashStore = useCashStore()
const ui = useUiStore()

const { summary, usageByCategory, items, loading } = storeToRefs(transactions)
const { items: savings } = storeToRefs(savingsStore)
const { cashEnabled } = storeToRefs(profile)
const { balance: cash } = storeToRefs(cashStore)

const savingsLoaded = ref(false)
const activeMember = ref<string | null>(null)
const activeFilter = ref<DashboardPeriod>('day')

const filterLabel = computed(() => dashboardMovementLabels[activeFilter.value])
const balancePeriodLabel = computed(() => dashboardPeriodLabels[activeFilter.value])

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
    await cashStore.fetch()
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
  const promises: Promise<any>[] = [
    categories.fetchAll(),
    family.fetchAll(),
    fetchTransactions(),
  ]

  if (profile.cashEnabled) {
    promises.push(cashStore.fetch())
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
              ¡Nueva función de ahorros!
            </h3>

            <p class="text-xs mt-0.5 text-content-muted leading-normal">
              Organiza tus ahorros, fija metas y aparta dinero de tu cuenta principal de forma muy sencilla.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field text-content hover:bg-surface-muted transition-colors"
            @click="dismissSavingsPrompt">
            No, gracias
          </button>

          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
            @click="activateSavings">
            Activar ahorros
          </button>
        </div>
      </div>

      <BalanceSummary :summary="summary" :period-label="balancePeriodLabel" :savings="savings" :cash="cash"
        :savings-loaded="savingsLoaded" :cash-enabled="cashEnabled" :members="family.items" />

      <div v-if="family.items.length > 0" class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === null ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted hover:bg-line'"
          @click="selectMember(null)">
          Todos
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
          Límites por categoría
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
              <option value="day">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="year">Este año</option>
            </select>

            <AppIcon name="solar:alt-arrow-down-linear" :size="14"
              class="absolute right-2.5 pointer-events-none text-content-muted" />
          </div>
        </div>

        <div v-if="loading" class="py-10 text-center text-sm text-content-subtle">
          Cargando…
        </div>

        <div v-else-if="!filteredItems.length" class="py-10 text-center">
          <AppIcon name="solar:wallet-money-bold-duotone" :size="40" class="mx-auto text-content-subtle" />

          <p class="mt-2 text-sm text-content-muted">
            Aún no hay movimientos en este periodo.
          </p>
        </div>

        <ul v-else class="divide-y divide-line">
          <TransactionItem v-for="transaction in filteredItems" :key="transaction.id" :transaction="transaction"
            class="cursor-pointer" @click="openEditTransaction(transaction)" />
        </ul>
      </BaseCard>
    </main>

    <button
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      aria-label="Añadir movimiento" @click="openNewTransaction">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      Añadir
    </button>

    <BaseSheet v-model="showTransaction" :title="editingTransaction ? 'Editar movimiento' : 'Nuevo movimiento'"
      :has-changes="transactionFormRef?.hasChanges">
      <TransactionForm ref="transactionFormRef" :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>

  </div>
</template>
