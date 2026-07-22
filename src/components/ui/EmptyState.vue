<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

withDefaults(defineProps<{ icon?: string; title: string; hint?: string }>(), {
  icon: 'solar:inbox-linear',
})
</script>

<template>
  <div class="animate-fade-in py-10 text-center">
    <AppIcon :name="icon" :size="40" class="mx-auto text-content-subtle" />
    <p class="mt-2 text-sm font-medium text-content-muted">{{ title }}</p>
    <p v-if="hint" class="mt-1 text-xs text-content-subtle">{{ hint }}</p>
    <slot />
  </div>
</template>
