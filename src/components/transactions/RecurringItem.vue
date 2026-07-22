<script setup lang="ts">
import { computed } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { formatCurrency, formatDate } from '@/utils/format'
import { formatMonthList } from '@/utils/recurring'
import { useI18n, getIntlLocale } from '@/i18n'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useCategoriesStore } from '@/stores/categories'

const props = defineProps<{ transaction: RecurringTransaction }>()
const emit = defineEmits<{ click: [transaction: RecurringTransaction] }>()
const { t } = useI18n()
const categories = useCategoriesStore()

const isIncome = computed(() => props.transaction.kind === 'income')
const category = computed(() => categories.getById(props.transaction.category_id))
const categoryName = computed(() => category.value?.name ?? t('recurringList.noCategory'))
const endDateLabel = computed(() =>
  props.transaction.end_on
    ? t('recurringList.end', { date: formatDate(props.transaction.end_on) })
    : t('recurringList.noEnd'),
)

const scheduleLabel = computed(() => {
  if (props.transaction.frequency === 'custom') {
    const day = props.transaction.day_of_month
    const monthsLabel = formatMonthList(props.transaction.months, getIntlLocale())
    const parts = [t('recurringList.frequencies.custom')]
    if (day) parts.push(t('recurringForm.dayShort', { day }))
    if (monthsLabel) parts.push(monthsLabel)
    return parts.join(' · ')
  }
  return t(`recurringList.frequencies.${props.transaction.frequency}`)
})

function handleClick() {
  emit('click', props.transaction)
}
</script>

<template>
  <li class="flex gap-2.5 py-3" @click="handleClick">
    <span class="m-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      :class="isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'"
      :title="t(`recurringList.kind.${transaction.kind}`)">
      <AppIcon :name="isIncome ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'" :size="14" />
    </span>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-start justify-between gap-2">
        <p class="truncate text-sm font-medium text-content">
          {{ categoryName }}
          <span class="text-[10px] text-content-subtle truncate">
            {{ transaction.note }}
          </span>
        </p>
        <p class="shrink-0 text-sm font-semibold" :class="isIncome ? 'text-income' : 'text-expense'">
          {{ isIncome ? '+' : '−' }}{{ formatCurrency(transaction.amount, { signDisplay: 'never' }) }}
        </p>
      </div>

      <p class="text-xs text-content-subtle">
        {{ scheduleLabel }}
        ·
        {{ endDateLabel }}
      </p>

      <p class="text-xs text-content">
        <span class="font-normal text-content-subtle">{{ t('recurringList.nextExecution') }}:</span>
        {{ formatDate(transaction.next_execution) }}
      </p>
    </div>
  </li>
</template>
