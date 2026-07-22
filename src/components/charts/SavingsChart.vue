<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatCurrency } from '@/utils/format'
import { useI18n } from '@/i18n'
import { SVG_W, SVG_H, PAD_L, PAD_R, PAD_T, CHART_W, CHART_H, niceMax, linePath, areaPath, type Point } from '@/utils/chart'
import BaseCard from '@/components/ui/BaseCard.vue'

export interface SavingsPoint {
  label: string
  fullLabel: string
  bank: number
  cash: number
  total: number
}

const props = defineProps<{ data: SavingsPoint[] }>()
const { t } = useI18n()

const filter = ref<'all' | 'bank' | 'cash'>('all')
const hovered = ref<number | null>(null)

const max = computed(() =>
  niceMax(
    props.data.flatMap((d) => {
      if (filter.value === 'bank') return [d.bank]
      if (filter.value === 'cash') return [d.cash]
      return [d.total, d.bank, d.cash]
    }),
  ),
)

const paths = computed(() => {
  const data = props.data
  const n = data.length
  if (n <= 1) return { totalLine: '', bankLine: '', cashLine: '', totalArea: '', bankArea: '', cashArea: '' }

  const totalPts: Point[] = []
  const bankPts: Point[] = []
  const cashPts: Point[] = []
  for (let i = 0; i < n; i++) {
    const x = PAD_L + (i / (n - 1)) * CHART_W
    totalPts.push({ x, y: PAD_T + CHART_H - (data[i].total / max.value) * CHART_H })
    bankPts.push({ x, y: PAD_T + CHART_H - (data[i].bank / max.value) * CHART_H })
    cashPts.push({ x, y: PAD_T + CHART_H - (data[i].cash / max.value) * CHART_H })
  }
  return {
    totalLine: linePath(totalPts),
    bankLine: linePath(bankPts),
    cashLine: linePath(cashPts),
    totalArea: areaPath(totalPts),
    bankArea: areaPath(bankPts),
    cashArea: areaPath(cashPts),
  }
})

const focusX = (idx: number) => PAD_L + (idx / (props.data.length - 1)) * CHART_W
</script>

<template>
  <BaseCard class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-content">{{ t('charts.savingsEvolutionTitle') }}</h2>
        <p class="text-xs text-content-muted mt-0.5">
          {{ t('charts.savingsEvolutionSubtitle') }}
        </p>
      </div>

      <div class="flex rounded-field bg-surface-muted p-0.5 text-2xs font-bold w-full sm:w-fit">
        <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
          :class="filter === 'all' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
          @click="filter = 'all'">
          {{ t('charts.total') }}
        </button>
        <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
          :class="filter === 'bank' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
          @click="filter = 'bank'">
          {{ t('summary.bank') }}
        </button>
        <button type="button" class="px-3 py-1.5 rounded-[10px] transition-all"
          :class="filter === 'cash' ? 'bg-surface-raised text-content shadow-sm' : 'text-content-muted hover:text-content'"
          @click="filter = 'cash'">
          {{ t('summary.cash') }}
        </button>
      </div>
    </div>

    <!-- Info interactiva -->
    <div class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
      <span v-if="hovered === null">
        {{ t('charts.hoverSavingsHint') }}
      </span>
      <span v-else class="flex justify-between w-full">
        <span>{{ t('charts.balanceAtEndOf', { period: data[hovered].fullLabel }) }}</span>
        <span class="flex gap-4">
          <span v-if="filter === 'all' || filter === 'bank'" class="text-violet-500">{{ t('summary.bank') }}: {{ formatCurrency(data[hovered].bank) }}</span>
          <span v-if="filter === 'all' || filter === 'cash'" class="text-amber-500">{{ t('summary.cash') }}: {{ formatCurrency(data[hovered].cash) }}</span>
          <span class="text-primary-500">{{ t('charts.total') }}: {{ formatCurrency(data[hovered].total) }}</span>
        </span>
      </span>
    </div>

    <!-- SVG Area & Line Chart -->
    <div class="relative overflow-visible">
      <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full h-auto overflow-visible">
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

        <g stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3">
          <line :x1="PAD_L" :y1="PAD_T" :x2="SVG_W - PAD_R" :y2="PAD_T" />
          <line :x1="PAD_L" :y1="PAD_T + CHART_H * 0.5" :x2="SVG_W - PAD_R" :y2="PAD_T + CHART_H * 0.5" />
          <line :x1="PAD_L" :y1="PAD_T + CHART_H" :x2="SVG_W - PAD_R" :y2="PAD_T + CHART_H" />
        </g>

        <g fill="var(--content-subtle)" font-size="9" text-anchor="end" font-weight="bold">
          <text :x="PAD_L - 8" :y="PAD_T + 3">{{ formatCurrency(max, { signDisplay: 'never' }) }}</text>
          <text :x="PAD_L - 8" :y="PAD_T + CHART_H * 0.5 + 3">{{ formatCurrency(max * 0.5, { signDisplay: 'never' }) }}</text>
          <text :x="PAD_L - 8" :y="PAD_T + CHART_H + 3">{{ formatCurrency(0, { signDisplay: 'never' }) }}</text>
        </g>

        <g v-if="filter === 'all'">
          <path :d="paths.totalArea" fill="url(#grad-total)" />
          <path :d="paths.bankLine" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
          <path :d="paths.cashLine" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
          <path :d="paths.totalLine" fill="none" stroke="#00b894" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <g v-else-if="filter === 'bank'">
          <path :d="paths.bankArea" fill="url(#grad-bank)" />
          <path :d="paths.bankLine" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <g v-else-if="filter === 'cash'">
          <path :d="paths.cashArea" fill="url(#grad-cash)" />
          <path :d="paths.cashLine" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <g v-if="hovered !== null">
          <line :x1="focusX(hovered)" :y1="PAD_T" :x2="focusX(hovered)" :y2="PAD_T + CHART_H" stroke="var(--line-strong)" stroke-width="1.5" />
          <circle v-if="filter === 'all'" :cx="focusX(hovered)" :cy="PAD_T + CHART_H - ((data[hovered].total / max) * CHART_H)" r="5" fill="#00b894" stroke="white" stroke-width="1.5" />
          <circle v-if="filter === 'bank' || filter === 'all'" :cx="focusX(hovered)" :cy="PAD_T + CHART_H - ((data[hovered].bank / max) * CHART_H)" r="5" fill="#8b5cf6" stroke="white" stroke-width="1.5" />
          <circle v-if="filter === 'cash' || filter === 'all'" :cx="focusX(hovered)" :cy="PAD_T + CHART_H - ((data[hovered].cash / max) * CHART_H)" r="5" fill="#f59e0b" stroke="white" stroke-width="1.5" />
        </g>

        <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
          <text v-for="(item, idx) in data" :key="idx" :x="focusX(idx)" :y="PAD_T + CHART_H + 18">
            {{ item.label }}
          </text>
        </g>

        <rect v-for="(item, idx) in data" :key="'sav-hover-' + idx"
          :x="idx === 0 ? PAD_L : PAD_L + ((idx - 0.5) / (data.length - 1)) * CHART_W" :y="PAD_T"
          :width="idx === 0 || idx === data.length - 1 ? (CHART_W / (data.length - 1)) / 2 : CHART_W / (data.length - 1)"
          :height="CHART_H" fill="transparent" class="cursor-pointer" @mouseenter="hovered = idx" @mouseleave="hovered = null" />
      </svg>
    </div>
  </BaseCard>
</template>
