<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useUiStore } from '@/stores/ui'
import { ROUTE_NAMES } from '@/constants'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const profile = useProfileStore()
const ui = useUiStore()

const currentRouteName = computed(() => route.name)

// Elementos de navegación dinámicos
const navigationItems = computed(() => {
  const items = [
    {
      name: ROUTE_NAMES.dashboard,
      label: 'Inicio',
      icon: 'solar:home-bold',
      activeIcon: 'solar:home-bold',
      show: true,
    },
    {
      name: ROUTE_NAMES.charts,
      label: 'Gráficas',
      icon: 'solar:chart-square-bold',
      activeIcon: 'solar:chart-square-bold',
      show: true,
    },
    {
      name: ROUTE_NAMES.savings,
      label: 'Ahorros',
      icon: 'solar:safe-square-bold',
      activeIcon: 'solar:safe-square-bold',
      show: profile.savingsEnabled,
    },
    {
      name: ROUTE_NAMES.cash,
      label: 'Efectivo',
      icon: ui.currency === 'EUR' ? 'solar:euro-bold' : 'solar:dollar-bold',
      activeIcon: ui.currency === 'EUR' ? 'solar:euro-bold' : 'solar:dollar-bold',
      show: profile.cashEnabled,
    },
    {
      name: ROUTE_NAMES.history,
      label: 'Historial',
      icon: 'solar:bill-list-bold',
      activeIcon: 'solar:bill-list-bold',
      show: true,
    },
  ]

  return items.filter(item => item.show)
})
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface-raised/80 backdrop-blur-lg pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-raised md:mx-auto md:max-w-2xl md:rounded-t-card md:border-x">
    <div class="flex justify-around items-center px-2">
      <RouterLink
        v-for="item in navigationItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
        :class="
          currentRouteName === item.name
            ? 'text-primary-500 font-bold scale-105'
            : 'text-content-muted hover:text-content'
        "
      >
        <AppIcon 
          :name="currentRouteName === item.name ? item.activeIcon : item.icon" 
          :size="22" 
          class="transition-transform duration-200"
          :class="currentRouteName === item.name && 'drop-shadow-[0_2px_8px_rgba(0,184,148,0.3)]'"
        />
        <span class="text-[10px] tracking-wide leading-none">
          {{ item.label }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
