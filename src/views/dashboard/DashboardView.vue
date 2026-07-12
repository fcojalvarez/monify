<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ROUTE_NAMES } from '@/constants'
import type { TransactionWithRelations } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useTransactionsStore } from '@/stores/transactions'
import { useSavingsStore } from '@/stores/savings'
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
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const categories = useCategoriesStore()
const family = useFamilyStore()
const transactions = useTransactionsStore()
const savingsStore = useSavingsStore()

const { summary, annualSummary, usageByCategory, items, loading } = storeToRefs(transactions)
const { items: savings } = storeToRefs(savingsStore)

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
const transactionFormRef = ref<InstanceType<typeof TransactionForm> | null>(null)

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

const ui = useUiStore()

const showSavingsPrompt = ref(false)

function activateSavings() {
  ui.setSavingsEnabled(true)
  ui.setSavingsPromptDismissed(true)
  showSavingsPrompt.value = false
}

function dismissSavingsPrompt() {
  ui.setSavingsPromptDismissed(true)
  showSavingsPrompt.value = false
}

onMounted(async () => {
  await Promise.all([
    categories.fetchAll(),
    family.fetchAll(),
    savingsStore.fetchAll(),
    transactions.fetch(monthRange()),
  ])

  if (!ui.savingsEnabled && !ui.savingsPromptDismissed) {
    setTimeout(() => {
      showSavingsPrompt.value = true
    }, 1000)
  }
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
          <RouterLink v-if="ui.savingsEnabled" :to="{ name: ROUTE_NAMES.savings }"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content transition-colors mr-1"
            title="Ver ahorros" aria-label="Ver ahorros">
            <AppIcon name="solar:safe-square-bold" :size="20" />
          </RouterLink>
          <RouterLink :to="{ name: ROUTE_NAMES.history }"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line hover:text-content transition-colors"
            title="Ver histórico de movimientos" aria-label="Ver histórico de movimientos">
            <AppIcon name="solar:bill-list-bold" :size="20" />
          </RouterLink>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line"
            aria-label="Gestionar categorías" @click="showCategories = true">
            <AppIcon name="solar:widget-add-bold" :size="20" />
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line"
            aria-label="Gestionar familia" @click="showFamily = true">
            <AppIcon name="solar:users-group-rounded-bold" :size="20" />
          </button>
        </div>
      </div>

      <!-- Banner discreto de invitación a ahorros -->
      <div v-if="showSavingsPrompt"
        class="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-card border border-violet-100 bg-violet-50/50 text-violet-950 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-200">
        <div class="flex gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100/80 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            <AppIcon name="solar:safe-2-bold-duotone" :size="22" />
          </span>
          <div>
            <h3 class="font-bold text-sm leading-snug text-content">¡Nueva función de ahorros!</h3>
            <p class="text-xs mt-0.5 text-content-muted leading-normal">
              Organiza tus ahorros, fija metas y aparta dinero de tu cuenta principal de forma muy sencilla.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field text-content hover:bg-surface-muted transition-colors"
            @click="dismissSavingsPrompt">
            No, gracias
          </button>
          <button type="button"
            class="text-xs font-semibold px-3 py-1.5 rounded-field bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
            @click="activateSavings">
            Activar ahorros
          </button>
        </div>
      </div>

      <BalanceSummary :monthly-summary="summary" :annual-summary="annualSummary" :savings="savings" />

      <!-- Filtro por miembro de la familia -->
      <div v-if="family.items.length > 1" class="flex gap-2 overflow-x-auto pb-1">
        <button class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === null ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted'"
          @click="selectMember(null)">
          Todos
        </button>
        <button v-for="member in family.items" :key="member.id"
          class="shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors"
          :class="activeMember === member.id ? 'bg-primary-500 text-white' : 'bg-surface-muted text-content-muted'"
          @click="selectMember(member.id)">
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
          <TransactionItem v-for="transaction in items" :key="transaction.id" :transaction="transaction"
            class="cursor-pointer" @click="openEditTransaction(transaction)" />
        </ul>
      </BaseCard>
    </main>

    <!-- Botón flotante: nuevo movimiento -->
    <button
      class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 md:right-[calc(50vw-20rem)] flex h-14 items-center gap-2 rounded-pill bg-primary-500 px-6 font-semibold text-white shadow-primary-glow transition-transform active:scale-95"
      aria-label="Añadir movimiento" @click="openNewTransaction">
      <AppIcon name="solar:add-circle-bold" :size="22" />
      Añadir
    </button>

    <!-- Sheets -->
    <BaseSheet v-model="showTransaction" :title="editingTransaction ? 'Editar movimiento' : 'Nuevo movimiento'"
      :has-changes="transactionFormRef?.hasChanges">
      <TransactionForm ref="transactionFormRef" :transaction="editingTransaction" @saved="onTransactionSaved"
        @cancel="showTransaction = false" />
    </BaseSheet>

    <BaseSheet v-model="showCategories" title="Categorías" :has-changes="categoryManagerRef?.hasChanges">
      <template #actions>
        <button v-if="categoryManagerRef?.view === 'list'" type="button"
          class="inline-flex h-7 items-center gap-2 rounded-full px-3 text-sm font-medium text-content-muted transition-colors hover:bg-surface-muted border border-primary-500"
          aria-label="Nueva categoría" @click="categoryManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" class="text-primary-500" :size="20" />
          <span class="text-primary-500">Añadir</span>
        </button>
      </template>
      <CategoryManager ref="categoryManagerRef" />
    </BaseSheet>

    <BaseSheet v-model="showFamily" title="Familia" :has-changes="familyManagerRef?.hasChanges">
      <template #actions>
        <button v-if="familyManagerRef?.view === 'list'"
          class="inline-flex h-7 items-center gap-2 rounded-full px-3 text-sm font-medium text-content-muted transition-colors hover:bg-surface-muted border border-primary-500"
          aria-label="Añadir miembro" @click="familyManagerRef?.openForm()">
          <AppIcon name="solar:add-circle-bold" class="text-primary-500" :size="20" />
          <span class="text-primary-500">Añadir</span>
        </button>
      </template>
      <FamilyManager ref="familyManagerRef" />
    </BaseSheet>

  </div>
</template>
