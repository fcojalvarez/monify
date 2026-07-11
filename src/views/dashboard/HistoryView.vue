<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ROUTE_NAMES } from '@/constants'
import type { TransactionWithRelations } from '@/types'
import { transactionsService, type TransactionFilters } from '@/services/transactions.service'
import { useFamilyStore } from '@/stores/family'
import { useCategoriesStore } from '@/stores/categories'
import { formatCurrency } from '@/utils/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import TransactionItem from '@/components/transactions/TransactionItem.vue'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const family = useFamilyStore()
const categories = useCategoriesStore()

// Initialize dates: defaults to last 3 months
const initDates = () => {
  const today = new Date()
  const fromDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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

// Sheets
const showTransaction = ref(false)
const editingTransaction = ref<TransactionWithRelations | undefined>()

const filteredCategories = computed(() => {
  if (activeKind.value === 'all') {
    return categories.items
  }
  return categories.items.filter((c) => c.kind === activeKind.value)
})

const summary = computed(() => {
  const list = historyItems.value
  const income = list.filter((t) => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expense = list.filter((t) => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0)
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

    // Filter by kind (income/expense) in memory as it's not supported directly in the database filters list
    if (activeKind.value !== 'all') {
      data = data.filter((t) => t.kind === activeKind.value)
    }

    historyItems.value = data
  } catch (err) {
    console.error('Error fetching history:', err)
  } finally {
    loading.value = false
  }
}

// Watch filters
watch(
  [filterFrom, filterTo, activeMemberId, activeKind, activeCategoryId],
  () => {
    fetchHistory()
  },
)

// Clear category filter if the selected category is no longer valid for the selected kind
watch(activeKind, (newKind) => {
  if (activeCategoryId.value) {
    const selectedCat = categories.items.find((c) => c.id === activeCategoryId.value)
    if (selectedCat && newKind !== 'all' && selectedCat.kind !== newKind) {
      activeCategoryId.value = ''
    }
  }
})

function openEditTransaction(transaction: TransactionWithRelations) {
  editingTransaction.value = transaction
  showTransaction.value = true
}

async function onTransactionSaved() {
  showTransaction.value = false
  await fetchHistory()
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
  await Promise.all([categories.fetchAll(), family.fetchAll()])
  await fetchHistory()
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <AppHeader />

    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <!-- Back button and title -->
      <div class="flex items-center gap-3">
        <RouterLink :to="{ name: ROUTE_NAMES.dashboard }"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line transition-colors"
          title="Volver al Dashboard">
          <AppIcon name="solar:arrow-left-bold" :size="20" />
        </RouterLink>
        <div>
          <h1 class="text-2xl font-bold text-content">Histórico de movimientos</h1>
          <p class="text-xs text-content-muted">Consulta y filtra tus registros sin límites de tiempo</p>
        </div>
      </div>

      <!-- Filters Panel -->
      <BaseCard class="p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-line pb-2">
          <span class="text-sm font-semibold text-content">Filtros</span>
          <button type="button" class="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            @click="clearFilters">
            Limpiar filtros
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="field-label">Desde</label>
            <input type="date" v-model="filterFrom"
              class="w-full h-10 px-3 rounded-field border border-line bg-surface text-content text-sm focus-visible:ring-primary-500" />
          </div>
          <div>
            <label class="field-label">Hasta</label>
            <input type="date" v-model="filterTo"
              class="w-full h-10 px-3 rounded-field border border-line bg-surface text-content text-sm focus-visible:ring-primary-500" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Miembro -->
          <div class="relative">
            <label class="field-label">Persona</label>
            <select v-model="activeMemberId"
              class="w-full h-10 px-3 rounded-field border border-line bg-surface text-content text-sm focus-visible:ring-primary-500 appearance-none">
              <option value="">Todos</option>
              <option v-for="member in family.items" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
            <AppIcon name="solar:alt-arrow-down-linear" :size="18"
              class="pointer-events-none absolute right-3 bottom-3 text-content-secondary" />
          </div>

          <!-- Tipo -->
          <div class="relative">
            <label class="field-label">Tipo de flujo</label>
            <select v-model="activeKind"
              class="w-full h-10 pl-3 pr-10 rounded-field border border-line bg-surface text-content text-sm appearance-none focus-visible:ring-primary-500">
              <option value="all">Todos</option>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <AppIcon name="solar:alt-arrow-down-linear" :size="18"
              class="pointer-events-none absolute right-3 bottom-3 text-content-secondary" />
          </div>

          <!-- Categoría -->
          <div class="relative">
            <label class="field-label">Categoría</label>
            <select v-model="activeCategoryId"
              class="w-full h-10 pl-3 pr-10 rounded-field border border-line bg-surface text-content text-sm appearance-none focus-visible:ring-primary-500">
              <option value="">Todas</option>
              <option v-for="cat in filteredCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <AppIcon name="solar:alt-arrow-down-linear" :size="18"
              class="pointer-events-none absolute right-3 bottom-3 text-content-secondary" />
          </div>
        </div>
      </BaseCard>

      <!-- Totales del Periodo -->
      <div class="flex gap-3">
        <BaseCard v-if="['income', 'all'].includes(activeKind)"
          class="flex-1 p-4 text-center bg-surface-raised border border-line">
          <p class="text-xs font-semibold text-content-muted">Ingresos</p>
          <p class="text-lg font-bold text-income mt-1">{{ formatCurrency(summary.income) }}</p>
        </BaseCard>

        <BaseCard v-if="['expense', 'all'].includes(activeKind)"
          class="flex-1 p-4 text-center bg-surface-raised border border-line">
          <p class="text-xs font-semibold text-content-muted">Gastos</p>
          <p class="text-lg font-bold text-expense mt-1">{{ formatCurrency(summary.expense) }}</p>
        </BaseCard>

        <BaseCard class="flex-1 p-4 text-center bg-surface-raised border border-line">
          <p class="text-xs font-semibold text-content-muted">Balance neto</p>
          <p class="text-lg font-bold mt-1" :class="summary.balance >= 0 ? 'text-income' : 'text-expense'">
            {{ formatCurrency(summary.balance) }}
          </p>
        </BaseCard>
      </div>

      <!-- Listado de Movimientos -->
      <BaseCard as="section" class="p-4">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">Resultados del histórico</h2>

        <div v-if="loading" class="py-12 text-center text-sm text-content-subtle">Cargando…</div>

        <div v-else-if="!historyItems.length" class="py-12 text-center">
          <AppIcon name="solar:wallet-money-bold-duotone" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">No se encontraron movimientos con los filtros aplicados.</p>
        </div>

        <ul v-else class="divide-y divide-line">
          <TransactionItem v-for="transaction in historyItems" :key="transaction.id" :transaction="transaction"
            class="cursor-pointer hover:bg-surface-muted/30 px-2 rounded-field transition-colors"
            @click="openEditTransaction(transaction)" />
        </ul>
      </BaseCard>
    </main>

    <!-- BaseSheet para Editar Transacción -->
    <BaseSheet v-model="showTransaction" title="Editar movimiento">
      <TransactionForm :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>
  </div>
</template>
