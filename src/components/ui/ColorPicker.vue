<script setup lang="ts">
import { PALETTE } from '@/constants'
import AppIcon from './AppIcon.vue'
import { useI18n } from '@/i18n'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap gap-2.5">
    <button
      v-for="color in PALETTE"
      :key="color"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
      :style="{ backgroundColor: color }"
      :aria-label="t('misc.colorAriaLabel', { color })"
      @click="emit('update:modelValue', color)"
    >
      <AppIcon
        v-if="modelValue === color"
        name="solar:check-read-bold"
        :size="18"
        class="text-white"
      />
    </button>
  </div>
</template>
