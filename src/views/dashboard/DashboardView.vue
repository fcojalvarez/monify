<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, defineAsyncComponent } from 'vue'
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
import BaseSelect from '@/components/ui/BaseSelect.vue'
import {
  currentPeriodRange,
  type DashboardPeriod,
} from '@/utils/period'
import { useI18n } from '@/i18n'

const TransactionForm = defineAsyncComponent(() => import('@/components/transactions/TransactionForm.vue'))
const FamilyForm = defineAsyncComponent(() => import('@/components/family/FamilyForm.vue'))
const VoiceTransactionAssistant = defineAsyncComponent(() => import('@/components/transactions/VoiceTransactionAssistant.vue'))

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

const filterOptions = computed(() => [
  { value: 'day', label: t('dashboard.filter.day') },
  { value: 'week', label: t('dashboard.filter.week') },
  { value: 'month', label: t('dashboard.filter.month') },
  { value: 'year', label: t('dashboard.filter.year') },
])

const filterLabel = computed(() => t(`dashboard.movements.${activeFilter.value}`))
const balancePeriodLabel = computed(() => t(`dashboard.period.${activeFilter.value}`))

/** Neto de efectivo (entradas − salidas) del periodo activo para la tarjeta de balance. */
const cashPeriodNet = computed(() => {
  return items.value
    .filter((t) => t.payment_method === 'cash')
    .reduce((sum, t) => sum + (t.kind === 'income' ? t.amount : -t.amount), 0)
})

/** Neto del banco (entradas − salidas) del periodo activo para la tarjeta de balance. */
const bankPeriodNet = computed(() => {
  return items.value
    .filter((t) => t.payment_method !== 'cash')
    .reduce((sum, t) => sum + (t.kind === 'income' ? t.amount : -t.amount), 0)
})

const filteredItems = computed(() => items.value)

const limitedUsage = computed(() =>
  usageByCategory.value.filter((u) => u.limit != null).slice(0, 5),
)

const showTransaction = ref(false)
const editingTransaction = ref<TransactionWithRelations | undefined>()
const showVoiceAssistant = ref(false)

const isExpanded = ref(false)
const actionMenuRef = ref<HTMLElement | null>(null)

const transactionFormRef = ref<InstanceType<typeof TransactionForm> | null>(null)

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target || !target.isConnected) {
    return
  }
  if (actionMenuRef.value && !actionMenuRef.value.contains(target)) {
    isExpanded.value = false
  }
}

function handleMainClick() {
  if (!isExpanded.value) {
    isExpanded.value = true
  }
}

function triggerManual() {
  openNewTransaction()
  isExpanded.value = false
}

function triggerVoice() {
  openVoiceAssistant()
  isExpanded.value = false
}

const showAddMember = ref(false)
const familyFormRef = ref<InstanceType<typeof FamilyForm> | null>(null)

function openAddMember() {
  showAddMember.value = true
}

async function onFamilyMemberSaved() {
  showAddMember.value = false
  await family.fetchAll(true)
}

function openNewTransaction() {
  editingTransaction.value = undefined
  showTransaction.value = true
}

function openEditTransaction(transaction: TransactionWithRelations) {
  editingTransaction.value = transaction
  showTransaction.value = true
}

function openVoiceAssistant() {
  showVoiceAssistant.value = true
}

async function onTransactionSaved() {
  showTransaction.value = false
  showVoiceAssistant.value = false
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
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)

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

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-12">
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
        :cash-period-net="cashPeriodNet" :bank-period-net="bankPeriodNet" :savings-loaded="savingsLoaded"
        :cash-enabled="cashEnabled" :members="family.items" />

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

        <button
          class="shrink-0 rounded-full h-9 w-9 flex items-center justify-center bg-surface-muted text-primary-500 hover:bg-line transition-colors"
          :aria-label="t('profile.addPerson')" @click="openAddMember">
          <AppIcon name="solar:add-circle-bold" :size="24" />
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

          <div class="relative flex items-center w-28">
            <BaseSelect v-model="activeFilter" size="sm" :options="filterOptions" @update:model-value="selectPeriod" />
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

    <div
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] z-40 flex items-end gap-3 pointer-events-none">
      <Transition enter-active-class="transition duration-200 ease-out"
        leave-active-class="transition duration-150 ease-in" enter-from-class="translate-y-4 opacity-0 scale-95"
        leave-to-class="translate-y-4 opacity-0 scale-95">
        <button v-if="showScrollTop" type="button"
          class="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:scale-95 text-content transition-transform hover:bg-surface-muted mb-0 shrink-0"
          :aria-label="t('history.scrollTop')" :title="t('history.scrollTop')" @click="scrollToTop">
          <AppIcon name="solar:alt-arrow-up-bold" :size="22" />
        </button>
      </Transition>

      <div ref="actionMenuRef"
        class="pointer-events-auto relative flex flex-col justify-end items-center rounded-[28px] bg-primary-500 text-white shadow-primary-glow transition-all duration-300 ease-out select-none w-[130px] overflow-hidden"
        :class="isExpanded ? 'h-[114px]' : 'h-14 cursor-pointer hover:bg-primary-600 active:scale-95'"
        @click="handleMainClick">
        <div class="absolute inset-0 flex flex-col justify-end p-1">
          <div v-if="!isExpanded"
            class="flex h-12 items-center justify-center gap-2 transition-all duration-300 ease-out w-full">
            <AppIcon name="solar:add-circle-bold" :size="22" />
            <span class="font-semibold text-sm tracking-wide">{{ t('common.add') }}</span>
          </div>

          <!-- Expandido: Opciones Manual y Voz apiladas verticalmente con separador elegante -->
          <div v-else class="flex flex-col gap-0.5 w-full h-full justify-center p-1 animate-fade-in">
            <!-- Opción Manual -->
            <button type="button"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-[22px] hover:bg-white/10 active:scale-95 transition-all font-semibold text-xs whitespace-nowrap text-white"
              @click.stop="triggerManual">
              <AppIcon name="solar:pen-new-round-bold" :size="16" />
              <span class="font-semibold text-sm">{{ t('common.manual') }}</span>
            </button>

            <!-- Separador minimalista y elegante -->
            <div class="h-px bg-white/15 mx-3"></div>

            <!-- Opción Voz -->
            type="button"
            <button type="button"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-[22px] hover:bg-white/10 active:scale-95 transition-all font-semibold text-xs whitespace-nowrap text-white"
              @click.stop="triggerVoice">
              <AppIcon name="solar:microphone-bold" :size="16" />
              <span>{{ t('voice.buttonLabelShort') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <BaseSheet v-model="showTransaction"
      :title="editingTransaction ? t('dashboard.editMovement') : t('dashboard.newMovement')"
      :has-changes="transactionFormRef?.hasChanges">
      <TransactionForm ref="transactionFormRef" :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>

    <BaseSheet v-model="showAddMember" :title="t('profile.addPerson')" :has-changes="familyFormRef?.hasChanges">
      <FamilyForm ref="familyFormRef" @saved="onFamilyMemberSaved" @cancel="showAddMember = false" />
    </BaseSheet>

    <VoiceTransactionAssistant v-model="showVoiceAssistant" @saved="onTransactionSaved" />

  </div>
</template>
