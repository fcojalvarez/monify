<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCashStore } from '@/stores/cash'
import { useFamilyStore } from '@/stores/family'
import { useUiStore } from '@/stores/ui'
import { formatCurrency } from '@/utils/format'

import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const cashStore = useCashStore()
const familyStore = useFamilyStore()
const ui = useUiStore()

/**
 * Diálogo de movimiento
 */
const showMovementDialog = ref(false)

// Función auxiliar para obtener la fecha de hoy en formato local YYYY-MM-DD
function getTodayString() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const movementForm = ref({
    amount: '',
    isDeposit: true,
    note: '',
    familyMemberId: '',
    createMainTx: false,
    occurredAt: getTodayString()
})

const transferring = ref(false)
const transferError = ref<string | null>(null)

/**
 * Obtener el miembro de la familia actualmente seleccionado en el formulario
 */
const selectedMember = computed(() => {
    return familyStore.items.find(m => m.id === movementForm.value.familyMemberId)
})

/**
 * Abrir diálogo pre-asignando el ID del miembro seleccionado y reseteando fecha a hoy
 */
function openMovement(isDeposit: boolean, memberId: string) {
    movementForm.value = {
        amount: '',
        isDeposit,
        note: '',
        familyMemberId: memberId,
        createMainTx: false,
        occurredAt: getTodayString()
    }

    transferError.value = null
    showMovementDialog.value = true
}

/**
 * Carteras
 */
const wallets = computed(() => {
    const total = cashStore.balance

    return familyStore.items.map((member) => ({
        ...member,
        percentage:
            total > 0
                ? Math.round(((member.cash_balance ?? 0) / total) * 100)
                : 0,
    }))
})

/**
 * Ejecutar movimiento
 */
async function executeMovement() {
    const amount = Number(movementForm.value.amount)

    if (!amount || amount <= 0) {
        transferError.value = 'El importe debe ser mayor que 0.'
        return
    }

    if (!movementForm.value.familyMemberId) {
        transferError.value = 'No se ha detectado el miembro de la familia.'
        return
    }

    // Corregido: Validamos contra el balance general de la caja de efectivo
    if (!movementForm.value.isDeposit && balance.value < amount) {
        transferError.value = 'No puedes retirar más efectivo del disponible en la caja.'
        return
    }

    transferError.value = null
    transferring.value = true

    // Creamos el payload asegurando la compatibilidad de nombres de variables
    const payload = {
        amount,
        note: movementForm.value.note,
        familyMemberId: movementForm.value.familyMemberId,
        occurredAt: movementForm.value.occurredAt,
        createMainTx: movementForm.value.createMainTx,
        shouldCreateMainTransaction: movementForm.value.createMainTx,
    }

    try {
        if (movementForm.value.isDeposit) {
            await cashStore.deposit(payload)
        } else {
            await cashStore.withdraw(payload)
        }

        // Forzar recarga completa de carteras y saldos para refrescar la UI
        await Promise.all([
            familyStore.fetchAll(),
            cashStore.refresh()
        ])

        showMovementDialog.value = false
    } catch (error) {
        transferError.value =
            error instanceof Error
                ? error.message
                : 'No se pudo registrar el movimiento.'
    } finally {
        transferring.value = false
    }
}

/**
 * Resumen
 */
const balance = computed(() => cashStore.balance)

/**
 * Carga inicial
 */
onMounted(async () => {
    await Promise.all([
        familyStore.fetchAll(),
        cashStore.refresh(),
    ])
})
</script>

