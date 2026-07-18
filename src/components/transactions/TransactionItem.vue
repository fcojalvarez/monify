<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionWithRelations } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ transaction: TransactionWithRelations }>()

const isIncome = computed(() => props.transaction.kind === 'income')
</script>

<template>
  <li class="flex items-center gap-3 py-3">
    <span
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
      :style="{ backgroundColor: transaction.category?.color ?? '#8a91ad' }"
    >
      <AppIcon :name="transaction.category?.icon ?? 'solar:tag-bold'" :size="20" />
    </span>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-content">
        {{ transaction.category?.name ?? 'Sin categoría' }}
      </p>
      <p class="truncate text-xs text-content-subtle">
        {{ transaction.family_member?.name }} · {{ formatDate(transaction.occurred_on) }}
        <span v-if="transaction.note">· {{ transaction.note }}</span>
      </p>
    </div>

    <p
      class="shrink-0 text-sm font-semibold"
      :class="isIncome ? 'text-income' : 'text-expense'"
    >
      {{ isIncome ? '+' : '−' }}{{ formatCurrency(transaction.amount, { signDisplay: 'never' }) }}
    </p>
  </li>
</template>
