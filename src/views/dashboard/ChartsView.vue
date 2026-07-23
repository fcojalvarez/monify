<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatCurrency } from '@/utils/format'
import { useI18n, getIntlLocale } from '@/i18n'
import { useUiStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/profile'
import { useFamilyStore } from '@/stores/family'
import { useSavingsStore } from '@/stores/savings'
import { useCashStore } from '@/stores/cash'
import { useCategoriesStore } from '@/stores/categories'
import { transactionsService } from '@/services/transactions.service'
import type { TransactionWithRelations } from '@/types'

import BaseCard from '@/components/ui/BaseCard.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import IncomeExpenseChart from '@/components/charts/IncomeExpenseChart.vue'
import SavingsChart from '@/components/charts/SavingsChart.vue'
import CashWalletsChart from '@/components/charts/CashWalletsChart.vue'

const ui = useUiStore()
const profile = useProfileStore()
const familyStore = useFamilyStore()
const savingsStore = useSavingsStore()
const cashStore = useCashStore()
const categoriesStore = useCategoriesStore()
const { t } = useI18n()

// Estado y Carga
const allTransactions = ref<TransactionWithRelations[]>([])
const loading = ref(true)

const viewMode = ref<'monthly' | 'yearly'>('monthly')
const selectedYear = ref(new Date().getFullYear())

// Constantes de meses (nombres localizados según el idioma activo)
const monthsShort = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(getIntlLocale(), { month: 'short' }).format(new Date(Date.UTC(2000, i, 1)))
)
const monthsFull = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(getIntlLocale(), { month: 'long' }).format(new Date(Date.UTC(2000, i, 1)))
)

onMounted(async () => {
  loading.value = true
  try {
    const promises: Promise<unknown>[] = [
      familyStore.fetchAll(),
      categoriesStore.fetchAll(),
      savingsStore.fetchAll(),
    ]
    if (profile.cashEnabled) {
      promises.push(cashStore.refresh())
    }
    await Promise.all(promises)
    allTransactions.value = await transactionsService.list({})
  } catch (error) {
    console.error('Error al cargar datos de gráficas:', error)
  } finally {
    loading.value = false
  }
})

// Acceso reactivo a transacciones de ahorros y efectivo
const savingsTransactions = computed(() => savingsStore.transactions)
const cashTransactions = computed(() => cashStore.transactions)

// Años Disponibles
const availableYears = computed(() => {
  const years = new Set<number>()
  years.add(new Date().getFullYear())

  for (const t of allTransactions.value) {
    if (t.occurred_on) {
      years.add(new Date(t.occurred_on).getFullYear())
    }
  }
  for (const t of savingsTransactions.value) {
    if (t.occurred_on) {
      years.add(new Date(t.occurred_on).getFullYear())
    }
  }
  for (const t of cashTransactions.value) {
    if (t.occurred_on) {
      years.add(new Date(t.occurred_on).getFullYear())
    }
  }
  return Array.from(years).sort((a, b) => b - a)
})

// Navegación de Años
function prevYear() {
  const idx = availableYears.value.indexOf(selectedYear.value)
  if (idx !== -1 && idx < availableYears.value.length - 1) {
    selectedYear.value = availableYears.value[idx + 1]
  } else {
    selectedYear.value--
  }
}

function nextYear() {
  const idx = availableYears.value.indexOf(selectedYear.value)
  if (idx !== -1 && idx > 0) {
    selectedYear.value = availableYears.value[idx - 1]
  } else {
    selectedYear.value++
  }
}

// Helpers de Fechas de Ahorro y Efectivo
function getLastDayOfMonth(year: number, month: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = new Date(year, month + 1, 0)
  return `${year}-${pad(month + 1)}-${pad(date.getDate())}`
}

