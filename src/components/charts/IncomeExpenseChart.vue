<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatCurrency } from '@/utils/format'
import { useI18n } from '@/i18n'
import { SVG_W, SVG_H, PAD_L, PAD_R, PAD_T, CHART_W, CHART_H, niceMax, barGroupX } from '@/utils/chart'
import BaseCard from '@/components/ui/BaseCard.vue'

export interface IncomeExpensePoint {
  label: string
  fullLabel: string
  income: number
  expense: number
  balance: number
}

const props = defineProps<{ data: IncomeExpensePoint[] }>()
const { t } = useI18n()

const hovered = ref<number | null>(null)
const max = computed(() => niceMax(props.data.flatMap((d) => [d.income, d.expense])))
</script>

<template>
  <BaseCard class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-bold text-content">{{ t('charts.incomeExpenseTitle') }}</h2>
        <p class="text-xs text-content-muted mt-0.5">
          {{ t('charts.incomeExpenseSubtitle') }}
        </p>
      </div>

      <!-- Leyenda flotante -->
      <div class="flex items-center gap-3 text-xs">
        <span class="flex items-center gap-1.5 font-medium text-content-muted">
          <span class="h-2.5 w-2.5 rounded-full bg-income" />
          {{ t('summary.income') }}
        </span>
        <span class="flex items-center gap-1.5 font-medium text-content-muted">
          <span class="h-2.5 w-2.5 rounded-full bg-expense" />
          {{ t('summary.expense') }}
        </span>
      </div>
    </div>

    <!-- Info interactiva -->
    <div class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
      <span v-if="hovered === null">
        {{ t('charts.hoverBarsHint') }}
      </span>
      <span v-else class="flex justify-between w-full">
        <span>{{ data[hovered].fullLabel }}</span>
        <span class="flex gap-4">
          <span class="text-income">{{ t('charts.incomeTooltip', { amount: formatCurrency(data[hovered].income) }) }}</span>
          <span class="text-expense">{{ t('charts.expenseTooltip', { amount: formatCurrency(data[hovered].expense) }) }}</span>
          <span :class="data[hovered].balance >= 0 ? 'text-content' : 'text-expense'">
            {{ t('charts.netTooltip', { amount: (data[hovered].balance >= 0 ? '+' : '') + formatCurrency(data[hovered].balance) }) }}
          </span>
        </span>
      </span>
    </div>

    <!-- SVG Chart -->
    <div class="relative overflow-visible">
      <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full h-auto overflow-visible">
        <!-- Rejilla y Guías de Eje Y -->
        <g stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3">
          <line :x1="PAD_L" :y1="PAD_T" :x2="SVG_W - PAD_R" :y2="PAD_T" />
          <line :x1="PAD_L" :y1="PAD_T + CHART_H * 0.5" :x2="SVG_W - PAD_R" :y2="PAD_T + CHART_H * 0.5" />
          <line :x1="PAD_L" :y1="PAD_T + CHART_H" :x2="SVG_W - PAD_R" :y2="PAD_T + CHART_H" />
        </g>

        <!-- Etiquetas del Eje Y -->
        <g fill="var(--content-subtle)" font-size="9" text-anchor="end" font-weight="bold">
          <text :x="PAD_L - 8" :y="PAD_T + 3">{{ formatCurrency(max, { signDisplay: 'never' }) }}</text>
          <text :x="PAD_L - 8" :y="PAD_T + CHART_H * 0.5 + 3">{{ formatCurrency(max * 0.5, { signDisplay: 'never' }) }}</text>
          <text :x="PAD_L - 8" :y="PAD_T + CHART_H + 3">{{ formatCurrency(0, { signDisplay: 'never' }) }}</text>
        </g>

        <!-- Barras -->
        <g v-for="(item, idx) in data" :key="idx">
          <rect v-if="hovered === idx" :x="barGroupX(idx, data.length) - (CHART_W / data.length) / 2" :y="PAD_T - 5"
            :width="CHART_W / data.length" :height="CHART_H + 10" fill="var(--surface-muted)" rx="6" opacity="0.5" />

          <rect :x="barGroupX(idx, data.length) - (Math.max(2, (CHART_W / data.length) * 0.35)) - 1"
            :y="PAD_T + CHART_H - ((item.income / max) * CHART_H)" :width="Math.max(2, (CHART_W / data.length) * 0.35)"
            :height="(item.income / max) * CHART_H" fill="#00b894" rx="2" class="transition-all duration-300" />

          <rect :x="barGroupX(idx, data.length) + 1" :y="PAD_T + CHART_H - ((item.expense / max) * CHART_H)"
            :width="Math.max(2, (CHART_W / data.length) * 0.35)" :height="(item.expense / max) * CHART_H" fill="#f5492a"
            rx="2" class="transition-all duration-300" />
        </g>

        <!-- Etiquetas del Eje X -->
        <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
          <text v-for="(item, idx) in data" :key="idx" :x="barGroupX(idx, data.length)" :y="PAD_T + CHART_H + 18">
            {{ item.label }}
          </text>
        </g>

        <!-- Capa interactiva -->
        <rect v-for="(item, idx) in data" :key="'hover-' + idx"
          :x="barGroupX(idx, data.length) - (CHART_W / data.length) / 2" :y="PAD_T" :width="CHART_W / data.length"
          :height="CHART_H" fill="transparent" class="cursor-pointer" @mouseenter="hovered = idx"
          @mouseleave="hovered = null" />
      </svg>
    </div>
  </BaseCard>
</template>
