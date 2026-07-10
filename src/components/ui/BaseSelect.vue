<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps<{
  modelValue: T | ''
  label?: string
  placeholder?: string
  options: ReadonlyArray<{ value: T; label: string }>
  error?: string | null
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const id = useId()

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value as T)
}
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="field-label">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :class="[
          'h-12 w-full appearance-none rounded-field bg-surface-muted px-4 pr-10 text-content',
          'border transition-colors focus:bg-surface-raised focus:outline-none',
          error ? 'border-expense' : 'border-transparent focus:border-primary-400',
          modelValue === '' && 'text-content-subtle',
        ]"
        @change="onChange"
      >
        <option value="" disabled>{{ placeholder ?? 'Selecciona…' }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <AppIcon
        name="solar:alt-arrow-down-linear"
        :size="18"
        class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-content-subtle"
      />
    </div>
    <p v-if="error" class="mt-1.5 text-xs font-medium text-expense">{{ error }}</p>
  </div>
</template>
