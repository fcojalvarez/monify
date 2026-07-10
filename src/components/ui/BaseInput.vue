<script setup lang="ts">
import { computed, useId } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  icon?: string
  error?: string | null
  autocomplete?: string
  required?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const id = useId()
const hasError = computed(() => !!props.error)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="field-label">{{ label }}</label>
    <div class="relative">
      <AppIcon
        v-if="icon"
        :name="icon"
        :size="18"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle"
      />
      <input
        :id="id"
        :value="modelValue"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :aria-invalid="hasError"
        :class="[
          'h-12 w-full rounded-field bg-surface-muted text-content placeholder:text-content-subtle',
          'border transition-colors duration-200 focus:bg-surface-raised focus:outline-none',
          icon ? 'pl-11 pr-4' : 'px-4',
          hasError
            ? 'border-expense focus:border-expense'
            : 'border-transparent focus:border-primary-400',
        ]"
        @input="onInput"
      />
    </div>
    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">{{ error }}</p>
  </div>
</template>
