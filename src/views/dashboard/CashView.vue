<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useCashStore } from '@/stores/cash'
import { useFamilyStore } from '@/stores/family'
import { useUiStore } from '@/stores/ui'
import { formatCurrency, formatDate, todayISO } from '@/utils/format'
import { useI18n } from '@/i18n'
import type { CashTransaction } from '@/services/cash.service'

import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseDateInput from '@/components/ui/BaseDateInput.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const CashMovementForm = defineAsyncComponent(() => import('@/components/cash/CashMovementForm.vue'))

const cashStore = useCashStore()
const familyStore = useFamilyStore()
const ui = useUiStore()
const { t } = useI18n()

/**
 * Diálogo de movimiento
 */
const showMovementDialog = ref(false)

const movementForm = ref({
    amount: '',
    isDeposit: true,
    note: '',
    familyMemberId: '',
    createMainTx: false,
    occurredAt: todayISO()
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
        occurredAt: todayISO()
    }

    transferError.value = null
    showMovementDialog.value = true
}

/**
 * Carteras
 */
const wallets = computed(() => familyStore.items)

/** Nombre del miembro asociado a un movimiento (la relación no está tipada en CashTransaction). */
function txMemberName(tx: CashTransaction) {
    return (tx as CashTransaction & { family_member?: { name?: string } }).family_member?.name ?? t('cash.general')
}

/**
 * Edición de movimientos
 */
const showEditSheet = ref(false)
const editingTransaction = ref<CashTransaction | undefined>()
const editFormRef = ref<InstanceType<typeof CashMovementForm> | null>(null)

function openEdit(transaction: CashTransaction) {
    editingTransaction.value = transaction
    showEditSheet.value = true
}

async function onMovementEdited() {
    showEditSheet.value = false
    await familyStore.fetchAll()
}

/**
 * Ejecutar movimiento
 */
async function executeMovement() {
    const amount = Number(movementForm.value.amount)

    if (!amount || amount <= 0) {
        transferError.value = t('cash.errors.amountPositive')
        return
    }

    if (!movementForm.value.familyMemberId) {
        transferError.value = t('cash.errors.noMember')
        return
    }

    // Validamos contra el balance general de la caja de efectivo
    if (!movementForm.value.isDeposit && balance.value < amount) {
        transferError.value = t('cash.errors.insufficient')
        return
    }

    transferError.value = null
    transferring.value = true

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
                : t('cash.errors.generic')
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
    <div class="min-h-dvh bg-surface pb-12">
        <main class="mx-auto max-w-3xl space-y-6 px-4 py-6">
            <!-- Cabecera -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div>
                        <h1 class="text-2xl font-bold text-content">
                            {{ t('cash.title') }}
                        </h1>

                        <p class="text-xs text-content-muted">
                            {{ t('cash.subtitle') }}
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
                            {{ t('cash.totalCash') }}
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
                            {{ t('cash.income') }}
                        </p>

                        <p class="mt-1 text-lg font-semibold">
                            {{ formatCurrency(cashStore.totalIncome, { currency: ui.currency }) }}
                        </p>
                    </div>

                    <div class="rounded-field bg-white/10 p-3">
                        <p class="text-xs text-white/70">
                            {{ t('cash.expense') }}
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
                        {{ t('cash.wallets') }}
                    </h2>

                    <span class="text-xs text-content-subtle">
                        {{ t('cash.membersCount', { count: familyStore.items.length }) }}
                    </span>
                </div>

                <div class="grid animate-fade-in gap-4 md:grid-cols-2">
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
                                    {{ member.is_self ? t('cash.you') : t('cash.familyMember') }}
                                </p>
                            </div>
                        </div>

                        <div class="mt-5">
                            <p class="text-xs uppercase tracking-wide text-content-muted">
                                {{ t('cash.available') }}
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
                                {{ t('cash.add') }}
                            </BaseButton>

                            <BaseButton variant="secondary" @click="openMovement(false, member.id)">
                                <AppIcon name="solar:minus-circle-bold" :size="18" />
                                {{ t('cash.withdraw') }}
                            </BaseButton>
                        </div>
                    </BaseCard>
                </div>
            </section>

            <!-- Historial -->
            <BaseCard class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="font-semibold text-content">
                        {{ t('cash.history') }}
                    </h2>

                    <span class="text-xs text-content-subtle">
                        {{ t('cash.movementsCount', { count: cashStore.transactions.length }) }}
                    </span>
                </div>

                <BaseSpinner v-if="cashStore.loading && !cashStore.transactions.length" />

                <EmptyState v-else-if="!cashStore.transactions.length" icon="solar:wallet-money-linear"
                    :title="t('cash.emptyHistory')" />

                <ul v-else class="animate-fade-in divide-y divide-line">
                    <li v-for="tx in cashStore.transactions" :key="tx.id"
                        class="flex cursor-pointer items-center justify-between py-3 -mx-2 rounded-field px-2 transition-colors hover:bg-surface-muted"
                        @click="openEdit(tx)">
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
                                            ? t('cash.cashInflow')
                                            : t('cash.cashOutflow'))
                                    }}
                                </p>

                                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-subtle">
                                    <span>{{ txMemberName(tx) }}</span>
                                    <span>•</span>
                                    <span>{{ formatDate(tx.occurred_on) }}</span>
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

        <!-- Diálogo de creación (ingreso / retirada) -->
        <BaseDialog v-model="showMovementDialog" variant="confirm" :title="movementForm.isDeposit
            ? t('cash.addCashTitle')
            : t('cash.withdrawCashTitle')
            " :confirm-text="t('cash.confirm')" :cancel-text="t('common.cancel')" show-cancel :loading="transferring"
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
                        <p class="text-content-subtle font-medium">{{ t('cash.affectedWallet') }}</p>
                        <p class="font-bold text-content">{{ selectedMember.name }}</p>
                    </div>
                </div>

                <!-- Input de Fecha de Operación -->
                <BaseDateInput v-model="movementForm.occurredAt" :label="t('cash.date')"
                    icon="solar:calendar-bold" required />

                <BaseInput v-model="movementForm.amount" type="number" :label="t('cash.amount')"
                    icon="solar:tag-price-bold" :placeholder="t('cash.amountPlaceholder')" required />

                <BaseInput v-model="movementForm.note" :label="t('cash.concept')" icon="solar:pen-bold"
                    :placeholder="t('cash.conceptPlaceholder')" />

                <label class="flex items-center justify-between rounded-card border border-line p-4 cursor-pointer">
                    <div>
                        <p class="text-sm font-medium text-content">
                            {{
                                movementForm.isDeposit
                                    ? t('cash.createIncomeMain')
                                    : t('cash.createExpenseMain')
                            }}
                        </p>

                        <p class="text-xs text-content-subtle">
                            {{ t('cash.createMainHint') }}
                        </p>
                    </div>

                    <BaseCheckbox v-model="movementForm.createMainTx" />
                </label>

                <div v-if="transferError" class="rounded-card bg-expense-light p-3 text-sm text-expense">
                    {{ transferError }}
                </div>
            </form>
        </BaseDialog>

        <!-- Hoja de edición de movimiento -->
        <BaseSheet v-model="showEditSheet" :title="t('cash.edit.title')" :has-changes="editFormRef?.hasChanges">
            <CashMovementForm v-if="editingTransaction" ref="editFormRef" :transaction="editingTransaction"
                @saved="onMovementEdited" @cancel="showEditSheet = false" />
        </BaseSheet>
    </div>
</template>
