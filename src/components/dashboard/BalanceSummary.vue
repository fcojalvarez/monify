<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PeriodSummary, Savings } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import { usePlatform } from '@/composables/usePlatform'
import SavingsSummaryCard from '@/components/dashboard/CardSavingsSummary.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  monthlySummary: PeriodSummary
  annualSummary: PeriodSummary
  savings: Savings[]
}>()

const totalCards = computed(() => 2 + (props.savings.length > 0 ? 1 : 0))

const activeIndex = ref(0)
const carouselRef = ref<HTMLElement>()
const { isDesktop } = usePlatform()

function onScroll(event: Event) {
  const container = event.target as HTMLElement
  const width = container.clientWidth

  if (width > 0) {
    activeIndex.value = Math.round(container.scrollLeft / width)
  }
}

function nextCard() {
  if (!carouselRef.value) return

  carouselRef.value.scrollBy({
    left: carouselRef.value.clientWidth,
    behavior: 'smooth',
  })
}

function previousCard() {
  if (!carouselRef.value) return

  carouselRef.value.scrollBy({
    left: -carouselRef.value.clientWidth,
    behavior: 'smooth',
  })
}
</script>

<template>
  <div class="w-full">
    <!-- Contenedor Deslizable -->
    <div ref="carouselRef" class="scrollbar-none flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1"
      @scroll="onScroll">
      <!-- Card 1: Balance del mes -->
      <div
        class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised animate-fade-in">
        <button v-if="isDesktop"
          class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
          aria-label="Ver balance anual" @click="nextCard">
          <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
        </button>

        <section class="m-auto cursor-pointer md:w-11/12" @click="router.push('/history')">
          <p class="text-sm text-white/70">Balance del mes</p>

          <p class="mt-1 text-3xl font-bold tracking-tight">
            {{
              formatCurrency(props.monthlySummary.balance, {
                currency: props.monthlySummary.currency,
              })
            }}
          </p>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-field bg-white/10 p-3">
              <div class="flex items-center gap-2 text-white/70">
                <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-300" />
                <span class="text-xs">Ingresos</span>
              </div>

              <p class="mt-1 font-semibold">
                {{
                  formatCurrency(props.monthlySummary.income, {
                    currency: props.monthlySummary.currency,
                  })
                }}
              </p>
            </div>

            <div class="rounded-field bg-white/10 p-3">
              <div class="flex items-center gap-2 text-white/70">
                <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" />
                <span class="text-xs">Gastos</span>
              </div>

              <p class="mt-1 font-semibold">
                {{
                  formatCurrency(props.monthlySummary.expense, {
                    currency: props.monthlySummary.currency,
                  })
                }}
              </p>
            </div>
          </div>
        </section>
      </div>

      <!-- Card 2: Balance de ahorros -->
      <div v-if="props.savings.length > 0"
        class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised cursor-pointer">
        <button v-if="isDesktop"
          class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
          aria-label="Ver balance anual" @click="nextCard">
          <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
        </button>

        <SavingsSummaryCard :savings="props.savings" :currency="props.monthlySummary.currency"
          @click="router.push('/savings')" />

        <button v-if="isDesktop"
          class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
          aria-label="Ver balance mensual" @click="previousCard">
          <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
        </button>
      </div>

      <!-- Card 3: Balance del año -->
      <div
        class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-raised animate-fade-in">
        <button v-if="isDesktop"
          class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
          aria-label="Ver balance mensual" @click="previousCard">
          <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
        </button>

        <section class="m-auto cursor-pointer md:w-11/12" @click="router.push('/history')">
          <p class="text-sm text-white/70">Balance del año</p>

          <p class="mt-1 text-3xl font-bold tracking-tight">
            {{
              formatCurrency(props.annualSummary.balance, {
                currency: props.annualSummary.currency,
              })
            }}
          </p>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-field bg-white/10 p-3">
              <div class="flex items-center gap-2 text-white/70">
                <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-200" />
                <span class="text-xs">Ingresos</span>
              </div>

              <p class="mt-1 font-semibold">
                {{
                  formatCurrency(props.annualSummary.income, {
                    currency: props.annualSummary.currency,
                  })
                }}
              </p>
            </div>

            <div class="rounded-field bg-white/10 p-3">
              <div class="flex items-center gap-2 text-white/70">
                <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" />
                <span class="text-xs">Gastos</span>
              </div>

              <p class="mt-1 font-semibold">
                {{
                  formatCurrency(props.annualSummary.expense, {
                    currency: props.annualSummary.currency,
                  })
                }}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="mt-3 flex justify-center gap-2 md:hidden">
      <span v-for="index in totalCards" :key="index" class="h-2 rounded-full transition-all duration-200"
        :class="activeIndex === index - 1 ? 'bg-primary-500 w-4' : 'bg-line-strong w-2'" />
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

.blur-fade-right {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  -webkit-mask-image: linear-gradient(to right, black 50%, transparent 100%);
  mask-image: linear-gradient(to right, black 50%, transparent 100%);
}

.blur-fade-left {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  -webkit-mask-image: linear-gradient(to left, black 50%, transparent 100%);
  mask-image: linear-gradient(to left, black 50%, transparent 100%);
}
</style>