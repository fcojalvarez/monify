<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionWithRelations } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ transaction: TransactionWithRelations }>()
const { t } = useI18n()

const isIncome = computed(() => props.transaction.kind === 'income')
const isRecurring = computed(() => !!props.transaction.recurring_transaction_id)
</script>

<template>
  <li class="flex items-center gap-3 py-3">
    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
      :style="{ backgroundColor: transaction.category?.color ?? '#8a91ad' }">
      <AppIcon :name="transaction.category?.icon ?? 'solar:tag-bold'" :size="20" />
    </span>

    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="truncate text-sm font-medium text-content">
          {{ transaction.category?.name ?? 'Sin categoría' }}
        </p>
        <span v-if="isRecurring"
          class="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-500">
          <AppIcon name="solar:repeat-bold" :size="10" />
          {{ t('transaction.recurring') }}
        </span>
      </div>
      <p class="truncate text-xs text-content-subtle">
        {{ transaction.family_member?.name }} · {{ formatDate(transaction.occurred_on) }}
        <span v-if="transaction.note">· {{ transaction.note }}</span>
      </p>
    </div>

    <p class="shrink-0 text-sm font-semibold" :class="isIncome ? 'text-income' : 'text-expense'">
      {{ isIncome ? '+' : '−' }}{{ formatCurrency(transaction.amount, { signDisplay: 'never' }) }}
    </p>
  </li>
</template>