// Baselines para calcular saldos históricos
const savingsBaselines = computed(() => {
  const baselines = new Map<string, number>()
  for (const account of savingsStore.items) {
    const txs = savingsTransactions.value.filter(t => t.savings_id === account.id)
    const sumTxs = txs.reduce((sum, t) => sum + t.amount, 0)
    baselines.set(account.id, account.balance - sumTxs)
  }
  return baselines
})

function getSavingsBalanceAtDate(dateStr: string, type?: 'bank' | 'cash') {
  let total = 0
  for (const account of savingsStore.items) {
    if (type && account.type !== type) continue
    const baseline = savingsBaselines.value.get(account.id) ?? 0
    const txsSum = savingsTransactions.value
      .filter(t => t.savings_id === account.id && t.occurred_on <= dateStr)
      .reduce((sum, t) => sum + t.amount, 0)
    total += (baseline + txsSum)
  }
  return total
}

const cashBaseline = computed(() => {
  if (!cashStore.account) return 0
  const sumTxs = cashTransactions.value.reduce((sum, t) => sum + t.amount, 0)
  return cashStore.balance - sumTxs
})

function getCashBalanceAtDate(dateStr: string) {
  const sumTxs = cashTransactions.value
    .filter(t => t.occurred_on <= dateStr)
    .reduce((sum, t) => sum + t.amount, 0)
  return cashBaseline.value + sumTxs
}

function getMemberCashBalanceAtDate(memberId: string, dateStr: string) {
  return cashTransactions.value
    .filter(t => t.family_member_id === memberId && t.occurred_on <= dateStr)
    .reduce((sum, t) => sum + t.amount, 0)
}

// Datos Gráfica 1: Ingresos y Gastos
const incomeExpensesData = computed(() => {
  if (viewMode.value === 'monthly') {
    const data = Array.from({ length: 12 }, (_, i) => ({
      label: monthsShort[i],
      fullLabel: monthsFull[i] + ' ' + selectedYear.value,
      income: 0,
      expense: 0,
      balance: 0,
    }))

    for (const t of allTransactions.value) {
      if (!t.occurred_on) continue
      const date = new Date(t.occurred_on)
      if (date.getFullYear() !== selectedYear.value) continue
      const month = date.getMonth()
      if (t.kind === 'income') {
        data[month].income += t.amount
      } else if (t.kind === 'expense') {
        data[month].expense += t.amount
      }
    }

    for (const item of data) {
      item.balance = item.income - item.expense
    }
    return data
  } else {
    // Modo anual
    const years = [...availableYears.value].sort((a, b) => a - b)
    return years.map(year => {
      let income = 0
      let expense = 0
      for (const t of allTransactions.value) {
        if (!t.occurred_on) continue
        const date = new Date(t.occurred_on)
        if (date.getFullYear() === year) {
          if (t.kind === 'income') {
            income += t.amount
          } else if (t.kind === 'expense') {
            expense += t.amount
          }
        }
      }
      return {
        label: String(year),
        fullLabel: t('charts.yearLabel', { year }),
        income,
        expense,
        balance: income - expense
      }
    })
  }
})

const periodMetrics = computed(() => {
  const data = incomeExpensesData.value
  const income = data.reduce((sum, item) => sum + item.income, 0)
  const expense = data.reduce((sum, item) => sum + item.expense, 0)
  const balance = income - expense
  const rate = income > 0 ? Math.round((balance / income) * 100) : 0
  return { income, expense, balance, rate }
})

// Datos Gráfica 2: Evolución de Ahorros
const savingsEvolutionData = computed(() => {
  return incomeExpensesData.value.map((d, i) => {
    let dateStr = ''
    if (viewMode.value === 'monthly') {
      dateStr = getLastDayOfMonth(selectedYear.value, i)
    } else {
      dateStr = `${d.label}-12-31`
    }

    const bank = getSavingsBalanceAtDate(dateStr, 'bank')
    const cash = getSavingsBalanceAtDate(dateStr, 'cash')
    const total = bank + cash

    return {
      label: d.label,
      fullLabel: d.fullLabel,
      bank,
      cash,
      total,
    }
  })
})

