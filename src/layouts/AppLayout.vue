<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'

import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNavigation from '@/components/layout/BottomNavigation.vue'
import { useNavigationDirection } from '@/composables/useNavigationDirection'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { recurringTransactionsService } from '@/services/recurring-transactions.service'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useI18n } from '@/i18n'

const route = useRoute()

const { transitionName } = useNavigationDirection()
const recurring = useRecurringTransactionsStore()
const ready = ref(false)
const showSync = ref(false)
const syncMessage = ref('')
const { t } = useI18n()

onMounted(async () => {
    try {
        const due = await recurringTransactionsService.due(new Date().toISOString().slice(0, 10))
        if (due.length) {
            showSync.value = true
            syncMessage.value = t('recurring.syncingPending')
            await recurring.sync()
        }
    } catch (error) {
        console.error('No se pudieron sincronizar los movimientos recurrentes.', error)
    } finally {
        ready.value = true
        showSync.value = false
    }
})
</script>

<template>
    <div class="min-h-dvh bg-surface">
        <AppHeader />

        <main v-if="ready" class="app-router-container">
            <RouterView v-slot="{ Component }">
                <Transition :name="transitionName" mode="out-in" appear>
                    <component :is="Component" :key="route.fullPath" class="app-router-view" />
                </Transition>
            </RouterView>
        </main>

        <BottomNavigation />

        <BaseDialog v-model="showSync" :title="t('recurring.syncingTitle')" persistent :show-close="false">
            <div class="flex items-center gap-3">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                <p class="text-sm text-content-muted">{{ syncMessage }}</p>
            </div>
        </BaseDialog>
    </div>
</template>

<style scoped>
.app-router-container {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: calc(100dvh - var(--header-height, 64px));
}

.app-router-view {
    width: 100%;
}
</style>
