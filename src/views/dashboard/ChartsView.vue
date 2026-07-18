<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatCurrency } from '@/utils/format'
import { useUiStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/profile'
import { useFamilyStore } from '@/stores/family'
import { useSavingsStore } from '@/stores/savings'
import { useCashStore } from '@/stores/cash'
import { useCategoriesStore } from '@/stores/categories'
import { transactionsService } from '@/services/transactions.service'

import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNavigation from '@/components/layout/BottomNavigation.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const ui = useUiStore()
const profile = useProfileStore()
const familyStore = useFamilyStore()
const savingsStore = useSavingsStore()
const cashStore = useCashStore()
const categoriesStore = useCategoriesStore()

/* ----------------------------------------------------------
 * Estado y Carga
 * ---------------------------------------------------------- */
const allTransactions = ref<any[]>([])
const loading = ref(true)

const viewMode = ref<'monthly' | 'yearly'>('monthly')
const selectedYear = ref(new Date().getFullYear())
const savingsFilter = ref<'all' | 'bank' | 'cash'>('all')

// Índices seleccionados/hover para interactividad de gráficas
const hoveredIncExpIdx = ref<number | null>(null)
const hoveredSavingsIdx = ref<number | null>(null)
const hoveredCashIdx = ref<number | null>(null)

// Constantes de meses
const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const monthsFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

onMounted(async () => {
  loading.value = true
  try {
    const promises: Promise<any>[] = [
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

/* ----------------------------------------------------------
 * Años Disponibles
 * ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
 * Navegación de Años
 * ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
 * Helpers de Fechas de Ahorro y Efectivo
 * ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
 * Datos Gráfica 1: Ingresos y Gastos
 * ---------------------------------------------------------- */
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
        fullLabel: 'Año ' + year,
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

/* ----------------------------------------------------------
 * Datos Gráfica 2: Evolución de Ahorros
 * ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
 * Datos Gráfica 3: Evolución de Efectivo y Carteras
 * ---------------------------------------------------------- */
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

/* ----------------------------------------------------------
 * Desglose de Gastos por Categoría
 * ---------------------------------------------------------- */
const categoryBreakdown = computed(() => {
  const map = new Map<string, { category: any; spent: number }>()
  let totalSpent = 0

  for (const t of allTransactions.value) {
    if (t.kind !== 'expense') continue
    if (!t.occurred_on) continue
    const date = new Date(t.occurred_on)
    if (viewMode.value === 'monthly' && date.getFullYear() !== selectedYear.value) continue

    totalSpent += t.amount
    const catId = t.category_id || 'unassigned'
    const existing = map.get(catId)

    if (existing) {
      existing.spent += t.amount
    } else {
      map.set(catId, {
        category: t.category || {
          id: 'unassigned',
          name: 'Sin categoría',
          color: '#8a91ad',
          icon: 'solar:tag-bold'
        },
        spent: t.amount
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

/* ----------------------------------------------------------
 * Geometría y Coordenadas para SVG
 * ---------------------------------------------------------- */
// Configuración común de gráficas SVG
const svgW = 500
const svgH = 200
const padL = 50
const padR = 15
const padT = 20
const padB = 30
const chartW = svgW - padL - padR
const chartH = svgH - padT - padB

// --- Gráfica 1: Máximos y Escalado ---
const maxIncExp = computed(() => {
  const values = incomeExpensesData.value.flatMap(d => [d.income, d.expense])
  const max = Math.max(...values, 100)
  const order = Math.pow(10, Math.floor(Math.log10(max)))
  const factor = order / 2
  return Math.ceil(max / factor) * factor
})

// --- Gráfica 2: Máximos y Escalado ---
const maxSavings = computed(() => {
  const values = savingsEvolutionData.value.flatMap(d => {
    if (savingsFilter.value === 'bank') return [d.bank]
    if (savingsFilter.value === 'cash') return [d.cash]
    return [d.total, d.bank, d.cash]
  })
  const max = Math.max(...values, 100)
  const order = Math.pow(10, Math.floor(Math.log10(max)))
  const factor = order / 2
  return Math.ceil(max / factor) * factor
})

// --- Gráfica 3: Máximos y Escalado ---
const maxCash = computed(() => {
  const values = cashEvolutionData.value.flatMap(d => [d.total, ...d.members.map(m => m.balance)])
  const max = Math.max(...values, 100)
  const order = Math.pow(10, Math.floor(Math.log10(max)))
  const factor = order / 2
  return Math.ceil(max / factor) * factor
})

// --- Rutas de Línea y Áreas de Ahorros ---
const savingsPaths = computed(() => {
  const data = savingsEvolutionData.value
  const N = data.length
  const max = maxSavings.value

  if (N <= 1) return { totalLine: '', bankLine: '', cashLine: '', totalArea: '', bankArea: '', cashArea: '' }

  const totalPts: { x: number; y: number }[] = []
  const bankPts: { x: number; y: number }[] = []
  const cashPts: { x: number; y: number }[] = []

  for (let i = 0; i < N; i++) {
    const x = padL + (i / (N - 1)) * chartW
    const d = data[i]
    totalPts.push({ x, y: padT + chartH - (d.total / max) * chartH })
    bankPts.push({ x, y: padT + chartH - (d.bank / max) * chartH })
    cashPts.push({ x, y: padT + chartH - (d.cash / max) * chartH })
  }

  const linePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const areaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    const base = padT + chartH
    return `${linePath(pts)} L ${pts[pts.length - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z`
  }

  return {
    totalLine: linePath(totalPts),
    bankLine: linePath(bankPts),
    cashLine: linePath(cashPts),
    totalArea: areaPath(totalPts),
    bankArea: areaPath(bankPts),
    cashArea: areaPath(cashPts)
  }
})

// --- Rutas de Línea de Efectivo ---
const cashPaths = computed(() => {
  const data = cashEvolutionData.value
  const N = data.length
  const max = maxCash.value

  if (N <= 1) return { totalLine: '', totalArea: '', members: [] }

  const totalPts: { x: number; y: number }[] = []
  const memberPtsMap = new Map<string, { x: number; y: number }[]>()

  for (const m of familyStore.items) {
    memberPtsMap.set(m.id, [])
  }

  for (let i = 0; i < N; i++) {
    const x = padL + (i / (N - 1)) * chartW
    const d = data[i]
    totalPts.push({ x, y: padT + chartH - (d.total / max) * chartH })

    for (const mb of d.members) {
      memberPtsMap.get(mb.id)?.push({
        x,
        y: padT + chartH - (mb.balance / max) * chartH
      })
    }
  }

  const linePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const areaPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    const base = padT + chartH
    return `${linePath(pts)} L ${pts[pts.length - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z`
  }

  const members = familyStore.items.map(m => ({
    id: m.id,
    name: m.name,
    color: m.color,
    linePath: linePath(memberPtsMap.get(m.id) ?? [])
  }))

  return {
    totalLine: linePath(totalPts),
    totalArea: areaPath(totalPts),
    members
  }
})

// Helper para X de elementos agrupados (Gráfica de barras)
const getBarGroupX = (index: number, total: number) => {
  const step = chartW / total
  return padL + (index + 0.5) * step
}

// Helper para obtener porcentaje X en tooltip flotante
const getXPercent = (index: number, total: number) => {
  const x = padL + (index / (total - 1)) * chartW
  return (x / svgW) * 100
}
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <AppHeader />

    <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <!-- Cabecera de Página -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-2xl font-bold text-content">
              Análisis y Gráficas
            </h1>
            <p class="text-xs text-content-muted">
              Evolución mensual y anual de tus finanzas
            </p>
          </div>
        </div>

        <!-- Segmented Control de Rango -->
        <div class="w-full sm:w-48 shrink-0">
          <SegmentedControl v-model="viewMode" :options="[
            { value: 'monthly', label: 'Mensual' },
            { value: 'yearly', label: 'Anual' }
          ]" />
        </div>
      </div>

      <!-- Spinner de carga -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 space-y-4">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-500" />
        <p class="text-sm text-content-muted font-medium">Cargando estadísticas...</p>
      </div>

      <div v-else-if="!allTransactions.length" class="text-center py-16">
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-content-subtle">
          <AppIcon name="solar:chart-2-bold" :size="32" />
        </div>
        <h3 class="mt-4 text-base font-bold text-content">No hay datos suficientes</h3>
        <p class="mt-2 text-sm text-content-muted max-w-sm mx-auto">
          Añade movimientos de gastos, ingresos, ahorros o efectivo para ver su evolución visual.
        </p>
      </div>

      <div v-else class="space-y-6">
        <!-- Selector de Año (Solo para vista Mensual) -->
        <div v-if="viewMode === 'monthly'"
          class="flex items-center justify-between rounded-card border border-line bg-surface-raised p-4">
          <div class="text-sm font-semibold text-content">
            Periodo de consulta
          </div>

          <div class="flex items-center gap-3">
            <button type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content active:scale-95 transition-all"
              title="Año anterior" @click="prevYear">
              <AppIcon name="solar:arrow-left-bold" :size="16" />
            </button>

            <span class="text-lg font-bold text-content w-16 text-center select-none">
              {{ selectedYear }}
            </span>

            <button type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content active:scale-95 transition-all"
              title="Año siguiente" @click="nextYear">
              <AppIcon name="solar:arrow-right-bold" :size="16" />
            </button>
          </div>
        </div>

        <!-- Tarjetas de Métricas Generales -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">Ingresos</p>
            <p class="mt-1 text-lg font-extrabold text-income">
              {{ formatCurrency(periodMetrics.income, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">Gastos</p>
            <p class="mt-1 text-lg font-extrabold text-expense">
              {{ formatCurrency(periodMetrics.expense, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">Ahorro Neto</p>
            <p class="mt-1 text-lg font-extrabold"
              :class="periodMetrics.balance >= 0 ? 'text-content' : 'text-expense'">
              {{ periodMetrics.balance >= 0 ? '+' : '' }}{{ formatCurrency(periodMetrics.balance, {
                currency:
                  ui.currency
              }) }}
            </p>
          </div>

          <div class="rounded-card border border-line bg-surface-raised p-4">
            <p class="text-2xs font-semibold uppercase tracking-wider text-content-subtle">Tasa de Ahorro</p>
            <p class="mt-1 text-lg font-extrabold text-primary-500">
              {{ periodMetrics.rate }}%
            </p>
          </div>
        </div>

        <!-- Gráfica 1: Ingresos vs Gastos -->
        <BaseCard class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-content">Evolución de Ingresos y Gastos</h2>
              <p class="text-xs text-content-muted mt-0.5">
                Comparativa de entrada y salida de fondos
              </p>
            </div>

            <!-- Leyenda flotante -->
            <div class="flex items-center gap-3 text-xs">
              <span class="flex items-center gap-1.5 font-medium text-content-muted">
                <span class="h-2.5 w-2.5 rounded-full bg-income" />
                Ingresos
              </span>
              <span class="flex items-center gap-1.5 font-medium text-content-muted">
                <span class="h-2.5 w-2.5 rounded-full bg-expense" />
                Gastos
              </span>
            </div>
          </div>

          <!-- Info interactiva -->
          <div
            class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
            <span v-if="hoveredIncExpIdx === null">
              Pasa el cursor sobre las barras para ver detalles
            </span>
            <span v-else class="flex justify-between w-full">
              <span>{{ incomeExpensesData[hoveredIncExpIdx].fullLabel }}</span>
              <span class="flex gap-4">
                <span class="text-income">Ingreso: {{ formatCurrency(incomeExpensesData[hoveredIncExpIdx].income)
                }}</span>
                <span class="text-expense">Gasto: {{ formatCurrency(incomeExpensesData[hoveredIncExpIdx].expense)
                }}</span>
                <span :class="incomeExpensesData[hoveredIncExpIdx].balance >= 0 ? 'text-content' : 'text-expense'">
                  Neto: {{ incomeExpensesData[hoveredIncExpIdx].balance >= 0 ? '+' : '' }}{{
                    formatCurrency(incomeExpensesData[hoveredIncExpIdx].balance) }}
                </span>
              </span>
            </span>
          </div>

          <!-- SVG Chart -->
          <div class="relative overflow-visible">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="w-full h-auto overflow-visible">
              <!-- Rejilla y Guías de Eje Y -->
              <g stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3">
                <line :x1="padL" :y1="padT" :x2="svgW - padR" :y2="padT" />
                <line :x1="padL" :y1="padT + chartH * 0.5" :x2="svgW - padR" :y2="padT + chartH * 0.5" />
                <line :x1="padL" :y1="padT + chartH" :x2="svgW - padR" :y2="padT + chartH" />
              </g>

              <!-- Etiquetas del Eje Y -->
              <g fill="var(--content-subtle)" font-size="9" text-anchor="end" font-weight="bold">
                <text :x="padL - 8" :y="padT + 3">{{ formatCurrency(maxIncExp, { signDisplay: 'never' }) }}</text>
                <text :x="padL - 8" :y="padT + chartH * 0.5 + 3">{{ formatCurrency(maxIncExp * 0.5, {
                  signDisplay:
                    'never'
                }) }}</text>
                <text :x="padL - 8" :y="padT + chartH + 3">{{ formatCurrency(0, { signDisplay: 'never' }) }}</text>
              </g>

              <!-- Barras -->
              <g v-for="(item, idx) in incomeExpensesData" :key="idx">
                <!-- Columna de enfoque/hover -->
                <rect v-if="hoveredIncExpIdx === idx"
                  :x="getBarGroupX(idx, incomeExpensesData.length) - (chartW / incomeExpensesData.length) / 2"
                  :y="padT - 5" :width="chartW / incomeExpensesData.length" :height="chartH + 10"
                  fill="var(--surface-muted)" rx="6" opacity="0.5" />

                <!-- Barra Ingreso -->
                <rect
                  :x="getBarGroupX(idx, incomeExpensesData.length) - (Math.max(2, (chartW / incomeExpensesData.length) * 0.35)) - 1"
                  :y="padT + chartH - ((item.income / maxIncExp) * chartH)"
                  :width="Math.max(2, (chartW / incomeExpensesData.length) * 0.35)"
                  :height="(item.income / maxIncExp) * chartH" fill="#00b894" rx="2"
                  class="transition-all duration-300" />

                <!-- Barra Gasto -->
                <rect :x="getBarGroupX(idx, incomeExpensesData.length) + 1"
                  :y="padT + chartH - ((item.expense / maxIncExp) * chartH)"
                  :width="Math.max(2, (chartW / incomeExpensesData.length) * 0.35)"
                  :height="(item.expense / maxIncExp) * chartH" fill="#f5492a" rx="2"
                  class="transition-all duration-300" />
              </g>

              <!-- Etiquetas del Eje X -->
              <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
                <text v-for="(item, idx) in incomeExpensesData" :key="idx"
                  :x="getBarGroupX(idx, incomeExpensesData.length)" :y="padT + chartH + 18">
                  {{ item.label }}
                </text>
              </g>

              <!-- Capa interactiva de rects transparentes -->
              <rect v-for="(item, idx) in incomeExpensesData" :key="'hover-' + idx"
                :x="getBarGroupX(idx, incomeExpensesData.length) - (chartW / incomeExpensesData.length) / 2" :y="padT"
                :width="chartW / incomeExpensesData.length" :height="chartH" fill="transparent" class="cursor-pointer"
                @mouseenter="hoveredIncExpIdx = idx" @mouseleave="hoveredIncExpIdx = null" />
            </svg>
          </div>
        </BaseCard>

        <!-- Gráfica 2: Evolución de Ahorros -->
        <BaseCard v-if="profile.savingsEnabled" class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-content">Evolución de Ahorros</h2>
              <p class="text-xs text-content-muted mt-0.5">
                Crecimiento acumulado de fondos de ahorro
              </p>
            </div>

            <!-- Toggles de Gráfica (Banco, Efectivo, Todo) -->
            <div class="flex rounded-field bg-surface-muted p-0.5 text-2xs font-bold w-full sm:w-fit">
              <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
                :class="savingsFilter === 'all' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
                @click="savingsFilter = 'all'">
                Total
              </button>
              <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
                :class="savingsFilter === 'bank' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
                @click="savingsFilter = 'bank'">
                Banco
              </button>
              <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
                :class="savingsFilter === 'cash' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
                @click="savingsFilter = 'cash'">
                Efectivo
              </button>
            </div>
          </div>

          <!-- Info interactiva -->
          <div
            class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
            <span v-if="hoveredSavingsIdx === null">
              Pasa el cursor sobre la gráfica para ver saldos históricos
            </span>
            <span v-else class="flex justify-between w-full">
              <span>Saldo a fin de {{ savingsEvolutionData[hoveredSavingsIdx].fullLabel }}</span>
              <span class="flex gap-4">
                <span v-if="savingsFilter === 'all' || savingsFilter === 'bank'" class="text-violet-500">Banco: {{
                  formatCurrency(savingsEvolutionData[hoveredSavingsIdx].bank) }}</span>
                <span v-if="savingsFilter === 'all' || savingsFilter === 'cash'" class="text-amber-500">Efectivo: {{
                  formatCurrency(savingsEvolutionData[hoveredSavingsIdx].cash) }}</span>
                <span class="text-primary-500">Total: {{ formatCurrency(savingsEvolutionData[hoveredSavingsIdx].total)
                }}</span>
              </span>
            </span>
          </div>

          <!-- SVG Area & Line Chart -->
          <div class="relative overflow-visible">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="w-full h-auto overflow-visible">
              <!-- Defs para Gradientes -->
              <defs>
                <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#00b894" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#00b894" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="grad-bank" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="grad-cash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
                </linearGradient>
              </defs>

              <!-- Rejilla Eje Y -->
              <g stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3">
                <line :x1="padL" :y1="padT" :x2="svgW - padR" :y2="padT" />
                <line :x1="padL" :y1="padT + chartH * 0.5" :x2="svgW - padR" :y2="padT + chartH * 0.5" />
                <line :x1="padL" :y1="padT + chartH" :x2="svgW - padR" :y2="padT + chartH" />
              </g>

              <!-- Etiquetas Eje Y -->
              <g fill="var(--content-subtle)" font-size="9" text-anchor="end" font-weight="bold">
                <text :x="padL - 8" :y="padT + 3">{{ formatCurrency(maxSavings, { signDisplay: 'never' }) }}</text>
                <text :x="padL - 8" :y="padT + chartH * 0.5 + 3">{{ formatCurrency(maxSavings * 0.5, {
                  signDisplay:
                    'never'
                }) }}</text>
                <text :x="padL - 8" :y="padT + chartH + 3">{{ formatCurrency(0, { signDisplay: 'never' }) }}</text>
              </g>

              <!-- Áreas y Líneas -->
              <!-- Caso 1: Todo el ahorro -->
              <g v-if="savingsFilter === 'all'">
                <path :d="savingsPaths.totalArea" fill="url(#grad-total)" />
                <path :d="savingsPaths.bankLine" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 3"
                  opacity="0.6" />
                <path :d="savingsPaths.cashLine" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3"
                  opacity="0.6" />
                <path :d="savingsPaths.totalLine" fill="none" stroke="#00b894" stroke-width="3" stroke-linecap="round"
                  stroke-linejoin="round" />
              </g>

              <!-- Caso 2: Banco -->
              <g v-else-if="savingsFilter === 'bank'">
                <path :d="savingsPaths.bankArea" fill="url(#grad-bank)" />
                <path :d="savingsPaths.bankLine" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"
                  stroke-linejoin="round" />
              </g>

              <!-- Caso 3: Efectivo -->
              <g v-else-if="savingsFilter === 'cash'">
                <path :d="savingsPaths.cashArea" fill="url(#grad-cash)" />
                <path :d="savingsPaths.cashLine" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"
                  stroke-linejoin="round" />
              </g>

              <!-- Focus Vertical Line -->
              <g v-if="hoveredSavingsIdx !== null">
                <line :x1="padL + (hoveredSavingsIdx / (savingsEvolutionData.length - 1)) * chartW" :y1="padT"
                  :x2="padL + (hoveredSavingsIdx / (savingsEvolutionData.length - 1)) * chartW" :y2="padT + chartH"
                  stroke="var(--line-strong)" stroke-width="1.5" />

                <!-- Puntos sobre las líneas -->
                <!-- Punto Total -->
                <circle v-if="savingsFilter === 'all'"
                  :cx="padL + (hoveredSavingsIdx / (savingsEvolutionData.length - 1)) * chartW"
                  :cy="padT + chartH - ((savingsEvolutionData[hoveredSavingsIdx].total / maxSavings) * chartH)" r="5"
                  fill="#00b894" stroke="white" stroke-width="1.5" />
                <!-- Punto Banco -->
                <circle v-if="savingsFilter === 'bank' || savingsFilter === 'all'"
                  :cx="padL + (hoveredSavingsIdx / (savingsEvolutionData.length - 1)) * chartW"
                  :cy="padT + chartH - ((savingsEvolutionData[hoveredSavingsIdx].bank / maxSavings) * chartH)" r="5"
                  fill="#8b5cf6" stroke="white" stroke-width="1.5" />
                <!-- Punto Efectivo -->
                <circle v-if="savingsFilter === 'cash' || savingsFilter === 'all'"
                  :cx="padL + (hoveredSavingsIdx / (savingsEvolutionData.length - 1)) * chartW"
                  :cy="padT + chartH - ((savingsEvolutionData[hoveredSavingsIdx].cash / maxSavings) * chartH)" r="5"
                  fill="#f59e0b" stroke="white" stroke-width="1.5" />
              </g>

              <!-- Eje X etiquetas -->
              <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
                <text v-for="(item, idx) in savingsEvolutionData" :key="idx"
                  :x="padL + (idx / (savingsEvolutionData.length - 1)) * chartW" :y="padT + chartH + 18">
                  {{ item.label }}
                </text>
              </g>

              <!-- Zonas interactivas transparentes -->
              <rect v-for="(item, idx) in savingsEvolutionData" :key="'sav-hover-' + idx" :x="idx === 0
                ? padL
                : padL + ((idx - 0.5) / (savingsEvolutionData.length - 1)) * chartW" :y="padT" :width="idx === 0 || idx === savingsEvolutionData.length - 1
                  ? (chartW / (savingsEvolutionData.length - 1)) / 2
                  : chartW / (savingsEvolutionData.length - 1)" :height="chartH" fill="transparent"
                class="cursor-pointer" @mouseenter="hoveredSavingsIdx = idx" @mouseleave="hoveredSavingsIdx = null" />
            </svg>
          </div>
        </BaseCard>

        <!-- Gráfica 3: Efectivo y Carteras Familiares -->
        <BaseCard v-if="profile.cashEnabled" class="space-y-6">
          <div>
            <h2 class="text-base font-bold text-content">Mi Efectivo y Carteras</h2>
            <p class="text-xs text-content-muted mt-0.5">
              Estado de las carteras físicas de los miembros de la familia
            </p>
          </div>

          <!-- Seccion Distribución Donut + Listado de Carteras -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <!-- Gráfica Donut -->
            <div class="md:col-span-5 flex justify-center">
              <div class="relative w-44 h-44">
                <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="38" stroke="var(--surface-muted)" stroke-width="10" fill="none" />
                  <!-- Slices -->
                  <circle v-for="slice in walletDistribution" :key="slice.id" cx="50" cy="50" r="38"
                    :stroke="slice.color" stroke-width="10" fill="none"
                    :stroke-dasharray="`${slice.strokeLength.toFixed(2)} ${slice.circ.toFixed(2)}`"
                    :stroke-dashoffset="slice.strokeOffset.toFixed(2)" stroke-linecap="round"
                    class="transition-all duration-500 ease-out" />
                </svg>

                <!-- Centro del Donut (Total) -->
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-content-subtle">
                    Efectivo Total
                  </p>
                  <p class="text-lg font-extrabold text-content mt-0.5">
                    {{ formatCurrency(cashStore.balance, { currency: ui.currency }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Listado de Miembros con saldos y porcentajes -->
            <div class="md:col-span-7 space-y-3">
              <div v-for="member in walletDistribution" :key="member.id"
                class="flex items-center justify-between p-2.5 rounded-field border border-line bg-surface/50">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                    :style="{ backgroundColor: member.color }">
                    <AppIcon :name="member.avatar || 'solar:user-bold'" :size="16" />
                  </span>
                  <div>
                    <span class="text-sm font-bold text-content">{{ member.name }}</span>
                    <span
                      class="ml-2 text-3xs font-semibold rounded-pill px-1.5 py-0.5 bg-surface-muted text-content-muted">
                      {{ member.percent }}%
                    </span>
                  </div>
                </div>

                <span class="text-sm font-extrabold text-content">
                  {{ formatCurrency(member.balance, { currency: ui.currency }) }}
                </span>
              </div>

              <!-- Vacío -->
              <div v-if="!walletDistribution.length" class="text-center py-6 text-xs text-content-subtle">
                No hay miembros registrados
              </div>
            </div>
          </div>

          <!-- Línea de Evolución del Efectivo -->
          <div class="border-t border-line pt-6 space-y-4">
            <div>
              <h3 class="text-sm font-bold text-content">Evolución de Carteras</h3>
              <p class="text-3xs text-content-muted mt-0.5">
                Seguimiento de la liquidez en metálico a lo largo del tiempo
              </p>
            </div>

            <!-- Info interactiva -->
            <div
              class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
              <span v-if="hoveredCashIdx === null">
                Pasa el cursor sobre la gráfica para ver saldos históricos de efectivo
              </span>
              <span v-else class="flex justify-between w-full">
                <span>Saldo a fin de {{ cashEvolutionData[hoveredCashIdx].fullLabel }}</span>
                <span class="flex gap-4">
                  <span v-for="m in cashEvolutionData[hoveredCashIdx].members" :key="m.id" :style="{ color: m.color }">
                    {{ m.name }}: {{ formatCurrency(m.balance) }}
                  </span>
                  <span class="text-primary-500 font-bold">Total: {{
                    formatCurrency(cashEvolutionData[hoveredCashIdx].total) }}</span>
                </span>
              </span>
            </div>

            <!-- SVG Multi-Line Chart -->
            <div class="relative overflow-visible">
              <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="w-full h-auto overflow-visible">
                <!-- Rejilla Eje Y -->
                <g stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3">
                  <line :x1="padL" :y1="padT" :x2="svgW - padR" :y2="padT" />
                  <line :x1="padL" :y1="padT + chartH * 0.5" :x2="svgW - padR" :y2="padT + chartH * 0.5" />
                  <line :x1="padL" :y1="padT + chartH" :x2="svgW - padR" :y2="padT + chartH" />
                </g>

                <!-- Etiquetas Eje Y -->
                <g fill="var(--content-subtle)" font-size="9" text-anchor="end" font-weight="bold">
                  <text :x="padL - 8" :y="padT + 3">{{ formatCurrency(maxCash, { signDisplay: 'never' }) }}</text>
                  <text :x="padL - 8" :y="padT + chartH * 0.5 + 3">{{ formatCurrency(maxCash * 0.5, {
                    signDisplay:
                      'never'
                  }) }}</text>
                  <text :x="padL - 8" :y="padT + chartH + 3">{{ formatCurrency(0, { signDisplay: 'never' }) }}</text>
                </g>

                <!-- Área total acumulada (sombra) -->
                <path :d="cashPaths.totalArea" fill="url(#grad-total)" opacity="0.4" />

                <!-- Línea Total General -->
                <path :d="cashPaths.totalLine" fill="none" stroke="#00b894" stroke-width="2.5" stroke-linecap="round"
                  stroke-linejoin="round" />

                <!-- Líneas por miembro -->
                <path v-for="ml in cashPaths.members" :key="ml.id" :d="ml.linePath" fill="none" :stroke="ml.color"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Focus Vertical Line -->
                <g v-if="hoveredCashIdx !== null">
                  <line :x1="padL + (hoveredCashIdx / (cashEvolutionData.length - 1)) * chartW" :y1="padT"
                    :x2="padL + (hoveredCashIdx / (cashEvolutionData.length - 1)) * chartW" :y2="padT + chartH"
                    stroke="var(--line-strong)" stroke-width="1.5" />
                  <!-- Puntos sobre las líneas de miembros -->
                  <circle v-for="m in cashEvolutionData[hoveredCashIdx].members" :key="'point-' + m.id"
                    :cx="padL + (hoveredCashIdx / (cashEvolutionData.length - 1)) * chartW"
                    :cy="padT + chartH - ((m.balance / maxCash) * chartH)" r="4" :fill="m.color" stroke="white"
                    stroke-width="1" />
                  <!-- Punto Total -->
                  <circle :cx="padL + (hoveredCashIdx / (cashEvolutionData.length - 1)) * chartW"
                    :cy="padT + chartH - ((cashEvolutionData[hoveredCashIdx].total / maxCash) * chartH)" r="5"
                    fill="#00b894" stroke="white" stroke-width="1.5" />
                </g>

                <!-- Eje X etiquetas -->
                <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
                  <text v-for="(item, idx) in cashEvolutionData" :key="idx"
                    :x="padL + (idx / (cashEvolutionData.length - 1)) * chartW" :y="padT + chartH + 18">
                    {{ item.label }}
                  </text>
                </g>

                <!-- Zonas interactivas transparentes -->
                <rect v-for="(item, idx) in cashEvolutionData" :key="'cash-hover-' + idx" :x="idx === 0
                  ? padL
                  : padL + ((idx - 0.5) / (cashEvolutionData.length - 1)) * chartW" :y="padT" :width="idx === 0 || idx === cashEvolutionData.length - 1
                    ? (chartW / (cashEvolutionData.length - 1)) / 2
                    : chartW / (cashEvolutionData.length - 1)" :height="chartH" fill="transparent"
                  class="cursor-pointer" @mouseenter="hoveredCashIdx = idx" @mouseleave="hoveredCashIdx = null" />
              </svg>
            </div>
          </div>
        </BaseCard>

        <!-- Gastos por Categoría -->
        <BaseCard class="space-y-4">
          <div>
            <h2 class="text-base font-bold text-content">Distribución de Gastos por Categoría</h2>
            <p class="text-xs text-content-muted mt-0.5">
              ¿En qué se gasta más en el periodo consultado?
            </p>
          </div>

          <!-- Total de gastos consultados -->
          <div class="flex items-center justify-between p-3 rounded-field bg-expense-light/50 border border-expense/10">
            <span class="text-xs font-semibold text-content-muted">Total gastado:</span>
            <span class="text-sm font-extrabold text-expense">
              {{ formatCurrency(categoryBreakdown.totalSpent, { currency: ui.currency }) }}
            </span>
          </div>

          <div v-if="!categoryBreakdown.list.length" class="text-center py-8 text-xs text-content-subtle">
            No se han registrado gastos en este periodo.
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

              <!-- Barra de progreso estilizada -->
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
    <BottomNavigation />
  </div>
</template>
