<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FamilyMember, PeriodSummary, Savings } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import { usePlatform } from '@/composables/usePlatform'
import SavingsSummaryCard from '@/components/dashboard/CardSavingsSummary.vue'
import { useRouter } from 'vue-router'
import { getVisibleWalletCount } from '@/utils/walletPreview'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()

const props = defineProps<{
  summary: PeriodSummary
  periodLabel: string
  savings: Savings[]
  savingsLoaded: boolean
  /** Efectivo total acumulado (para la tarjeta de efectivo). */
  cash: number
  /** Neto de efectivo (entradas − salidas) del periodo activo (para la tarjeta de balance). */
  cashPeriodNet: number
  cashEnabled: boolean
  members: FamilyMember[]
}>()

const { isDesktop } = usePlatform()
const carouselRef = ref<HTMLElement>()
const storageKey = 'dashboard-balance-card'

type CardId = 'balance' | 'cash' | 'savings'

const cards = computed<CardId[]>(() => {
  const result: CardId[] = ['balance']

  if (props.cashEnabled) result.push('cash')

  if (props.savings.length > 0) result.push('savings')

  return result
})

const totalCards = computed(() => cards.value.length)
const bankBalance = computed(() => {
  if (props.cashEnabled) {
    return props.summary.balance - props.cashPeriodNet
  }
  return props.summary.balance
})
const walletPreviewRef = ref<HTMLElement | HTMLElement[]>()
// Antes de poder medir el ancho real, mostramos solo una cartera para no desplazar el +N fuera de la tarjeta.
const visibleCashMemberCount = ref(0)
const visibleCashMembers = computed(() => props.members.slice(0, visibleCashMemberCount.value))
const hiddenCashMembers = computed(() => Math.max(props.members.length - visibleCashMembers.value.length, 0))
const activeIndex = ref(0)
let walletPreviewObserver: ResizeObserver | undefined
// w-28 (112px) + px-3 (24px padding) = 136px
const walletChipWidth = 136
const moreIndicatorWidth = 56

function getWalletPreviewElement() {
  return Array.isArray(walletPreviewRef.value)
    ? walletPreviewRef.value[0]
    : walletPreviewRef.value
}

function updateWalletPreview() {
  const preview = getWalletPreviewElement()
  if (!preview || typeof preview.getBoundingClientRect !== 'function') return

  const availableWidth = preview.getBoundingClientRect().width

  if (!availableWidth) return

  visibleCashMemberCount.value = getVisibleWalletCount(
    availableWidth,
    Array(props.members.length).fill(walletChipWidth),
    moreIndicatorWidth,
  )
}

function observeWalletPreview() {
  walletPreviewObserver?.disconnect()
  const preview = getWalletPreviewElement()

  if (preview) {
    walletPreviewObserver?.observe(preview)
  }
}

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

watch(() => [props.savingsLoaded, props.savings.length, props.cashEnabled], ([loaded]) => {
  if (loaded) restoreCardPosition()
})

watch(() => [props.members.length, props.cashEnabled], () => {
  nextTick(() => {
    updateWalletPreview()
    observeWalletPreview()
    requestAnimationFrame(updateWalletPreview)
  })
})

watch(() => activeIndex.value, () => {
  nextTick(() => {
    updateWalletPreview()
    requestAnimationFrame(updateWalletPreview)
  })
})

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    walletPreviewObserver = new ResizeObserver(updateWalletPreview)
  }

  if (props.savingsLoaded) restoreCardPosition()

  nextTick(() => {
    updateWalletPreview()
    observeWalletPreview()
    requestAnimationFrame(updateWalletPreview)
  })
})

