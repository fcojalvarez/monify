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
const showAddDropdown = ref(false)

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
    createMainTx: false,
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

function openAddSimpleSavings(isDeposit: boolean) {
    const general = savingsStore.items.find((s) => s.name === 'general')
    if (general) {
        openTransfer(general, isDeposit)
    }
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
    const nameTrimmed = goalForm.value.name.trim()
    if (!nameTrimmed) return

    const payload = {
        name: nameTrimmed,
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
        createMainTx: false,
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
            shouldCreateMainTransaction: transferForm.value.createMainTx,
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

const displayGoals = computed(() => {
    return savingsStore.items.filter((s) => s.name !== 'general')
})

// Helper to look up account name by id
function getAccountName(id: string) {
    const s = savingsStore.items.find((x) => x.id === id)
    if (s) {
        return s.name === 'general' ? 'Ahorro general' : s.name
    }
    return 'Ahorro'
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
                        <h1 class="text-2xl font-bold text-content">Mi efectivo</h1>
                        <p class="text-xs text-content-muted">Administra tu dinero en efectivo</p>
                    </div>
                </div>
            </div>
        </main>

        <p class="ml-12 text-xs text-content-muted">En proceso...</p>
    </div>
</template>
