<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryUsage } from '@/types'
import { formatCurrency } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ usage: CategoryUsage }>()
const { t } = useI18n()

const barWidth = computed(() => Math.min(props.usage.percentage, 100))
const barColor = computed(() => {
  if (props.usage.isOverLimit) return 'bg-expense'
  if (props.usage.percentage >= 80) return 'bg-warning'
  return 'bg-primary-500'
})
</script>

<template>
  <div class="flex items-center gap-3">
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
      :style="{ backgroundColor: usage.category.color }"
    >
      <AppIcon :name="usage.category.icon" :size="20" />
    </span>

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <p class="truncate text-sm font-medium text-content">{{ usage.category.name }}</p>
        <p class="shrink-0 text-sm font-semibold text-content">
          {{ formatCurrency(usage.spent) }}
          <span v-if="usage.limit" class="text-xs font-normal text-content-subtle">
            / {{ formatCurrency(usage.limit) }}
          </span>
        </p>
      </div>

      <div v-if="usage.limit" class="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        <div
          class="h-full rounded-pill transition-all duration-500 ease-smooth"
          :class="barColor"
          :style="{ width: `${barWidth}%` }"
        />
      </div>
      <p v-if="usage.isOverLimit" class="mt-1 text-xs font-medium text-expense">
        {{ t('misc.categoryLimitExceeded', { amount: formatCurrency(usage.spent - (usage.limit ?? 0)) }) }}
      </p>
    </div>
  </div>
</template>