onBeforeUnmount(() => walletPreviewObserver?.disconnect())
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
            <button v-if="isDesktop && index > 0"
              class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
              aria-label="Ver tarjeta anterior" @click="goToCard(index - 1)">
              <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
            </button>
            <button v-if="isDesktop && index < totalCards - 1"
              class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
              aria-label="Ver tarjeta siguiente" @click="goToCard(index + 1)">
              <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
            </button>

            <section class="m-auto cursor-pointer md:w-11/12" @click="router.push('/history')">
              <p class="text-sm text-white/70">{{ t('dashboard.balance', { period: props.periodLabel }) }}</p>
              <div class="mt-1 flex items-end justify-between">
                <p class="text-3xl font-bold tracking-tight">
                  {{ formatCurrency(props.summary.balance, { currency: props.summary.currency }) }}
                </p>
                <div v-if="props.cashEnabled" class="mr-2 flex gap-4 pb-1 text-right">
                  <div>
                    <p class="text-[9px] uppercase text-white/60">{{ t('summary.bank') }}</p>
                    <p class="text-sm font-semibold">{{ formatCurrency(bankBalance, {
                      currency:
                        props.summary.currency
                    }) }}</p>
                  </div>
                  <div>
                    <p class="text-[9px] uppercase text-white/60">{{ t('summary.cash') }}</p>
                    <p class="text-sm font-semibold">{{ formatCurrency(props.cashPeriodNet, { currency: props.summary.currency })
                    }}</p>
                  </div>
                </div>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-3">
                <div class="rounded-field bg-white/10 p-3">
                  <div class="flex items-center gap-2 text-white/70">
                    <AppIcon name="solar:arrow-down-bold" :size="16" class="text-primary-300" /><span class="text-xs">{{
                      t('summary.income') }}</span>
                  </div>
                  <p class="mt-1 font-semibold">{{ formatCurrency(props.summary.income, {
                    currency:
                      props.summary.currency
                  }) }}</p>
                </div>
                <div class="rounded-field bg-white/10 p-3">
                  <div class="flex items-center gap-2 text-white/70">
                    <AppIcon name="solar:arrow-up-bold" :size="16" class="text-tertiary-300" /><span class="text-xs">{{
                      t('summary.expense') }}</span>
                  </div>
                  <p class="mt-1 font-semibold">{{ formatCurrency(props.summary.expense, {
                    currency:
                      props.summary.currency
                  }) }}</p>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="card === 'cash'"
            class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-raised animate-fade-in">
            <button v-if="isDesktop && index > 0"
              class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
              aria-label="Ver tarjeta anterior" @click="goToCard(index - 1)">
              <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
            </button>
            <button v-if="isDesktop && index < totalCards - 1"
              class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
              aria-label="Ver tarjeta siguiente" @click="goToCard(index + 1)">
              <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
            </button>

            <section class="m-auto cursor-pointer md:w-11/12 px-2" @click="router.push('/cash')">
              <p class="text-sm text-white/70">{{ t('summary.cashBalance') }}</p>
              <p class="mt-1 text-3xl font-bold tracking-tight">
                {{ formatCurrency(props.cash, { currency: props.summary.currency }) }}
              </p>

              <div class="mt-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs text-white/70">{{ t('summary.wallets') }}</p>
                  <p class="text-2xs text-white/60">{{ t('summary.members', { count: props.members.length }) }}</p>
                </div>
                <div v-if="props.members.length" ref="walletPreviewRef" data-testid="cash-wallet-preview"
                  class="mt-2 flex w-full gap-2">
                  <div v-for="member in visibleCashMembers" :key="member.id"
                    class="w-28 shrink-0 rounded-field bg-white/10 px-3 py-2 text-xs">
                    <p class="truncate font-medium">{{ member.name }}</p>
                    <p class="mt-1 truncate text-white/70">
                      {{ formatCurrency(member.cash_balance ?? 0, { currency: props.summary.currency }) }}
                    </p>
                  </div>
                  <div v-if="hiddenCashMembers"
                    class="shrink-0 self-center rounded-pill bg-white/10 px-3 py-2 text-xs text-white/70">
                    +{{ hiddenCashMembers }}
                  </div>
                </div>
                <p v-else class="mt-2 text-xs text-white/60">{{ t('summary.noWallets') }}</p>
              </div>
            </section>
          </div>

          <div v-else
            class="relative w-full shrink-0 snap-center rounded-card bg-gradient-to-br from-secondary-700 to-secondary-900 p-6 text-white shadow-raised cursor-pointer">
            <button v-if="isDesktop && index > 0"
              class="absolute left-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-right transition"
              aria-label="Ver tarjeta anterior" @click="goToCard(index - 1)">
              <AppIcon name="solar:alt-arrow-left-bold" class="ml-1 opacity-50" :size="20" />
            </button>
            <button v-if="isDesktop && index < totalCards - 1"
              class="absolute right-0 top-1/2 h-full w-10 -translate-y-1/2 items-center justify-center rounded-full blur-fade-left transition"
              aria-label="Ver tarjeta siguiente" @click="goToCard(index + 1)">
              <AppIcon name="solar:alt-arrow-right-bold" class="ml-3 opacity-50" :size="20" />
            </button>
            <SavingsSummaryCard :savings="props.savings" :currency="props.summary.currency"
              @click="router.push('/savings')" />
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
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
  touch-action: pan-y;
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
