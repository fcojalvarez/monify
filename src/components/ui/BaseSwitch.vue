<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between py-1">
    <span v-if="label" class="text-sm font-medium text-content">{{ label }}</span>
    <span class="relative ml-4 shrink-0">
      <input :checked="modelValue" type="checkbox" class="sr-only"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
      <span class="relative block h-6 w-11 rounded-pill transition-colors duration-200"
        :class="modelValue ? 'bg-primary-500' : 'bg-line'">
        <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
          :class="modelValue ? 'translate-x-5' : 'translate-x-0'" />
      </span>
    </span>
  </label>
</template>
