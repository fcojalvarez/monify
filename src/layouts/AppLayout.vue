<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNavigation from '@/components/layout/BottomNavigation.vue'
import { useNavigationDirection } from '@/composables/useNavigationDirection'

const route = useRoute()

const { transitionName } = useNavigationDirection()
</script>

<template>
    <div class="min-h-dvh bg-surface">
        <AppHeader />

        <main class="app-router-container">
            <RouterView v-slot="{ Component }">
                <Transition :name="transitionName" mode="out-in" appear>
                    <component :is="Component" :key="route.fullPath" class="app-router-view" />
                </Transition>
            </RouterView>
        </main>

        <BottomNavigation />
    </div>
</template>

<style scoped>
.app-router-container {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: calc(100dvh - var(--header-height, 64px));
    padding-bottom: 6rem;
}

.app-router-view {
    width: 100%;
}
</style>