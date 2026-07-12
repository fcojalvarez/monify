<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSavingsStore } from '@/stores/savings'
import { useFamilyStore } from '@/stores/family'
import { useUiStore } from '@/stores/ui'
import { ROUTE_NAMES } from '@/constants'
import { formatCurrency } from '@/utils/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { Savings } from '@/types'

const savingsStore = useSavingsStore()
const familyStore = useFamilyStore()
const ui = useUiStore()

// State
const showAddGoalDialog = ref(false)
const editingGoal = ref<Savings | null>(null)
const goalForm = ref({
  name: '',
  target: '',
  color: '#8b5cf6',
})

// Transfer State
const showTransferDialog = ref(false)
const transferAccount = ref<Savings | null>(null)
const transferForm = ref({
  amount: '',
  isDeposit: true, // true = ingresar, false = retirar
  note: '',
  familyMemberId: '',
})

// Dialogs Control
function openAddGoal() {
  editingGoal.value = null
  goalForm.value = {
    name: '',
    target: '',
    color: '#8b5cf6',
  }
  showAddGoalDialog.value = true
}

function openEditGoal(goal: Savings) {
  editingGoal.value = goal
  goalForm.value = {
    name: goal.name,
    target: goal.target ? String(goal.target) : '',
    color: goal.color,
  }
  showAddGoalDialog.value = true
}

async function saveGoal() {
  const payload = {
    name: goalForm.value.name.trim(),
    target: goalForm.value.target ? parseFloat(goalForm.value.target) : null,
    color: goalForm.value.color,
  }

  if (editingGoal.value) {
    await savingsStore.update(editingGoal.value.id, payload)
  } else {
    await savingsStore.create(payload)
  }
  showAddGoalDialog.value = false
}

// Delete Goal
const showDeleteDialog = ref(false)
const goalToDelete = ref<Savings | null>(null)

function openDeleteGoal(goal: Savings) {
  goalToDelete.value = goal
  showDeleteDialog.value = true
}

async function confirmDeleteGoal() {
  if (goalToDelete.value) {
    await savingsStore.remove(goalToDelete.value.id)
    showDeleteDialog.value = false
  }
}

// Transfer Control
function openTransfer(goal: Savings, isDeposit: boolean) {
  transferAccount.value = goal
  transferForm.value = {
    amount: '',
    isDeposit,
    note: '',
    familyMemberId: familyStore.self?.id || '',
  }
  showTransferDialog.value = true
}

const memberOptions = computed(() =>
  familyStore.items.map((m) => ({ value: m.id, label: m.name })),
)

const transferError = ref<string | null>(null)
const transferring = ref(false)

async function executeTransfer() {
  if (!transferAccount.value) return
  const amountVal = parseFloat(transferForm.value.amount)
  if (isNaN(amountVal) || amountVal <= 0) {
    transferError.value = 'El importe debe ser mayor que 0.'
    return
  }

  transferError.value = null
  transferring.value = true
  try {
    // Si es retirada, verificar que no supere el balance de la cuenta
    if (!transferForm.value.isDeposit && amountVal > transferAccount.value.balance) {
      throw new Error('No puedes retirar más dinero del balance actual de este ahorro.')
    }

    await savingsStore.transfer({
      savingsId: transferAccount.value.id,
      amount: amountVal,
      isDeposit: transferForm.value.isDeposit,
      note: transferForm.value.note,
      familyMemberId: transferForm.value.familyMemberId,
    })
    showTransferDialog.value = false
  } catch (error) {
    transferError.value = error instanceof Error ? error.message : 'No se pudo realizar el movimiento.'
  } finally {
    transferring.value = false
  }
}

// Stats / Aggregates
const totalSavingsBalance = computed(() => {
  return savingsStore.items.reduce((sum, s) => sum + s.balance, 0)
})

// Helper to look up account name by id
function getAccountName(id: string) {
  const s = savingsStore.items.find((x) => x.id === id)
  return s ? s.name : 'Ahorro'
}

function getAccountColor(id: string) {
  const s = savingsStore.items.find((x) => x.id === id)
  return s ? s.color : '#8b5cf6'
}

onMounted(async () => {
  await Promise.all([
    savingsStore.fetchAll(),
    familyStore.fetchAll(),
  ])
})
</script>

