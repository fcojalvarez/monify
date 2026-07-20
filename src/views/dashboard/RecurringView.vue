<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { formatCurrency, formatDate } from '@/utils/format'
import { useI18n } from '@/i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const { t } = useI18n()
const items = ref<RecurringTransaction[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    items.value = await recurringTransactionsService.list()
  } catch (cause) {
    console.error('No se pudieron cargar las recurrencias.', cause)
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 class="text-2xl font-bold text-content">{{ t('recurringList.title') }}</h1>
        <p class="mt-1 text-sm text-content-muted">{{ t('recurringList.subtitle') }}</p>
      </header>

      <BaseCard class="p-4">
        <p v-if="loading" class="py-10 text-center text-sm text-content-muted">…</p>
        <p v-else-if="error" class="py-10 text-center text-sm text-expense">{{ t('recurringList.empty') }}</p>
        <div v-else-if="!items.length" class="py-10 text-center">
          <AppIcon name="solar:repeat-bold-duotone" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">{{ t('recurringList.empty') }}</p>
        </div>
        <ul v-else class="divide-y divide-line">
          <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-4">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              :class="item.kind === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'">
              <AppIcon :name="item.kind === 'income' ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'" :size="19" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-content">{{ item.note || t(`recurringList.frequencies.${item.frequency}`) }}</p>
              <p class="mt-0.5 text-xs text-content-muted">{{ t(`recurringList.frequencies.${item.frequency}`) }} · {{ item.end_on ? t('recurringList.end', { date: formatDate(item.end_on) }) : t('recurringList.noEnd') }}</p>
              <p class="mt-1 text-xs text-content-subtle">{{ t('recurringList.nextExecution') }}: {{ formatDate(item.next_execution) }}</p>
            </div>
            <p class="shrink-0 text-sm font-bold" :class="item.kind === 'income' ? 'text-income' : 'text-expense'">
              {{ item.kind === 'income' ? '+' : '−' }}{{ formatCurrency(item.amount) }}
            </p>
          </li>
        </ul>
      </BaseCard>
    </main>
  </div>
</template>