// Datos Gráfica 3: Evolución de Efectivo y Carteras
const cashEvolutionData = computed(() => {
  return incomeExpensesData.value.map((d, i) => {
    let dateStr = ''
    if (viewMode.value === 'monthly') {
      dateStr = getLastDayOfMonth(selectedYear.value, i)
    } else {
      dateStr = `${d.label}-12-31`
    }

    const total = getCashBalanceAtDate(dateStr)
    const members = familyStore.items.map(m => ({
      id: m.id,
      name: m.name,
      color: m.color,
      balance: getMemberCashBalanceAtDate(m.id, dateStr)
    }))

    return {
      label: d.label,
      fullLabel: d.fullLabel,
      total,
      members
    }
  })
})

// Donut de carteras (Distribución actual)
const walletDistribution = computed(() => {
  const list = familyStore.items.map(m => {
    const balance = cashStore.memberBalance(m.id)
    return {
      id: m.id,
      name: m.name,
      color: m.color,
      avatar: m.avatar_icon,
      balance
    }
  }).sort((a, b) => b.balance - a.balance)

  const total = list.reduce((sum, item) => sum + item.balance, 0)

  let accumulatedPercent = 0
  const r = 38
  const circ = 2 * Math.PI * r // ~238.76

  return list.map(item => {
    const percent = total > 0 ? item.balance / total : 0
    const strokeLength = percent * circ
    const strokeOffset = -accumulatedPercent * circ
    accumulatedPercent += percent

    return {
      ...item,
      percent: total > 0 ? Math.round(percent * 100) : 0,
      strokeLength,
      strokeOffset,
      circ
    }
  })
})

// Desglose de Gastos por Categoría
const categoryBreakdown = computed(() => {
  const map = new Map<string, { category: { id: string; name: string; color: string; icon: string }; spent: number }>()
  let totalSpent = 0

  for (const tx of allTransactions.value) {
    if (tx.kind !== 'expense') continue
    if (!tx.occurred_on) continue
    const date = new Date(tx.occurred_on)
    if (viewMode.value === 'monthly' && date.getFullYear() !== selectedYear.value) continue

    totalSpent += tx.amount
    const catId = tx.category_id || 'unassigned'
    const existing = map.get(catId)

    if (existing) {
      existing.spent += tx.amount
    } else {
      map.set(catId, {
        category: tx.category || {
          id: 'unassigned',
          name: t('charts.uncategorized'),
          color: '#8a91ad',
          icon: 'solar:tag-bold'
        },
        spent: tx.amount
      })
    }
  }

  const list = Array.from(map.values()).map(item => {
    const percent = totalSpent > 0 ? Math.round((item.spent / totalSpent) * 100) : 0
    return {
      ...item,
      percent
    }
  }).sort((a, b) => b.spent - a.spent)

  return { list, totalSpent }
})


</script>