<template>
  <div class="min-h-dvh bg-surface pb-24">
    <AppHeader />

    <main class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <!-- Botón de retorno y cabecera de la vista -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <RouterLink :to="{ name: ROUTE_NAMES.dashboard }"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-content-muted hover:bg-line transition-colors"
            title="Volver al Dashboard">
            <AppIcon name="solar:arrow-left-bold" :size="20" />
          </RouterLink>
          <div>
            <h1 class="text-2xl font-bold text-content">Mis Ahorros</h1>
            <p class="text-xs text-content-muted">Fija metas y mueve dinero a tus huchas de ahorro</p>
          </div>
        </div>

        <button
          class="flex h-10 items-center gap-2 rounded-pill bg-primary-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          @click="openAddGoal">
          <AppIcon name="solar:add-circle-bold" :size="18" />
          Añadir
        </button>
      </div>

      <!-- Resumen global de ahorros -->
      <div class="rounded-card bg-gradient-to-br from-violet-600 to-indigo-900 p-6 text-white shadow-raised">
        <div class="flex items-center gap-3 text-white/70">
          <AppIcon name="solar:safe-2-bold" :size="20" />
          <span class="text-sm">Ahorro total acumulado</span>
        </div>
        <p class="mt-2 text-3xl font-bold tracking-tight">
          {{ formatCurrency(totalSavingsBalance) }}
        </p>
      </div>

      <!-- Lista de metas de ahorro -->
      <div v-if="savingsStore.loading && !savingsStore.items.length"
        class="py-12 text-center text-sm text-content-subtle">
        Cargando metas de ahorro…
      </div>

      <div v-else-if="!savingsStore.items.length"
        class="py-12 text-center border border-dashed border-line rounded-card bg-surface-raised">
        <AppIcon name="solar:piggy-bank-bold-duotone" :size="48" class="mx-auto text-content-subtle" />
        <p class="mt-2 text-sm font-medium text-content-muted">Aún no has creado ninguna meta de ahorro.</p>
        <p class="text-xs text-content-subtle mt-1">¡Crea tu primera hucha de ahorros arriba!</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <BaseCard v-for="goal in savingsStore.items" :key="goal.id" class="p-5 flex flex-col justify-between space-y-4">
          <div>
            <!-- Cabecera de la meta -->
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2.5">
                <span class="flex h-8 w-8 items-center justify-center rounded-full text-white"
                  :style="{ backgroundColor: goal.color }">
                  <AppIcon name="solar:safe-bold" :size="16" />
                </span>
                <div>
                  <h3 class="text-base font-bold text-content leading-tight">{{ goal.name }}</h3>
                  <p class="text-xs text-content-subtle mt-0.5">
                    Meta: {{ goal.target ? formatCurrency(goal.target) : 'Sin límite' }}
                  </p>
                </div>
              </div>

              <!-- Acciones de administración -->
              <div class="flex gap-1">
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted transition-colors"
                  title="Editar meta" @click="openEditGoal(goal)">
                  <AppIcon name="solar:pen-2-linear" :size="16" />
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full text-expense hover:bg-expense-light transition-colors"
                  title="Eliminar meta" @click="openDeleteGoal(goal)">
                  <AppIcon name="solar:trash-bin-trash-linear" :size="16" />
                </button>
              </div>
            </div>

            <!-- Progreso de la meta -->
            <div class="mt-4 space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="font-bold text-content">{{ formatCurrency(goal.balance) }}</span>
                <span v-if="goal.target" class="text-content-subtle">
                  {{ Math.round((goal.balance / goal.target) * 100) }}% completado
                </span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-line">
                <div class="h-full rounded-full transition-all duration-500" :style="{
                  width: goal.target ? `${Math.min(100, Math.round((goal.balance / goal.target) * 100))}%` : '100%',
                  backgroundColor: goal.color
                }" />
              </div>
            </div>
          </div>

          <!-- Botones de aportación/retirada -->
          <div class="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-field text-sm font-semibold border border-line bg-surface-muted text-content hover:bg-line transition-all active:scale-[0.97]"
              @click="openTransfer(goal, false)">
              <AppIcon name="solar:arrow-right-up-linear" :size="16" class="rotate-180 text-expense" />
              Retirar
            </button>
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-field text-sm font-semibold text-white transition-all active:scale-[0.97]"
              :style="{ backgroundColor: goal.color }" @click="openTransfer(goal, true)">
              <AppIcon name="solar:arrow-right-up-linear" :size="16" class="text-white" />
              Aportar
            </button>
          </div>
        </BaseCard>
      </div>

      <!-- Historial de movimientos de ahorro -->
      <BaseCard as="section" class="p-5 space-y-4">
        <h2 class="text-sm font-semibold text-content-muted uppercase tracking-wide">Historial de Ahorros</h2>

        <div v-if="!savingsStore.transactions.length" class="py-8 text-center text-xs text-content-subtle">
          Aún no se han registrado movimientos de ahorro.
        </div>

        <ul v-else class="divide-y divide-line">
          <li v-for="tx in savingsStore.transactions" :key="tx.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                :style="{ backgroundColor: getAccountColor(tx.savings_id) }">
                <AppIcon :name="tx.amount > 0 ? 'solar:arrow-down-linear' : 'solar:arrow-up-linear'" :size="16"
                  class="rotate-45" />
              </span>
              <div>
                <p class="text-sm font-medium text-content">
                  {{ tx.note || (tx.amount > 0 ? 'Aportación' : 'Retirada') }}
                </p>
                <p class="text-xs text-content-subtle">
                  Hucha: <strong>{{ getAccountName(tx.savings_id) }}</strong> • {{ tx.occurred_on }}
                </p>
              </div>
            </div>
            <span class="text-sm font-bold" :class="tx.amount > 0 ? 'text-income' : 'text-expense'">
              {{ tx.amount > 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}
            </span>
          </li>
        </ul>
      </BaseCard>
    </main>

    <!-- Diálogo: Crear/Editar Meta -->
    <BaseDialog v-slot:default v-model="showAddGoalDialog" variant="confirm"
      :title="editingGoal ? 'Editar Meta de Ahorro' : 'Crear Meta de Ahorro'" confirm-text="Guardar"
      cancel-text="Cancelar" show-cancel @confirm="saveGoal">
      <form class="space-y-4" @submit.prevent>
        <BaseInput v-model="goalForm.name" label="Nombre de la meta" icon="solar:tag-bold"
          placeholder="p.ej. Coche nuevo, Fondo de emergencia…" required />

        <BaseInput v-model="goalForm.target" type="number" label="Importe meta (opcional)" icon="solar:tag-price-bold"
          placeholder="p.ej. 2500" />

        <div>
          <span class="field-label">Color identificativo</span>
          <ColorPicker v-model="goalForm.color" />
        </div>
      </form>
    </BaseDialog>

    <!-- Diálogo: Eliminar Meta -->
    <BaseDialog v-slot:default v-model="showDeleteDialog" variant="danger" title="Eliminar Meta de Ahorro"
      confirm-text="Eliminar" cancel-text="Cancelar" show-cancel @confirm="confirmDeleteGoal">
      <p class="text-content">
        ¿Estás seguro de que quieres eliminar la meta de ahorro <strong>{{ goalToDelete?.name }}</strong>?
      </p>
      <p class="mt-2 text-sm text-content-subtle">
        Esta acción eliminará el registro de la meta de ahorro y su historial local. El balance acumulado en este ahorro
        dejará de computarse.
      </p>
    </BaseDialog>

    <!-- Diálogo: Transferencia de Fondos -->
    <BaseDialog v-slot:default v-model="showTransferDialog" variant="confirm"
      :title="transferForm.isDeposit ? `Aportar a ${transferAccount?.name}` : `Retirar de ${transferAccount?.name}`"
      confirm-text="Confirmar" cancel-text="Cancelar" show-cancel :loading="transferring" @confirm="executeTransfer">
      <form class="space-y-4" @submit.prevent>
        <p class="text-xs text-content-subtle">
          {{
            transferForm.isDeposit
              ? 'Se restará este importe de tu cuenta principal y se sumará a tus ahorros.'
              : 'Se restará este importe de tus ahorros y se sumará como ingreso a tu cuenta principal.'
          }}
        </p>

        <BaseInput v-model="transferForm.amount" type="number" label="Importe" icon="solar:tag-price-bold"
          placeholder="0,00" required />

        <BaseSelect v-model="transferForm.familyMemberId" label="¿Quién realiza el movimiento?"
          placeholder="Selecciona miembro de la familia" :options="memberOptions" required />

        <BaseInput v-model="transferForm.note" label="Nota / Concepto (opcional)" icon="solar:pen-bold"
          placeholder="Concepto del traspaso" />

        <div v-if="transferError" class="rounded-field bg-expense-light p-3 text-sm text-expense">
          {{ transferError }}
        </div>
      </form>
    </BaseDialog>
  </div>
</template>
