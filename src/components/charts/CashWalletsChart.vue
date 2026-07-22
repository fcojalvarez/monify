<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatCurrency } from '@/utils/format'
import { useI18n } from '@/i18n'
import { SVG_W, SVG_H, PAD_L, PAD_R, PAD_T, CHART_W, CHART_H, niceMax, linePath, areaPath, type Point } from '@/utils/chart'
import BaseCard from '@/components/ui/BaseCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

interface CashMemberPoint {
  id: string
  name: string
  color: string
  balance: number
}
export interface CashEvolutionPoint {
  label: string
  fullLabel: string
  total: number
  members: CashMemberPoint[]
}
export interface WalletSlice {
  id: string
  name: string
  color: string
  avatar: string
  balance: number
  percent: number
  strokeLength: number
  strokeOffset: number
  circ: number
}

const props = defineProps<{
  data: CashEvolutionPoint[]
  distribution: WalletSlice[]
  totalCash: number
  currency: string
}>()
const { t } = useI18n()

const hovered = ref<number | null>(null)

const max = computed(() =>
  niceMax(props.data.flatMap((d) => [d.total, ...d.members.map((m) => m.balance)])),
)

const paths = computed(() => {
  const data = props.data
  const n = data.length
  if (n <= 1) return { totalLine: '', totalArea: '', members: [] as { id: string; color: string; linePath: string }[] }

  const totalPts: Point[] = []
  const memberMeta = data[0]?.members ?? []
  const memberPtsMap = new Map<string, Point[]>(memberMeta.map((m) => [m.id, []]))

  for (let i = 0; i < n; i++) {
    const x = PAD_L + (i / (n - 1)) * CHART_W
    totalPts.push({ x, y: PAD_T + CHART_H - (data[i].total / max.value) * CHART_H })
    for (const member of data[i].members) {
      memberPtsMap.get(member.id)?.push({ x, y: PAD_T + CHART_H - (member.balance / max.value) * CHART_H })
    }
  }

  return {
    totalLine: linePath(totalPts),
    totalArea: areaPath(totalPts),
    members: memberMeta.map((m) => ({ id: m.id, color: m.color, linePath: linePath(memberPtsMap.get(m.id) ?? []) })),
  }
})

const focusX = (idx: number) => PAD_L + (idx / (props.data.length - 1)) * CHART_W
</script>

