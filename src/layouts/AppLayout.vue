<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNavigation from '@/components/layout/BottomNavigation.vue'
</script>

<template>
    <div class="min-h-dvh bg-surface pb-24">
        <AppHeader />

        <main>
            <RouterView />
        </main>

        <BottomNavigation />
    </div>
</template>