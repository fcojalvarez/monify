<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  options: ReadonlyArray<{ value: T; label: string }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="grid gap-1 rounded-field bg-surface-muted p-1" :style="{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="h-9 rounded-[0.625rem] text-sm font-semibold transition-all duration-200"
      :class="
        modelValue === option.value
          ? 'bg-surface-raised text-content shadow-sm'
          : 'text-content-muted hover:text-content'
      "
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
