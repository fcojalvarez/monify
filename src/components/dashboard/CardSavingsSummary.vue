<script setup lang="ts">
import { computed } from 'vue'
import type { Savings } from '@/types'
import { formatCurrency } from '@/utils/format'

const props = defineProps<{
    savings: Savings[]
    currency: string
}>()

const totalSavings = computed(() =>
    props.savings.reduce((sum, saving) => sum + saving.balance, 0)
)

const mainGoal = computed(() => {
    return props.savings
        .filter(s => s.target != null)
        .sort((a, b) => (b.balance / b.target!) - (a.balance / a.target!))[0]
})

const mainGoalProgress = computed(() => {
    if (!mainGoal.value?.target) return 0

    return Math.round(
        (mainGoal.value.balance / mainGoal.value.target) * 100
    )
})
</script>

<template>
    <section class="md:w-11/12 m-auto px-2">
        <p class="text-sm text-white/70">
            Ahorros
        </p>

        <p class="mt-1 text-3xl font-bold tracking-tight">
            {{ formatCurrency(totalSavings, { currency }) }}
        </p>

        <template v-if="mainGoal">
            <div class="mt-5">
                <div class="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>Meta principal</span>
                    <span>{{ mainGoalProgress }}%</span>
                </div>

                <div class="h-2 overflow-hidden rounded-full bg-white/10">
                    <div class="h-full rounded-full bg-primary-400 transition-all"
                        :style="{ width: `${mainGoalProgress}%` }" />
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
                <p class="text-sm text-white/80">
                    Todo tu dinero está destinado al ahorro.
                </p>

                <p class="mt-1 text-xs text-white/60">
                    Crea una meta para hacer seguimiento de tus objetivos.
                </p>
            </div>
        </template>
    </section>
</template>