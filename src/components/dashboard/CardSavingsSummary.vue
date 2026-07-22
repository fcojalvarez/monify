<script setup lang="ts">
import { computed } from 'vue'
import type { Savings } from '@/types'
import { formatCurrency } from '@/utils/format'
import { useI18n } from '@/i18n'

const props = defineProps<{
    savings: Savings[]
    currency: string
}>()

const { t } = useI18n()

const totalSavings = computed(() =>
    props.savings.reduce((sum, saving) => sum + saving.balance, 0)
)

const bankSavings = computed(() =>
    props.savings
        .filter(s => s.type === 'bank')
        .reduce((sum, saving) => sum + saving.balance, 0)
)

const cashSavings = computed(() =>
    props.savings
        .filter(s => s.type === 'cash')
        .reduce((sum, saving) => sum + saving.balance, 0)
)

const mainGoal = computed(() => {
    return props.savings
        .filter(s => s.target != null && s.status !== 'completed')
        .sort((a, b) => (b.balance / b.target!) - (a.balance / a.target!))[0]
})

const mainGoalProgress = computed(() => {
    if (!mainGoal.value?.target) return 0

    return Math.round(
        (mainGoal.value.balance / mainGoal.value.target) * 100
    )
})

const visualProgress = computed(() => Math.min(mainGoalProgress.value, 100))
</script>

<template>
    <section class="md:w-11/12 m-auto px-2">
        <p class="text-sm text-white/70">
            {{ t('misc.savingsCardTitle') }}
        </p>

        <div class="mt-1 flex items-end justify-between">
            <p class="text-3xl font-bold tracking-tight">
                {{ formatCurrency(totalSavings, { currency }) }}
            </p>

            <div class="flex gap-4 pb-1 text-right mr-2">
                <div>
                    <p class="text-[9px] uppercase text-white/60">{{ t('misc.savingsCardBank') }}</p>
                    <p class="text-sm font-semibold">
                        {{ formatCurrency(bankSavings, { currency }) }}
                    </p>
                </div>
                <div>
                    <p class="text-[9px] uppercase text-white/60">{{ t('misc.savingsCardCash') }}</p>
                    <p class="text-sm font-semibold">
                        {{ formatCurrency(cashSavings, { currency }) }}
                    </p>
                </div>
            </div>
        </div>

        <template v-if="mainGoal">
            <div class="mt-5">
                <div class="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>{{ t('misc.savingsCardMainGoal') }}</span>
                    <span>{{ mainGoalProgress }}%</span>
                </div>

                <div class="h-2 overflow-hidden rounded-full bg-white/10">
                    <div class="h-full rounded-full bg-primary-400 transition-all"
                        :style="{ width: `${visualProgress}%` }" />
                </div>

                <div class="mt-2 flex items-center justify-between text-sm">
                    <span class="font-medium text-white">
                        {{ mainGoal.name }}
                    </span>

                    <span class="text-white/70">
                        {{ formatCurrency(mainGoal.balance, { currency }) }}
                        /
                        {{ formatCurrency(mainGoal.target!, { currency }) }}
                    </span>
                </div>
            </div>
        </template>

        <template v-else>
            <div class="mt-5 rounded-field bg-white/10 p-4">
                <p class="truncate text-sm text-white/80">
                    {{ t('misc.savingsCardAllSaved') }}
                </p>

                <p class="truncate mt-1 text-xs text-white/60">
                    {{ t('misc.savingsCardCreateGoalHint') }}
                </p>
            </div>
        </template>
    </section>
</template>