<template>
  <BaseCard class="space-y-6">
    <div>
      <h2 class="text-base font-bold text-content">{{ t('charts.cashWalletsTitle') }}</h2>
      <p class="text-xs text-content-muted mt-0.5">
        {{ t('charts.cashWalletsSubtitle') }}
      </p>
    </div>

    <!-- Distribución Donut + Listado de Carteras -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div class="md:col-span-5 flex justify-center">
        <div class="relative w-44 h-44">
          <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="38" stroke="var(--surface-muted)" stroke-width="10" fill="none" />
            <circle v-for="slice in distribution" :key="slice.id" cx="50" cy="50" r="38" :stroke="slice.color"
              stroke-width="10" fill="none"
              :stroke-dasharray="`${slice.strokeLength.toFixed(2)} ${slice.circ.toFixed(2)}`"
              :stroke-dashoffset="slice.strokeOffset.toFixed(2)" stroke-linecap="round"
              class="transition-all duration-500 ease-out" />
          </svg>

          <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-content-subtle">
              {{ t('charts.totalCash') }}
            </p>
            <p class="text-lg font-extrabold text-content mt-0.5">
              {{ formatCurrency(totalCash, { currency }) }}
            </p>
          </div>
        </div>
      </div>

      <div class="md:col-span-7 space-y-3">
        <div v-for="member in distribution" :key="member.id"
          class="flex items-center justify-between p-2.5 rounded-field border border-line bg-surface/50">
          <div class="flex items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
              :style="{ backgroundColor: member.color }">
              <AppIcon :name="member.avatar || 'solar:user-bold'" :size="16" />
            </span>
            <div>
              <span class="text-sm font-bold text-content">{{ member.name }}</span>
              <span class="ml-2 text-3xs font-semibold rounded-pill px-1.5 py-0.5 bg-surface-muted text-content-muted">
                {{ member.percent }}%
              </span>
            </div>
          </div>

          <span class="text-sm font-extrabold text-content">
            {{ formatCurrency(member.balance, { currency }) }}
          </span>
        </div>

        <div v-if="!distribution.length" class="text-center py-6 text-xs text-content-subtle">
          {{ t('charts.noMembers') }}
        </div>
      </div>
    </div>

    <!-- Línea de Evolución del Efectivo -->
    <div class="border-t border-line pt-6 space-y-4">
      <div>
        <h3 class="text-sm font-bold text-content">{{ t('charts.walletsEvolutionTitle') }}</h3>
        <p class="text-3xs text-content-muted mt-0.5">
          {{ t('charts.walletsEvolutionSubtitle') }}
        </p>
      </div>

      <div class="h-8 flex items-center bg-surface-muted/50 rounded-field px-3 text-xs font-semibold text-content-muted">
        <span v-if="hovered === null">
          {{ t('charts.hoverCashHint') }}
        </span>
        <span v-else class="flex justify-between w-full">
          <span>{{ t('charts.balanceAtEndOf', { period: data[hovered].fullLabel }) }}</span>
          <span class="flex gap-4">
            <span v-for="m in data[hovered].members" :key="m.id" :style="{ color: m.color }">
              {{ m.name }}: {{ formatCurrency(m.balance) }}
            </span>
            <span class="text-primary-500 font-bold">{{ t('charts.total') }}: {{ formatCurrency(data[hovered].total) }}</span>
          </span>
        </span>
      </div>

      <div class="relative overflow-visible">
        <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="grad-cash-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00b894" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#00b894" stop-opacity="0" />
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

          <path :d="paths.totalArea" fill="url(#grad-cash-total)" opacity="0.4" />
          <path :d="paths.totalLine" fill="none" stroke="#00b894" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <path v-for="ml in paths.members" :key="ml.id" :d="ml.linePath" fill="none" :stroke="ml.color"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

          <g v-if="hovered !== null">
            <line :x1="focusX(hovered)" :y1="PAD_T" :x2="focusX(hovered)" :y2="PAD_T + CHART_H" stroke="var(--line-strong)" stroke-width="1.5" />
            <circle v-for="m in data[hovered].members" :key="'point-' + m.id" :cx="focusX(hovered)"
              :cy="PAD_T + CHART_H - ((m.balance / max) * CHART_H)" r="4" :fill="m.color" stroke="white" stroke-width="1" />
            <circle :cx="focusX(hovered)" :cy="PAD_T + CHART_H - ((data[hovered].total / max) * CHART_H)" r="5" fill="#00b894" stroke="white" stroke-width="1.5" />
          </g>

          <g fill="var(--content-muted)" font-size="9" text-anchor="middle" font-weight="600">
            <text v-for="(item, idx) in data" :key="idx" :x="focusX(idx)" :y="PAD_T + CHART_H + 18">
              {{ item.label }}
            </text>
          </g>

          <rect v-for="(item, idx) in data" :key="'cash-hover-' + idx"
            :x="idx === 0 ? PAD_L : PAD_L + ((idx - 0.5) / (data.length - 1)) * CHART_W" :y="PAD_T"
            :width="idx === 0 || idx === data.length - 1 ? (CHART_W / (data.length - 1)) / 2 : CHART_W / (data.length - 1)"
            :height="CHART_H" fill="transparent" class="cursor-pointer" @mouseenter="hovered = idx" @mouseleave="hovered = null" />
        </svg>
      </div>
    </div>
  </BaseCard>
</template>
