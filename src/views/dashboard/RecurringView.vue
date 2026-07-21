<script setup lang="ts">
import { onMounted, ref, defineAsyncComponent } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import { formatCurrency, formatDate } from '@/utils/format'
import { useI18n } from '@/i18n'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import RecurringItem from '@/components/transactions/RecurringItem.vue'

const RecurringForm = defineAsyncComponent(() => import('@/components/transactions/RecurringForm.vue'))

const { t } = useI18n()
const items = ref<RecurringTransaction[]>([])
const loading = ref(true)
const error = ref(false)

const showEdit = ref(false)
const editingItem = ref<RecurringTransaction>()
const recurringFormRef = ref<InstanceType<typeof RecurringForm> | null>(null)

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

function openEdit(item: RecurringTransaction) {
  editingItem.value = item
  showEdit.value = true
}

async function onSaved() {
  showEdit.value = false
  try {
    items.value = await recurringTransactionsService.list()
  } catch (cause) {
    console.error('No se pudieron cargar las recurrencias.', cause)
    error.value = true
  }
}
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <BaseCard as="section">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-content-muted m-0">
            {{ t('recurringList.title') }}
          </h2>
        </div>

        <div v-if="loading" class="py-10 text-center text-sm text-content-subtle">
          Cargando…
        </div>

        <div v-else-if="error" class="py-10 text-center text-sm text-content-subtle">
          {{ t('recurringList.empty') }}
        </div>

        <div v-else-if="!items.length" class="py-10 text-center">
          <AppIcon name="solar:repeat-bold-duotone" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">
            {{ t('recurringList.empty') }}
          </p>
        </div>
        <ul v-else class="divide-y divide-line">
          <RecurringItem v-for="item in items" :key="item.id" :transaction="item"
            class="cursor-pointer" @click="openEdit(item)" />
        </ul>
      </BaseCard>
    </main>

    <BaseSheet v-model="showEdit" title="Editar movimiento recurrente" :has-changes="recurringFormRef?.hasChanges">
      <RecurringForm v-if="editingItem" ref="recurringFormRef" :transaction="editingItem" @saved="onSaved"
        @cancel="showEdit = false" />
    </BaseSheet>
  </div>
</template>
