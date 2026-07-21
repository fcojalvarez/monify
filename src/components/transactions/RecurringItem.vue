<script setup lang="ts">
import { computed } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { formatCurrency, formatDate } from '@/utils/format'
import { useI18n } from '@/i18n'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ transaction: RecurringTransaction }>()
const emit = defineEmits<{ click: [transaction: RecurringTransaction] }>()
const { t } = useI18n()

const isIncome = computed(() => props.transaction.kind === 'income')

function handleClick() {
  emit('click', props.transaction)
}
</script>

<template>
  <li class="flex items-center gap-3 py-3" @click="handleClick">
    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      :class="isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'">
      <AppIcon :name="isIncome ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'" :size="20" />
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-content">
        {{ transaction.note || t(`recurringList.frequencies.${transaction.frequency}`) }}
      </p>
      <p class="truncate text-xs text-content-subtle">
        {{ t(`recurringList.frequencies.${transaction.frequency}`) }} · {{ transaction.end_on ? t('recurringList.end', {
          date: formatDate(transaction.end_on)
        }) : t('recurringList.noEnd') }}
      </p>
      <p class="mt-1 text-[11px] text-content-subtle">
        {{ t('recurringList.nextExecution') }}: {{ formatDate(transaction.next_execution) }}
      </p>
    </div>

    <p class="shrink-0 text-sm font-semibold" :class="isIncome ? 'text-income' : 'text-expense'">
      {{ isIncome ? '+' : '−' }}{{ formatCurrency(transaction.amount, { signDisplay: 'never' }) }}
    </p>
  </li>
</template>
