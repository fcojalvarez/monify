<template>
  <div class="min-h-dvh bg-surface pb-24">
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <!-- Cabecera -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-2xl font-bold text-content">
              Mis Ahorros
            </h1>

            <p class="text-xs text-content-muted">
              Gestiona tus ahorros bancarios y en efectivo
            </p>
          </div>
        </div>

        <div class="relative">
          <button
            class="flex h-10 items-center gap-2 rounded-pill bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
            @click="showAddDropdown = !showAddDropdown">
            <AppIcon name="solar:settings-bold" :size="18" />
            gestionar
          </button>

          <div v-if="showAddDropdown" class="fixed inset-0 z-10" @click="showAddDropdown = false" />

          <div v-if="showAddDropdown"
            class="absolute right-0 z-20 mt-2 w-56 space-y-1 rounded-card border border-line bg-surface-raised p-2 shadow-raised">
            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openGlobalTransfer(true); showAddDropdown = false">
              <AppIcon name="solar:arrow-right-up-linear" class="text-income" :size="16" />
              Aportar ahorro
            </button>

            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openGlobalTransfer(false); showAddDropdown = false">
              <AppIcon name="solar:arrow-right-up-linear" class="rotate-180 text-expense" :size="16" />
              Retirar ahorro
            </button>

            <div class="my-1 h-px bg-line" />

            <button
              class="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="openAddGoal(); showAddDropdown = false">
              <AppIcon name="solar:target-bold" class="text-primary-500" :size="16" />
              Nueva meta
            </button>
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="rounded-card bg-gradient-to-br from-violet-600 to-indigo-900 p-6 text-white shadow-raised">
        <div class="flex items-center gap-2 text-white/70">
          <AppIcon name="solar:safe-2-bold" :size="20" />
          <span class="text-sm">
            Ahorro total
          </span>
        </div>

        <p class="mt-2 text-4xl font-bold">
          {{ formatCurrency(totalSavingsBalance, { currency: ui.currency }) }}
        </p>

        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-field bg-white/10 p-4">
            <p class="text-xs uppercase text-white/70">
              Banco
            </p>

            <p class="mt-1 text-xl font-bold">
              {{ formatCurrency(bankSavingsBalance, { currency: ui.currency }) }}
            </p>
          </div>

          <div class="rounded-field bg-white/10 p-4">
            <p class="text-xs uppercase text-white/70">
              Efectivo
            </p>

            <p class="mt-1 text-xl font-bold">
              {{ formatCurrency(cashSavingsBalance, { currency: ui.currency }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Lista de Metas -->
      <div v-if="savingsStore.loading" class="py-12 text-center text-content-subtle">
        Cargando...
      </div>

      <div v-else-if="!displayGoals.length"
        class="rounded-card border border-dashed border-line bg-surface-raised py-8 text-center">
        <p class="font-medium text-content">
          No existen metas de ahorro activas.
        </p>

        <p class="mt-2 text-xs text-content-subtle">
          Pulsa en Gestionar → Nueva meta para crear una.
        </p>
      </div>

      <div v-else class="grid gap-4">
        <BaseCard v-for="goal in displayGoals" :key="goal.id" class="space-y-4 p-5">
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
                      {{ goal.type === 'bank' ? 'Banco' : 'Efectivo' }}
                    </span>
                  </div>

                  <p class="mt-1 text-xs text-content-subtle">
                    {{
                      goal.target
                        ? `Meta: ${formatCurrency(goal.target, { currency: ui.currency })}`
                        : 'Ahorro libre'
                    }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <!-- Botón de Marcar como completada -->
                <button v-if="goal.target && goal.balance >= goal.target" type="button" title="Marcar como completada"
                  class="flex h-8 items-center gap-1 rounded-pill bg-income/10 px-2.5 text-xs font-semibold text-income hover:bg-income/20 transition"
                  @click="openCompleteGoal(goal)">
                  <AppIcon name="solar:check-circle-bold" :size="14" />
                  Completar
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
                Balance
              </span>

              <span class="text-lg font-bold text-content">
                {{ formatCurrency(goal.balance, { currency: ui.currency }) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <BaseButton type="button" variant="secondary" @click="openGoalTransfer(goal, false)">
              <AppIcon name="solar:arrow-right-up-linear" class="mr-2 rotate-180" :size="16" />
              Retirar
            </BaseButton>

            <BaseButton type="button" class="text-white hover:opacity-90" :style="{ backgroundColor: goal.color }"
              @click="openGoalTransfer(goal, true)">
              <AppIcon name="solar:arrow-right-up-linear" class="mr-2" :size="16" />
              Aportar
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Historial -->
      <BaseCard as="section" class="space-y-4 p-5">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-content-muted">
          Historial de movimientos
        </h2>

        <div v-if="!savingsStore.transactions.length" class="py-8 text-center text-xs text-content-subtle">
          Todavía no hay movimientos.
        </div>

        <ul v-else class="divide-y divide-line">
          <li v-for="tx in savingsStore.transactions" :key="tx.id" class="flex items-center justify-between py-3">
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
                      ? 'Aportación'
                      : 'Retirada')
                  }}
                </p>

                <p class="text-xs text-content-subtle">
                  {{ getAccountName(tx.savings_id) }}
                  ·
                  {{ tx.occurred_on }}
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
    <BaseDialog v-model="showAddGoalDialog" :title="editingGoal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'">
      <form @submit.prevent="saveGoal" class="space-y-4 pt-2">
        <BaseInput v-model="goalForm.name" label="Nombre de la meta" placeholder="Ej. Fondo de emergencia" required />

        <BaseInput v-model="goalForm.target" label="Objetivo de ahorro (Opcional)" type="number" step="any"
          placeholder="Ej. 5000" />

        <BaseSelect v-model="goalForm.type" label="Ubicación del fondo" :options="savingTypeOptions" required />

        <div class="space-y-2">
          <label class="text-xs font-semibold text-content-muted">Color identificador</label>
          <ColorPicker v-model="goalForm.color" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <BaseButton type="button" variant="secondary" @click="showAddGoalDialog = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary">Guardar Meta</BaseButton>
        </div>
      </form>
    </BaseDialog>

    <!-- Diálogo: Confirmar Finalización (Completar Meta) -->
    <BaseDialog v-model="showCompleteDialog" title="¿Completar meta de ahorro?">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-content-muted">
          Si confirmas la finalización de <strong class="text-content">"{{ goalToComplete?.name }}"</strong>, esta meta
          ya no se volverá a mostrar en la lista activa.
        </p>
        <p class="text-sm text-content-muted">
          Sus movimientos <strong class="text-content">seguirán estando disponibles en el historial</strong>. Si lo que
          deseas es eliminar de forma permanente todo lo relacionado con ella, debes usar la opción de eliminar.
        </p>
        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" @click="showCompleteDialog = false">
            Cancelar
          </BaseButton>
          <BaseButton type="button" variant="primary" @click="confirmCompleteGoal">
            Confirmar
          </BaseButton>
        </div>
      </div>
    </BaseDialog>

    <!-- Diálogo: Confirmar Eliminación -->
    <BaseDialog v-model="showDeleteDialog" title="¿Eliminar meta de ahorro?">
      <div class="space-y-4 pt-2">
        <p class="text-sm text-content-muted">
          Al eliminar la meta <strong class="text-content">"{{ goalToDelete?.name }}"</strong> se borrará de forma
          permanente **todo lo relacionado con ella, incluyendo su historial de movimientos**.
        </p>
        <p class="text-sm text-content-muted">
          Si solo quieres que la meta deje de mostrarse sin perder sus registros del historial, cancela esta acción y
          márcala como **completada**.
        </p>
        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" @click="showDeleteDialog = false">
            Cancelar
          </BaseButton>
          <BaseButton type="button" variant="danger" @click="confirmDeleteGoal">
            Confirmar
          </BaseButton>
        </div>
      </div>
    </BaseDialog>

    <!-- Diálogo: Transferencias -->
    <BaseDialog v-model="showTransferDialog" :title="transferForm.isDeposit ? 'Aportar Dinero' : 'Retirar Dinero'">
      <form @submit.prevent="executeTransfer" class="space-y-4 pt-2">

        <BaseSelect v-if="transferForm.isGlobal" v-model="transferForm.type" label="Ubicación del fondo"
          :options="savingTypeOptions" required />

        <p v-else class="text-xs text-content-muted">
          Cuenta: <span class="font-bold text-content">{{ getAccountName(transferAccount?.id ?? '') }}</span>
        </p>

        <BaseInput v-model="transferForm.amount" label="Importe" type="number" step="any" placeholder="0.00" required
          min="0.01" />

        <BaseInput v-model="transferForm.note" label="Nota / Concepto" placeholder="Ej. Ahorro mensual" />

        <BaseSelect v-model="transferForm.familyMemberId" label="Miembro de la familia" :options="memberOptions"
          required />

        <div class="flex items-start gap-2 py-1">
          <input id="createMainTx" type="checkbox" v-model="transferForm.createMainTx"
            class="mt-1 rounded border-line text-primary-500 focus:ring-primary-500" />
          <label for="createMainTx" class="text-xs text-content-muted select-none">
            Reflejar movimiento en la cuenta principal de transacciones (como {{ transferForm.isDeposit ? 'gasto' :
              'ingreso' }})
          </label>
        </div>

        <p v-if="transferError" class="text-xs text-expense font-medium">
          {{ transferError }}
        </p>

        <div class="grid grid-cols-2 gap-3 w-full pt-4">
          <BaseButton type="button" variant="secondary" :disabled="transferring" @click="showTransferDialog = false">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" variant="primary" :loading="transferring">
            Confirmar
          </BaseButton>
        </div>
      </form>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'

import { useSavingsStore } from '@/stores/savings'
import { useFamilyStore } from '@/stores/family'
import { useUiStore } from '@/stores/ui'

import { formatCurrency } from '@/utils/format'

import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const ColorPicker = defineAsyncComponent(() => import('@/components/ui/ColorPicker.vue'))

import type { Savings } from '@/types'

const savingsStore = useSavingsStore()
const familyStore = useFamilyStore()
const ui = useUiStore()

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

const savingTypeOptions = [
  { value: 'bank', label: 'Banco' },
  { value: 'cash', label: 'Efectivo' },
]

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
      transferError.value = 'No se ha encontrado el fondo base correspondiente.'
      return
    }
    targetSavingsId = generalAccount.id
  } else {
    if (!transferAccount.value) return
    targetSavingsId = transferAccount.value.id
  }

  const amount = Number(transferForm.value.amount)

  if (!transferForm.value.amount || isNaN(amount) || amount <= 0) {
    transferError.value = 'Introduce un importe válido.'
    return
  }

  if (!transferForm.value.isDeposit) {
    const currentAccount = savingsStore.items.find((s) => s.id === targetSavingsId)
    if (currentAccount && amount > currentAccount.balance) {
      transferError.value = 'No puedes retirar más dinero del disponible.'
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
    transferError.value = error instanceof Error ? error.message : 'No se pudo realizar la operación.'
  } finally {
    transferring.value = false
  }
}

// Helpers
function getAccountName(id: string) {
  const account = savingsStore.items.find((s) => s.id === id)
  if (!account) return 'Ahorro'

  if (account.name === 'general') {
    return account.type === 'bank' ? 'Ahorro Banco' : 'Ahorro Efectivo'
  }
  return account.name
}

function getAccountColor(id: string) {
  return savingsStore.items.find((s) => s.id === id)?.color ?? '#8b5cf6'
}

onMounted(async () => {
  await Promise.all([
    savingsStore.fetchAll(),
    familyStore.fetchAll(),
  ])
})
</script>