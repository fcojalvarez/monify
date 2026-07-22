<script setup lang="ts">
import { useI18n } from '@/i18n'

withDefaults(defineProps<{ message?: string; size?: number }>(), { size: 36 })
const { t } = useI18n()
</script>

<template>
  <div class="flex animate-fade-in flex-col items-center justify-center gap-3 py-10 text-center" role="status"
    aria-live="polite">
    <div class="animate-spin rounded-full border-4 border-primary-100 border-t-primary-500"
      :style="{ width: `${size}px`, height: `${size}px` }" />
    <p class="text-sm font-medium text-content-muted">{{ message || t('common.loading') }}</p>
  </div>
</template>
