<script setup lang="ts">
import { ref } from 'vue'
import type { PeriodSummary } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  monthlySummary: PeriodSummary
  annualSummary: PeriodSummary
}>()

const activeIndex = ref(0)

function onScroll(event: Event) {
  const container = event.target as HTMLElement
  const width = container.clientWidth
  if (width > 0) {
    activeIndex.value = Math.round(container.scrollLeft / width)
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Contenedor Deslizable -->
    <div
      class="scrollbar-none flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1"
      @scroll="onScroll"
    >
      <!-- Card 1: Balance del mes -->
      <div class="w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised animate-fade-in">
        <p class="text-sm text-white/70">Balance del mes</p>
        <p class="mt-1 text-3xl font-bold tracking-tight">
          {{ formatCurrency(monthlySummary.balance, { currency: monthlySummary.currency }) }}
        </p>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-field bg-white/10 p-3">
            <div class="flex items-center gap-2 text-white/70">
              <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-300" />
              <span class="text-xs">Ingresos</span>
            </div>
            <p class="mt-1 font-semibold">
              {{ formatCurrency(monthlySummary.income, { currency: monthlySummary.currency }) }}
            </p>
          </div>
          <div class="rounded-field bg-white/10 p-3">
            <div class="flex items-center gap-2 text-white/70">
              <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" />
              <span class="text-xs">Gastos</span>
            </div>
            <p class="mt-1 font-semibold">
              {{ formatCurrency(monthlySummary.expense, { currency: monthlySummary.currency }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Card 2: Balance del año -->
      <div class="w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-raised animate-fade-in">
        <p class="text-sm text-white/70">Balance del año</p>
        <p class="mt-1 text-3xl font-bold tracking-tight">
          {{ formatCurrency(annualSummary.balance, { currency: annualSummary.currency }) }}
        </p>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-field bg-white/10 p-3">
            <div class="flex items-center gap-2 text-white/70">
              <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-200" />
              <span class="text-xs">Ingresos</span>
            </div>
            <p class="mt-1 font-semibold">
              {{ formatCurrency(annualSummary.income, { currency: annualSummary.currency }) }}
            </p>
          </div>
          <div class="rounded-field bg-white/10 p-3">
            <div class="flex items-center gap-2 text-white/70">
              <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" />
              <span class="text-xs">Gastos</span>
            </div>
            <p class="mt-1 font-semibold">
              {{ formatCurrency(annualSummary.expense, { currency: annualSummary.currency }) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Indicador de Páginas (Puntitos) -->
    <div class="mt-3 flex justify-center gap-2">
      <span
        class="h-2 rounded-full transition-all duration-200"
        :class="activeIndex === 0 ? 'bg-primary-500 w-4' : 'bg-line-strong w-2'"
      />
      <span
        class="h-2 rounded-full transition-all duration-200"
        :class="activeIndex === 1 ? 'bg-primary-500 w-4' : 'bg-line-strong w-2'"
      />
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
