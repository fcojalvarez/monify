<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ROUTE_NAMES } from '@/constants'
import type { TransactionWithRelations } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { monthRange } from '@/utils/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import BalanceSummary from '@/components/dashboard/BalanceSummary.vue'
import CategoryProgress from '@/components/dashboard/CategoryProgress.vue'
import TransactionItem from '@/components/transactions/TransactionItem.vue'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import CategoryManager from '@/components/categories/CategoryManager.vue'
import FamilyManager from '@/components/family/FamilyManager.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const auth = useAuthStore()
const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()

const { summary, annualSummary, usageByCategory, items, loading } = storeToRefs(transactions)

const activeMember = ref<string | null>(null)
const limitedUsage = computed(() =>
  usageByCategory.value.filter((u) => u.limit != null).slice(0, 5),
)

// Sheets
const showTransaction = ref(false)
const editingTransaction = ref<TransactionWithRelations | undefined>()
const showCategories = ref(false)
const showFamily = ref(false)
const categoryManagerRef = ref<InstanceType<typeof CategoryManager> | null>(null)
const familyManagerRef = ref<InstanceType<typeof FamilyManager> | null>(null)

function openNewTransaction() {
  editingTransaction.value = undefined
  showTransaction.value = true
}
function openEditTransaction(transaction: TransactionWithRelations) {
  editingTransaction.value = transaction
  showTransaction.value = true
}
async function onTransactionSaved() {
  showTransaction.value = false
  await transactions.fetch() // refresca respetando el filtro activo
}

async function selectMember(memberId: string | null) {
  activeMember.value = memberId
  await transactions.fetch({ familyMemberId: memberId ?? undefined })
}

onMounted(async () => {
  await Promise.all([categories.fetchAll(), family.fetchAll()])
  await transactions.fetch(monthRange())
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <AppHeader />

    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-content-muted">Hola,</p>
          <h1 class="text-2xl font-bold text-content">{{ auth.displayName || 'de nuevo' }} 👋</h1>
        </div>
        <div class="flex gap-1">
          <RouterLink
            :to="{ name: ROUTE_NAMES.history }"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content transition-colors"
            title="Ver histórico de movimientos"
            aria-label="Ver histórico de movimientos"
          >
            <AppIcon name="solar:bill-list-bold" :size="20" />
          </RouterLink>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line"
            aria-label="Gestionar categorías"
            @click="showCategories = true"
          >
            <AppIcon name="solar:widget-add-bold" :size="20" />
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line"
            aria-label="Gestionar familia"
            @click="showFamily = true"
          >
            <AppIcon name="solar:users-group-rounded-bold" :size="20" />
          </button>
        </div>
      </div>

      <BalanceSummary :monthly-summary="summary" :annual-summary="annualSummary" />

      <!-- Filtro por miembro de la familia -->
      <div v-if="family.items.length > 1" class="flex gap-2 overflow-x-auto pb-1">
        <button
          class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === null ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted'"
          @click="selectMember(null)"
        >
          Todos
        </button>
        <button
          v-for="member in family.items"
          :key="member.id"
          class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === member.id ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted'"
          @click="selectMember(member.id)"
        >
          {{ member.name }}
        </button>
      </div>

      <!-- Límites por categoría -->
      <BaseCard v-if="limitedUsage.length" as="section">
        <h2 class="mb-4 text-sm font-semibold text-content-muted">Límites por categoría</h2>
        <div class="space-y-4">
          <CategoryProgress v-for="usage in limitedUsage" :key="usage.category.id" :usage="usage" />
        </div>
      </BaseCard>

      <!-- Movimientos recientes -->
      <BaseCard as="section">
        <h2 class="mb-1 text-sm font-semibold text-content-muted">Movimientos recientes</h2>

        <div v-if="loading" class="py-10 text-center text-sm text-content-subtle">Cargando…</div>

        <div v-else-if="!items.length" class="py-10 text-center">
          <AppIcon name="solar:wallet-money-bold-duotone" :size="40" class="mx-auto text-content-subtle" />
          <p class="mt-2 text-sm text-content-muted">Aún no hay movimientos este mes.</p>
        </div>

        <ul v-else class="divide-y divide-line">
          <TransactionItem
            v-for="transaction in items"
            :key="transaction.id"
            :transaction="transaction"
            class="cursor-pointer"
            @click="openEditTransaction(transaction)"
          />
        </ul>
      </BaseCard>
    </main>

    <!-- Botón flotante: nuevo movimiento -->
    <button
      class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      aria-label="Añadir movimiento"
      @click="openNewTransaction"
    >
      <AppIcon name="solar:add-circle-bold" :size="22" />
      Añadir
    </button>

    <!-- Sheets -->
    <BaseSheet
      v-model="showTransaction"
      :title="editingTransaction ? 'Editar movimiento' : 'Nuevo movimiento'"
    >
      <TransactionForm
        :transaction="editingTransaction"
        @saved="onTransactionSaved"
        @cancel="showTransaction = false"
      />
    </BaseSheet>

    <BaseSheet v-model="showCategories" title="Categorías">
      <template #actions>
        <button
          v-if="categoryManagerRef?.view === 'list'"
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          aria-label="Nueva categoría"
          @click="categoryManagerRef?.openForm()"
        >
          <AppIcon name="solar:add-circle-bold" :size="22" />
        </button>
      </template>
      <CategoryManager ref="categoryManagerRef" />
    </BaseSheet>

    <BaseSheet v-model="showFamily" title="Familia">
      <template #actions>
        <button
          v-if="familyManagerRef?.view === 'list'"
          class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
          aria-label="Añadir miembro"
          @click="familyManagerRef?.openForm()"
        >
          <AppIcon name="solar:add-circle-bold" :size="22" />
        </button>
      </template>
      <FamilyManager ref="familyManagerRef" />
    </BaseSheet>
  </div>
</template>
