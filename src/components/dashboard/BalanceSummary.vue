<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { PeriodSummary, Savings } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import { usePlatform } from '@/composables/usePlatform'
import SavingsSummaryCard from '@/components/dashboard/CardSavingsSummary.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  summary: PeriodSummary
  periodLabel: string
  savings: Savings[]
  savingsLoaded: boolean
  cash: number
  cashEnabled: boolean
}>()

const { isDesktop } = usePlatform()
const carouselRef = ref<HTMLElement>()
const storageKey = 'dashboard-balance-card'

type CardId = 'balance' | 'savings'

const cards = computed<CardId[]>(() => {
  const result: CardId[] = ['balance']

  if (props.savings.length > 0) result.push('savings')

  return result
})

const totalCards = computed(() => cards.value.length)
const activeIndex = ref(0)

function getSavedCard(): CardId {
  const saved = localStorage.getItem(storageKey) as CardId | null
  return saved && cards.value.includes(saved) ? saved : 'balance'
}

function saveCard(id: CardId) {
  localStorage.setItem(storageKey, id)
}

function scrollToCard(index: number, behavior: ScrollBehavior = 'smooth') {
  carouselRef.value?.scrollTo({ left: carouselRef.value.clientWidth * index, behavior })
}

function restoreCardPosition() {
  const index = cards.value.indexOf(getSavedCard())
  activeIndex.value = index >= 0 ? index : 0
  nextTick(() => scrollToCard(activeIndex.value, 'instant'))
}

function onScroll(event: Event) {
  const container = event.target as HTMLElement
  if (!container.clientWidth) return

  const index = Math.round(container.scrollLeft / container.clientWidth)
  const card = cards.value[index]
  if (card) {
    activeIndex.value = index
    saveCard(card)
  }
}

function goToCard(index: number) {
  const next = Math.max(0, Math.min(index, totalCards.value - 1))
  const card = cards.value[next]
  if (!card) return

  activeIndex.value = next
  saveCard(card)
  scrollToCard(next)
}

const startX = ref(0)
const dragging = ref(false)

function onTouchStart(event: TouchEvent) {
  if (isDesktop || !carouselRef.value) return
  dragging.value = true
  startX.value = event.touches[0].clientX
}

function onTouchEnd(event: TouchEvent) {
  if (!dragging.value || !carouselRef.value) return
  dragging.value = false

  const diff = event.changedTouches[0].clientX - startX.value
  const threshold = carouselRef.value.clientWidth * 0.15
  if (Math.abs(diff) < threshold) return scrollToCard(activeIndex.value)

  goToCard(activeIndex.value + (diff < 0 ? 1 : -1))
}

watch(() => [props.savingsLoaded, props.savings.length], ([loaded]) => {
  if (loaded) restoreCardPosition()
})

onMounted(() => {
  if (props.savingsLoaded) restoreCardPosition()
})
</script>

<template>
  <div class="w-full">
    <div v-if="!props.savingsLoaded"
      class="w-full rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised animate-pulse">
      <div class="space-y-4">
        <div class="h-4 w-32 rounded-full bg-white/20" />
        <div class="h-10 w-48 rounded-lg bg-white/20" />
        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="h-16 rounded-field bg-white/10" />
          <div class="h-16 rounded-field bg-white/10" />
        </div>
      </div>
    </div>

    <div v-else>
      <div ref="carouselRef" class="scrollbar-none flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1"
        @scroll="onScroll" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <template v-for="(card, index) in cards" :key="card">
          <div v-if="card === 'balance'"
            class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised animate-fade-in">
            <button v-if="isDesktop && index > 0" class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
              aria-label="Ver tarjeta anterior" @click="goToCard(index - 1)">
              <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
            </button>
            <button v-if="isDesktop && index < totalCards - 1" class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
              aria-label="Ver tarjeta siguiente" @click="goToCard(index + 1)">
              <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
            </button>

            <section class="m-auto cursor-pointer md:w-11/12" @click="router.push('/history')">
              <p class="text-sm text-white/70">Balance del {{ props.periodLabel }}</p>
              <div class="mt-1 flex items-end justify-between">
                <p class="text-3xl font-bold tracking-tight">
                  {{ formatCurrency(props.summary.balance + (props.cash || 0), { currency: props.summary.currency }) }}
                </p>
                <div v-if="props.cashEnabled" class="mr-2 flex gap-4 pb-1 text-right">
                  <div>
                    <p class="text-[9px] uppercase text-white/60">Banco</p>
                    <p class="text-sm font-semibold">{{ formatCurrency(props.summary.balance, { currency: props.summary.currency }) }}</p>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase text-white/60">Efectivo</p>
                    <p class="text-sm font-semibold">{{ formatCurrency(props.cash, { currency: props.summary.currency }) }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <div class="rounded-field bg-white/10 p-3">
                  <div class="flex items-center gap-2 text-white/70"><AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-300" /><span class="text-xs">Ingresos</span></div>
                  <p class="mt-1 font-semibold">{{ formatCurrency(props.summary.income, { currency: props.summary.currency }) }}</p>
                </div>
                <div class="rounded-field bg-white/10 p-3">
                  <div class="flex items-center gap-2 text-white/70"><AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" /><span class="text-xs">Gastos</span></div>
                  <p class="mt-1 font-semibold">{{ formatCurrency(props.summary.expense, { currency: props.summary.currency }) }}</p>
                </div>
              </div>
            </section>
          </div>

          <div v-else class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised cursor-pointer">
            <button v-if="isDesktop && index > 0" class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
              aria-label="Ver tarjeta anterior" @click="goToCard(index - 1)">
              <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
            </button>
            <button v-if="isDesktop && index < totalCards - 1" class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
              aria-label="Ver tarjeta siguiente" @click="goToCard(index + 1)">
              <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
            </button>
            <SavingsSummaryCard :savings="props.savings" :currency="props.summary.currency" @click="router.push('/savings')" />
          </div>
        </template>
      </div>

      <div v-if="totalCards > 1" class="mt-3 flex justify-center gap-2 md:hidden">
        <span v-for="index in totalCards" :key="index" class="h-2 rounded-full transition-all duration-200"
          :class="activeIndex === index - 1 ? 'bg-primary-500 w-4' : 'bg-line-strong w-2'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; touch-action: pan-y; }
.blur-fade-right { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); -webkit-mask-image: linear-gradient(to right, black 50%, transparent 100%); mask-image: linear-gradient(to right, black 50%, transparent 100%); }
.blur-fade-left { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); -webkit-mask-image: linear-gradient(to left, black 50%, transparent 100%); mask-image: linear-gradient(to left, black 50%, transparent 100%); }
</style>
