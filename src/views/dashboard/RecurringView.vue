<script setup lang="ts">
import { onMounted, ref, defineAsyncComponent } from 'vue'
import type { RecurringTransaction } from '@/services/recurring-transactions.service'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
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

const showForm = ref(false)
const editingItem = ref<RecurringTransaction>()
const recurringFormRef = ref<InstanceType<typeof RecurringForm> | null>(null)

function openNew() {
  editingItem.value = undefined
  showForm.value = true
}

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
  showForm.value = true
}

async function onSaved() {
  showForm.value = false
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
          <RecurringItem v-for="item in items" :key="item.id" :transaction="item" class="cursor-pointer"
            @click="openEdit(item)" />
        </ul>
      </BaseCard>
    </main>

    <button
      class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      aria-label="Añadir movimiento recurrente" @click="openNew">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      Añadir
    </button>

    <BaseSheet v-model="showForm"
      :title="editingItem ? t('recurringForm.title') : t('recurringForm.createTitle')"
      :has-changes="recurringFormRef?.hasChanges">
      <RecurringForm ref="recurringFormRef" :transaction="editingItem" @saved="onSaved"
        @cancel="showForm = false" />
    </BaseSheet>
  </div>
</template>
