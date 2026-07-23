<template>
  <div class="min-h-dvh bg-surface pb-12">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <!-- Cabecera -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-2xl font-bold text-content">
              {{ t('savings.title') }}
            </h1>

            <p class="text-xs text-content-muted">
              {{ t('savings.subtitle') }}
            </p>
          </div>
        </div>

        <div class="relative">
          <button
            class="flex h-10 items-center gap-2 rounded-pill bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
            @click="showAddDropdown = !showAddDropdown">
            <AppIcon name="solar:settings-bold" :size="18" />
            {{ t('savings.manage') }}
          </button>

          <div v-if="showAddDropdown" class="fixed inset-0 z-10" @click="showAddDropdown = false" />

          <div v-if="showAddDropdown"
            class="absolute right-0 z-20 mt-2 w-56 space-y-1 rounded-card border border-line bg-surface-raised p-2 shadow-raised">
            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openGlobalTransfer(true); showAddDropdown = false">
              <AppIcon name="solar:arrow-right-up-linear" class="text-income" :size="16" />
              {{ t('savings.contribute') }}
            </button>

            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openGlobalTransfer(false); showAddDropdown = false">
              <AppIcon name="solar:arrow-right-up-linear" class="rotate-180 text-expense" :size="16" />
              {{ t('savings.withdrawSaving') }}
            </button>

            <div class="my-1 h-px bg-line" />

            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openAddGoal(); showAddDropdown = false">
              <AppIcon name="solar:target-bold" class="text-primary-500" :size="16" />
              {{ t('savings.newGoal') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="rounded-card bg-gradient-to-br from-violet-600 to-indigo-900 p-6 text-white shadow-raised">
        <div class="flex items-center gap-2 text-white/70">
          <AppIcon name="solar:safe-2-bold" :size="20" />
          <span class="text-sm">
            {{ t('savings.totalSaving') }}
          </span>
        </div>

        <p class="mt-2 text-4xl font-bold">
          {{ formatCurrency(totalSavingsBalance, { currency: ui.currency }) }}
        </p>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-field bg-white/10 p-4">
            <p class="text-xs uppercase text-white/70">
              {{ t('savings.bank') }}
            </p>

            <p class="mt-1 text-xl font-bold">
              {{ formatCurrency(bankSavingsBalance, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-field bg-white/10 p-4">
            <p class="text-xs uppercase text-white/70">
              {{ t('savings.cash') }}
            </p>

            <p class="mt-1 text-xl font-bold">
              {{ formatCurrency(cashSavingsBalance, { currency: ui.currency }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Lista de Metas -->
      <BaseSpinner v-if="savingsStore.loading" :message="t('savings.loading')" />

      <div v-else class="grid animate-fade-in gap-4">
        <EmptyState v-if="displayGoals.length === 0" icon="solar:target-linear"
          :title="t('savings.emptyGoals')" :description="t('savings.emptyGoalsHint')" />

        <BaseCard v-else v-for="goal in displayGoals" :key="goal.id" class="space-y-4 p-5">
          <div>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  :style="{ backgroundColor: goal.color }">
                  <AppIcon name="solar:safe-bold" :size="18" />
                </span>

                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-content">
                      {{ goal.name }}
                    </h3>

                    <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      :class="goal.type === 'bank' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'">
                      <AppIcon :name="goal.type === 'bank' ? 'solar:card-bold' : 'solar:wallet-money-bold'"
                        :size="10" />
                      {{ goal.type === 'bank' ? t('savings.bank') : t('savings.cash') }}
                    </span>
                  </div>

                  <p class="mt-1 text-xs text-content-subtle">
                    {{
                      goal.target
                        ? t('savings.goalTargetAmount', { amount: formatCurrency(goal.target, { currency: ui.currency }) })
                        : t('savings.freeSaving')
                    }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <!-- Botón de Marcar como completada -->
                <button v-if="goal.target && goal.balance >= goal.target" type="button"
                  :title="t('savings.completeTitle')"
                  class="flex h-8 items-center gap-1 rounded-pill bg-income/10 px-2.5 text-xs font-semibold text-income hover:bg-income/20 transition"
                  @click="openCompleteGoal(goal)">
                  <AppIcon name="solar:check-circle-bold" :size="14" />
                  {{ t('savings.complete') }}
                </button>

                <button type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
                  @click="openEditGoal(goal)">
                  <AppIcon name="solar:pen-2-linear" :size="16" />
                </button>

                <button type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-expense hover:bg-expense-light/20"
                  @click="openDeleteGoal(goal)">
                  <AppIcon name="solar:trash-bin-trash-linear" :size="16" />
                </button>
              </div>
            </div>

            <!-- Barra de progreso si tiene meta física -->
            <div v-if="goal.target" class="mt-5">
              <div class="mb-2 flex justify-between text-xs">
                <span class="font-semibold text-content">
                  {{ formatCurrency(goal.balance, { currency: ui.currency }) }}
                </span>

                <span class="text-content-subtle">
                  {{ Math.min(100, Math.round((goal.balance / goal.target) * 100)) }}%
                </span>
              </div>

              <div class="h-2 overflow-hidden rounded-full bg-line">
                <div class="h-full rounded-full transition-all" :style="{
                  width: `${Math.min(100, Math.round((goal.balance / goal.target) * 100))}%`,
                  backgroundColor: goal.color,
                }" />
              </div>
            </div>

            <!-- Balance plano si no tiene target -->
            <div v-else class="mt-5 flex items-center justify-between">
              <span class="text-xs text-content-subtle">
                {{ t('savings.balance') }}
              </span>

              <span class="text-lg font-bold text-content">
                {{ formatCurrency(goal.balance, { currency: ui.currency }) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <BaseButton type="button" variant="secondary" @click="openGoalTransfer(goal, false)">
              <AppIcon name="solar:arrow-right-up-linear" class="mr-2 rotate-180" :size="16" />
              {{ t('savings.withdraw') }}
            </BaseButton>

            <BaseButton type="button" class="text-white hover:opacity-90" :style="{ backgroundColor: goal.color }"
              @click="openGoalTransfer(goal, true)">
              <AppIcon name="solar:arrow-right-up-linear" class="mr-2" :size="16" />
              {{ t('savings.contributeShort') }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Historial -->
      <BaseCard as="section" class="space-y-4 p-5">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-content-muted">
          {{ t('savings.historyTitle') }}
        </h2>

        <BaseSpinner v-if="savingsStore.loading && !savingsStore.transactions.length" />

        <EmptyState v-else-if="!savingsStore.transactions.length" icon="solar:clock-circle-linear"
          :title="t('savings.emptyHistory')" />

        <ul v-else class="animate-fade-in divide-y divide-line">
          <li v-for="tx in savingsStore.transactions" :key="tx.id"
            class="flex cursor-pointer items-center justify-between py-3 -mx-2 rounded-field px-2 transition-colors hover:bg-surface-muted"
            @click="openEditMovement(tx)">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-full text-white"
                :style="{ backgroundColor: getAccountColor(tx.savings_id) }">
                <AppIcon :name="tx.amount > 0
                  ? 'solar:arrow-down-linear'
                  : 'solar:arrow-up-linear'" :size="16" />
              </span>

              <div>
                <p class="text-sm font-medium text-content">
                  {{
                    tx.note ||
                    (tx.amount > 0
                      ? t('savings.contributionNote')
                      : t('savings.withdrawalNote'))
                  }}
                </p>

                <p class="text-xs text-content-subtle">
                  {{ getAccountName(tx.savings_id) }}
                  ·
                  {{ formatDate(tx.occurred_on) }}
                </p>
              </div>
            </div>

            <span class="text-sm font-bold" :class="tx.amount > 0 ? 'text-income' : 'text-expense'">
              {{ tx.amount > 0 ? '+' : '' }}
              {{ formatCurrency(tx.amount, { currency: ui.currency }) }}
            </span>
          </li>
        </ul>
      </BaseCard>
    </main>

    <!-- Diálogo: Crear / Editar Meta -->
    <BaseDialog v-model="showAddGoalDialog"
      :title="editingGoal ? t('savings.editGoalTitle') : t('savings.newGoalTitle')">
      <form @submit.prevent="saveGoal" class="space-y-4 pt-2">
        <BaseInput v-model="goalForm.name" :label="t('savings.goalName')"
          :placeholder="t('savings.goalNamePlaceholder')" required />

        <BaseInput v-model="goalForm.target" :label="t('savings.goalTarget')" type="number" step="any"
          :placeholder="t('savings.goalTargetPlaceholder')">
          <template v-slot:label-slot>
            <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
          </template>
        </BaseInput>

        <BaseSelect v-model="goalForm.type" :label="t('savings.fundLocation')" :options="savingTypeOptions" required />

        <div class="space-y-2">
          <label class="text-xs font-semibold text-content-muted">{{ t('savings.colorLabel') }}</label>
          <ColorPicker v-model="goalForm.color" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <BaseButton type="button" variant="secondary" @click="showAddGoalDialog = false">{{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" variant="primary">{{ t('savings.saveGoal') }}</BaseButton>
        </div>
      </form>
    </BaseDialog>

    <!-- Diálogo: Confirmar Finalización (Completar Meta) -->
    <BaseDialog v-model="showCompleteDialog" :title="t('savings.completeQuestion')">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-content-muted">
          {{ t('savings.completeText1', { name: goalToComplete?.name ?? '' }) }}
        </p>
        <p class="text-sm text-content-muted">
          {{ t('savings.completeText2') }}
        </p>
        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" @click="showCompleteDialog = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="button" variant="primary" @click="confirmCompleteGoal">
            {{ t('savings.confirm') }}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>

    <!-- Diálogo: Confirmar Eliminación -->
    <BaseDialog v-model="showDeleteDialog" :title="t('savings.deleteQuestion')">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-content-muted">
          {{ t('savings.deleteText1', { name: goalToDelete?.name ?? '' }) }}
        </p>
        <p class="text-sm text-content-muted">
          {{ t('savings.deleteText2') }}
        </p>
        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" @click="showDeleteDialog = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="button" variant="danger" @click="confirmDeleteGoal">
            {{ t('savings.confirm') }}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>

    <!-- Diálogo: Transferencias -->
    <BaseDialog v-model="showTransferDialog"
      :title="transferForm.isDeposit ? t('savings.transferDepositTitle') : t('savings.transferWithdrawTitle')">
      <form @submit.prevent="executeTransfer" class="space-y-4 pt-2">

        <BaseSelect v-if="transferForm.isGlobal" v-model="transferForm.type" :label="t('savings.fundLocation')"
          :options="savingTypeOptions" required />

        <p v-else class="text-xs text-content-muted">
          {{ t('savings.account') }}: <span class="font-bold text-content">{{ getAccountName(transferAccount?.id ?? '')
          }}</span>
        </p>

        <BaseInput v-model="transferForm.amount" :label="t('savings.amount')" type="number" step="any"
          placeholder="0.00" required min="0.01" />

        <BaseInput v-model="transferForm.note" :label="t('savings.noteLabel')"
          :placeholder="t('savings.transferNotePlaceholder')" />

        <BaseSelect v-model="transferForm.familyMemberId" :label="t('savings.member')" :options="memberOptions"
          required />

        <div class="flex items-start gap-2 py-1">
          <input id="createMainTx" type="checkbox" v-model="transferForm.createMainTx"
            class="mt-1 rounded border-line text-primary-500 focus:ring-primary-500" />
          <label for="createMainTx" class="text-xs text-content-muted select-none">
            {{ t('savings.reflectMain', {
              kind: transferForm.isDeposit ? t('savings.kindExpense') :
                t('savings.kindIncome')
            }) }}
          </label>
        </div>

        <p v-if="transferError" class="text-xs text-expense font-medium">
          {{ transferError }}
        </p>

        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" :disabled="transferring" @click="showTransferDialog = false">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton type="submit" variant="primary" :loading="transferring">
            {{ t('savings.confirm') }}
          </BaseButton>
        </div>
      </form>
    </BaseDialog>

    <!-- Hoja de edición de movimiento de ahorro -->
    <BaseSheet v-model="showEditSheet" :title="t('savings.edit.title')" :has-changes="editFormRef?.hasChanges">
      <SavingsMovementForm v-if="editingMovement" ref="editFormRef" :transaction="editingMovement"
        @saved="onMovementEdited" @cancel="showEditSheet = false" />
    </BaseSheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'

import { useSavingsStore } from '@/stores/savings'
import { useFamilyStore } from '@/stores/family'
import { useUiStore } from '@/stores/ui'

import { formatCurrency, formatDate } from '@/utils/format'
import { savingsAccountLabel, savingsAccountColor } from '@/utils/savings'
import { useI18n } from '@/i18n'

import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const ColorPicker = defineAsyncComponent(() => import('@/components/ui/ColorPicker.vue'))
const SavingsMovementForm = defineAsyncComponent(() => import('@/components/savings/SavingsMovementForm.vue'))

import type { Savings, SavingsTransaction } from '@/types'

const savingsStore = useSavingsStore()
const familyStore = useFamilyStore()
const ui = useUiStore()
const { t } = useI18n()

// Estado
const showAddGoalDialog = ref(false)
const showCompleteDialog = ref(false)
const showDeleteDialog = ref(false)
const showTransferDialog = ref(false)
const showAddDropdown = ref(false)

const editingGoal = ref<Savings | null>(null)
const goalToComplete = ref<Savings | null>(null)
const goalToDelete = ref<Savings | null>(null)
const transferAccount = ref<Savings | null>(null)

const goalForm = ref({
  name: '',
  target: null as string | number | null,
  color: '#8b5cf6',
  type: 'bank' as 'bank' | 'cash'
})

const transferForm = ref({
  amount: '' as string | number | null,
  isDeposit: true,
  isGlobal: false,
  type: 'bank' as 'bank' | 'cash',
  note: '',
  familyMemberId: '',
  createMainTx: true
})

const transferError = ref<string | null>(null)
const transferring = ref(false)

// Edición de movimientos
const showEditSheet = ref(false)
const editingMovement = ref<SavingsTransaction | undefined>()
const editFormRef = ref<InstanceType<typeof SavingsMovementForm> | null>(null)

const savingTypeOptions = computed(() => [
  { value: 'bank', label: t('savings.bank') },
  { value: 'cash', label: t('savings.cash') },
])

// Computados
const bankSavingsBalance = computed(() => savingsStore.bankBalance)
const cashSavingsBalance = computed(() => savingsStore.cashBalance)
const totalSavingsBalance = computed(() => bankSavingsBalance.value + cashSavingsBalance.value)

const displayGoals = computed(() => {
  return savingsStore.items.filter((s) => s.name !== 'general' && s.status === 'active')
})

const memberOptions = computed(() =>
  familyStore.items.map((member) => ({
    value: String(member.id),
    label: member.name,
  })),
)

// Crear / Editar ahorro
function openAddGoal() {
  editingGoal.value = null
  goalForm.value = {
    name: '',
    target: null,
    color: '#8b5cf6',
    type: 'bank',
  }
  showAddGoalDialog.value = true
}

function openEditGoal(goal: Savings) {
  editingGoal.value = goal
  goalForm.value = {
    name: goal.name,
    target: goal.target ? Number(goal.target) : null,
    color: goal.color,
    type: goal.type,
  }
  showAddGoalDialog.value = true
}

async function saveGoal() {
  const payload = {
    name: goalForm.value.name.trim(),
    target: goalForm.value.target !== null && goalForm.value.target !== ''
      ? Number(goalForm.value.target)
      : null,
    color: goalForm.value.color,
    type: goalForm.value.type,
  }

  if (!payload.name) return

  if (editingGoal.value) {
    await savingsStore.update(editingGoal.value.id, payload)
  } else {
    await savingsStore.create(payload)
  }

  showAddGoalDialog.value = false
}

// Completar Meta
function openCompleteGoal(goal: Savings) {
  goalToComplete.value = goal
  showCompleteDialog.value = true
}

async function confirmCompleteGoal() {
  if (!goalToComplete.value) return
  try {
    await savingsStore.complete(goalToComplete.value.id)
    showCompleteDialog.value = false
  } catch (error) {
    console.error('Error al completar la meta de ahorro:', error)
  }
}

// Eliminar
function openDeleteGoal(goal: Savings) {
  goalToDelete.value = goal
  showDeleteDialog.value = true
}

async function confirmDeleteGoal() {
  if (!goalToDelete.value) return
  await savingsStore.remove(goalToDelete.value.id)
  showDeleteDialog.value = false
}

// Transferencias
function openGlobalTransfer(isDeposit: boolean) {
  transferAccount.value = null
  transferForm.value = {
    amount: null,
    isDeposit,
    isGlobal: true,
    type: 'bank',
    note: '',
    familyMemberId: familyStore.self?.id ?? (familyStore.items[0]?.id ? String(familyStore.items[0].id) : ''),
    createMainTx: false,
  }
  transferError.value = null
  showTransferDialog.value = true
}

function openGoalTransfer(goal: Savings, isDeposit: boolean) {
  transferAccount.value = goal
  transferForm.value = {
    amount: null,
    isDeposit,
    isGlobal: false,
    type: goal.type,
    note: '',
    familyMemberId: familyStore.self?.id ?? (familyStore.items[0]?.id ? String(familyStore.items[0].id) : ''),
    createMainTx: false,
  }
  transferError.value = null
  showTransferDialog.value = true
}

async function executeTransfer() {
  let targetSavingsId = ''

  if (transferForm.value.isGlobal) {
    const generalAccount = savingsStore.items.find(
      (s) => s.name === 'general' && s.type === transferForm.value.type
    )
    if (!generalAccount) {
      transferError.value = t('savings.errors.fundNotFound')
      return
    }
    targetSavingsId = generalAccount.id
  } else {
    if (!transferAccount.value) return
    targetSavingsId = transferAccount.value.id
  }

  const amount = Number(transferForm.value.amount)

  if (!transferForm.value.amount || isNaN(amount) || amount <= 0) {
    transferError.value = t('savings.errors.invalidAmount')
    return
  }

  if (!transferForm.value.isDeposit) {
    const currentAccount = savingsStore.items.find((s) => s.id === targetSavingsId)
    if (currentAccount && amount > currentAccount.balance) {
      transferError.value = t('savings.errors.cannotWithdrawMore')
      return
    }
  }

  try {
    transferring.value = true
    transferError.value = null

    await savingsStore.transfer({
      savingsId: targetSavingsId,
      amount,
      isDeposit: transferForm.value.isDeposit,
      note: transferForm.value.note,
      familyMemberId: transferForm.value.familyMemberId,
      shouldCreateMainTransaction: transferForm.value.createMainTx,
    })

    showTransferDialog.value = false
  } catch (error) {
    transferError.value = error instanceof Error ? error.message : t('savings.errors.generic')
  } finally {
    transferring.value = false
  }
}

// Edición de movimientos
function openEditMovement(tx: SavingsTransaction) {
  editingMovement.value = tx
  showEditSheet.value = true
}

async function onMovementEdited() {
  showEditSheet.value = false
}

// Helpers (delegan en las utilidades compartidas de etiquetas de cuenta)
const getAccountName = (id: string) =>
  savingsAccountLabel(savingsStore.items.find((s) => s.id === id))
const getAccountColor = (id: string) =>
  savingsAccountColor(savingsStore.items.find((s) => s.id === id))

onMounted(async () => {
  await Promise.all([
    savingsStore.fetchAll(),
    familyStore.fetchAll(),
  ])
})
</script>
