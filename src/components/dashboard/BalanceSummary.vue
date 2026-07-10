<script setup lang="ts">
import type { PeriodSummary } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{ summary: PeriodSummary }>()
</script>

<template>
  <div class="rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised">
    <p class="text-sm text-white/70">Balance del mes</p>
    <p class="mt-1 text-3xl font-bold tracking-tight">
      {{ formatCurrency(summary.balance, { currency: summary.currency }) }}
    </p>

    <div class="mt-5 grid grid-cols-2 gap-3">
      <div class="rounded-field bg-white/10 p-3">
        <div class="flex items-center gap-2 text-white/70">
          <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-300" />
          <span class="text-xs">Ingresos</span>
        </div>
        <p class="mt-1 font-semibold">
          {{ formatCurrency(summary.income, { currency: summary.currency }) }}
        </p>
      </div>
      <div class="rounded-field bg-white/10 p-3">
        <div class="flex items-center gap-2 text-white/70">
          <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" />
          <span class="text-xs">Gastos</span>
        </div>
        <p class="mt-1 font-semibold">
          {{ formatCurrency(summary.expense, { currency: summary.currency }) }}
        </p>
      </div>
    </div>
  </div>
</template>