<template>
    <div class="min-h-dvh bg-surface pb-24">
        <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
            <!-- Cabecera -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div>
                        <h1 class="text-2xl font-bold text-content">
                            Mi efectivo
                        </h1>

                        <p class="text-xs text-content-muted">
                            Gestiona el dinero en metálico de toda la familia.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Tarjeta resumen -->
            <section
                class="overflow-hidden rounded-card bg-gradient-to-br from-emerald-600 to-emerald-900 p-6 text-white shadow-raised">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-white/70">
                            Efectivo total
                        </p>

                        <h2 class="mt-2 text-4xl font-bold">
                            {{ formatCurrency(balance, { currency: ui.currency }) }}
                        </h2>
                    </div>

                    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                        <AppIcon name="solar:wallet-money-bold" :size="32" />
                    </div>
                </div>

                <div class="mt-6 grid grid-cols-2 gap-3">
                    <div class="rounded-field bg-white/10 p-3">
                        <p class="text-xs text-white/70">
                            Entradas
                        </p>

                        <p class="mt-1 text-lg font-semibold">
                            {{ formatCurrency(cashStore.totalIncome, { currency: ui.currency }) }}
                        </p>
                    </div>

                    <div class="rounded-field bg-white/10 p-3">
                        <p class="text-xs text-white/70">
                            Salidas
                        </p>

                        <p class="mt-1 text-lg font-semibold">
                            {{ formatCurrency(cashStore.totalExpense, { currency: ui.currency }) }}
                        </p>
                    </div>
                </div>
            </section>

            <!-- Carteras -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-content">
                        Carteras
                    </h2>

                    <span class="text-xs text-content-subtle">
                        {{ familyStore.items.length }} miembros
                    </span>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                    <BaseCard v-for="member in wallets" :key="member.id" class="relative overflow-hidden">
                        <div class="absolute inset-x-0 top-0 h-1" :style="{ backgroundColor: member.color }" />

                        <div class="flex items-center gap-3">
                            <div class="flex h-12 w-12 items-center justify-center rounded-full text-white"
                                :style="{ backgroundColor: member.color }">
                                <AppIcon :name="member.avatar_icon" :size="22" />
                            </div>

                            <div class="min-w-0 flex-1">
                                <h3 class="truncate font-semibold text-content">
                                    {{ member.name }}
                                </h3>

                                <p class="text-xs text-content-subtle">
                                    {{ member.is_self ? 'Tú' : 'Miembro de la familia' }}
                                </p>
                            </div>
                        </div>

                        <div class="mt-5">
                            <p class="text-xs uppercase tracking-wide text-content-muted">
                                Disponible
                            </p>

                            <p class="mt-1 text-3xl font-bold text-content">
                                {{
                                    formatCurrency(
                                        cashStore.memberBalance(member.id),
                                        {
                                            currency: ui.currency,
                                        },
                                    )
                                }}
                            </p>
                        </div>

                        <div class="mt-6 grid grid-cols-2 gap-2">
                            <BaseButton @click="openMovement(true, member.id)">
                                <AppIcon name="solar:add-circle-bold" :size="18" />
                                Añadir
                            </BaseButton>

                            <BaseButton variant="secondary" @click="openMovement(false, member.id)">
                                <AppIcon name="solar:minus-circle-bold" :size="18" />
                                Retirar
                            </BaseButton>
                        </div>
                    </BaseCard>
                </div>
            </section>

            <!-- Historial -->
            <BaseCard class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="font-semibold text-content">
                        Historial
                    </h2>

                    <span class="text-xs text-content-subtle">
                        {{ cashStore.transactions.length }} movimientos
                    </span>
                </div>

                <div v-if="!cashStore.transactions.length" class="py-10 text-center text-content-subtle">
                    Todavía no hay movimientos registrados.
                </div>

                <ul v-else class="divide-y divide-line">
                    <li v-for="tx in cashStore.transactions" :key="tx.id"
                        class="flex items-center justify-between py-3">
                        <div class="flex items-center gap-3">
                            <span class="flex h-10 w-10 items-center justify-center rounded-full" :class="tx.amount > 0
                                ? 'bg-income/10 text-income'
                                : 'bg-expense-light text-expense'
                                ">
                                <AppIcon :name="tx.amount > 0
                                    ? 'solar:arrow-down-linear'
                                    : 'solar:arrow-up-linear'
                                    " :size="18" />
                            </span>

                            <div>
                                <p class="text-sm font-medium text-content">
                                    {{
                                        tx.note ||
                                        (tx.amount > 0
                                            ? 'Entrada de efectivo'
                                            : 'Salida de efectivo')
                                    }}
                                </p>

                                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-subtle">
                                    <span>{{ (tx as any).family_member?.name ?? 'General' }}</span>
                                    <span>•</span>
                                    <span>{{ tx.occurred_on }}</span>
                                </div>
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

        <!-- Diálogo -->
        <BaseDialog v-model="showMovementDialog" variant="confirm" :title="movementForm.isDeposit
            ? 'Añadir efectivo'
            : 'Retirar efectivo'
            " confirm-text="Confirmar" cancel-text="Cancelar" show-cancel :loading="transferring"
            @confirm="executeMovement">
            <form class="space-y-4" @submit.prevent>

                <!-- Info de Destinatario / Origen -->
                <div v-if="selectedMember"
                    class="flex items-center gap-3 rounded-card bg-surface-muted p-3 border border-line">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full text-white"
                        :style="{ backgroundColor: selectedMember.color }">
                        <AppIcon :name="selectedMember.avatar_icon" :size="16" />
                    </div>
                    <div class="text-xs">
                        <p class="text-content-subtle font-medium">Cartera afectada:</p>
                        <p class="font-bold text-content">{{ selectedMember.name }}</p>
                    </div>
                </div>

                <!-- Input de Fecha de Operación -->
                <BaseInput v-model="movementForm.occurredAt" type="date" label="Fecha" icon="solar:calendar-bold"
                    required />

                <BaseInput v-model="movementForm.amount" type="number" label="Importe" icon="solar:tag-price-bold"
                    placeholder="0,00" required />

                <BaseInput v-model="movementForm.note" label="Concepto" icon="solar:pen-bold"
                    placeholder="Ej. Sacado del cajero" />

                <label class="flex items-center justify-between rounded-card border border-line p-4 cursor-pointer">
                    <div>
                        <p class="text-sm font-medium text-content">
                            {{
                                movementForm.isDeposit
                                    ? 'Crear ingreso en Movimientos'
                                    : 'Crear gasto en Movimientos'
                            }}
                        </p>

                        <p class="text-xs text-content-subtle">
                            Además del movimiento de efectivo, se añadirá una
                            transacción normal.
                        </p>
                    </div>

                    <input v-model="movementForm.createMainTx" type="checkbox" class="h-5 w-5 rounded">
                </label>

                <div v-if="transferError" class="rounded-card bg-expense-light p-3 text-sm text-expense">
                    {{ transferError }}
                </div>
            </form>
        </BaseDialog>
    </div>
</template>