<template>
  <div class="min-h-dvh bg-surface pb-12">
    <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-2xl font-bold text-content">
              {{ t('charts.pageTitle') }}
            </h1>
            <p class="text-xs text-content-muted">
              {{ t('charts.pageSubtitle') }}
            </p>
          </div>
        </div>

        <div class="w-full sm:w-48 shrink-0">
          <SegmentedControl v-model="viewMode" :options="[
            { value: 'monthly', label: t('charts.monthly') },
            { value: 'yearly', label: t('charts.yearly') }
          ]" />
        </div>
      </div>

      <BaseSpinner v-if="loading" :message="t('charts.loadingStats')" :size="40" class="py-24" />

      <div v-else-if="!allTransactions.length" class="text-center py-16">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-content-subtle">
          <AppIcon name="solar:chart-2-bold" :size="32" />
        </div>
        <h3 class="mt-4 text-base font-bold text-content">{{ t('charts.emptyTitle') }}</h3>
        <p class="mt-2 text-sm text-content-muted max-w-sm mx-auto">
          {{ t('charts.emptySubtitle') }}
        </p>
      </div>

      <div v-else class="animate-fade-in space-y-6">
        <div v-if="viewMode === 'monthly'"
          class="flex items-center justify-between rounded-card border border-line bg-surface-raised p-4">
          <div class="text-sm font-semibold text-content">
            {{ t('charts.queryPeriod') }}
          </div>

          <div class="flex items-center gap-3">
            <button type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content active:scale-95 transition-all"
              :title="t('charts.prevYear')" @click="prevYear">
              <AppIcon name="solar:arrow-left-bold" :size="16" />
            </button>

            <span class="text-lg font-bold text-content w-16 text-center select-none">
              {{ selectedYear }}
            </span>

            <button type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content active:scale-95 transition-all"
              :title="t('charts.nextYear')" @click="nextYear">
              <AppIcon name="solar:arrow-right-bold" :size="16" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">{{ t('summary.income') }}</p>
            <p class="mt-1 text-lg font-extrabold text-income">
              {{ formatCurrency(periodMetrics.income, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">{{ t('summary.expense') }}
            </p>
            <p class="mt-1 text-lg font-extrabold text-expense">
              {{ formatCurrency(periodMetrics.expense, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">{{ t('charts.netSavings') }}
            </p>
            <p class="mt-1 text-lg font-extrabold"
              :class="periodMetrics.balance >= 0 ? 'text-content' : 'text-expense'">
              {{ periodMetrics.balance >= 0 ? '+' : '' }}{{ formatCurrency(periodMetrics.balance, {
                currency:
                  ui.currency
              }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">{{ t('charts.savingsRate') }}
            </p>
            <p class="mt-1 text-lg font-extrabold text-primary-500">
              {{ periodMetrics.rate }}%
            </p>
          </div>
        </div>

        <IncomeExpenseChart :data="incomeExpensesData" />

        <SavingsChart v-if="profile.savingsEnabled" :data="savingsEvolutionData" />

        <CashWalletsChart v-if="profile.cashEnabled" :data="cashEvolutionData" :distribution="walletDistribution"
          :total-cash="cashStore.balance" :currency="ui.currency" />

        <BaseCard class="space-y-4">
          <div>
            <h2 class="text-base font-bold text-content">{{ t('charts.categoryBreakdownTitle') }}</h2>
            <p class="text-xs text-content-muted mt-0.5">
              {{ t('charts.categoryBreakdownSubtitle') }}
            </p>
          </div>

          <div class="flex items-center justify-between p-3 rounded-field border-2 border-expense/20">
            <span class="text-xs font-semibold text-content-muted">{{ t('charts.totalSpent') }}</span>
            <span class="text-sm font-bold text-expense">
              {{ formatCurrency(categoryBreakdown.totalSpent, { currency: ui.currency }) }}
            </span>
          </div>

          <div v-if="!categoryBreakdown.list.length" class="text-center py-8 text-xs text-content-subtle">
            {{ t('charts.noExpensesPeriod') }}
          </div>

          <div v-else class="space-y-4">
            <div v-for="item in categoryBreakdown.list" :key="item.category.id" class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-bold">
                <div class="flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full text-white"
                    :style="{ backgroundColor: item.category.color }">
                    <AppIcon :name="item.category.icon || 'solar:tag-bold'" :size="12" />
                  </span>
                  <span class="text-content font-semibold">{{ item.category.name }}</span>
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-content-muted font-medium">{{ item.percent }}%</span>
                  <span class="text-content font-extrabold">{{ formatCurrency(item.spent) }}</span>
                </div>
              </div>

              <div class="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 ease-out" :style="{
                  width: `${item.percent}%`,
                  backgroundColor: item.category.color
                }" />
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </main>
  </div>
</template>
