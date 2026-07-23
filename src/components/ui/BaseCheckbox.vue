<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <label
    class="flex items-start gap-3 py-1.5"
    :class="[disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer']"
    @click.prevent="toggle"
  >
    <div class="relative flex items-center mt-0.5">
      <input
        type="checkbox"
        class="sr-only"
        :checked="modelValue"
        :disabled="disabled"
      />
      <div
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-300 ease-out"
        :class="[
          modelValue
            ? 'border-primary-500 bg-primary-500 scale-100 shadow-sm shadow-primary-500/20'
            : 'border-line bg-surface hover:border-content-subtle',
        ]"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          leave-active-class="transition duration-150 ease-in"
          enter-from-class="scale-0 opacity-0"
          leave-to-class="scale-0 opacity-0"
        >
          <svg
            v-if="modelValue"
            class="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </Transition>
      </div>
    </div>
    <span
      v-if="label"
      class="text-sm font-medium text-content select-none leading-5"
    >
      {{ label }}
    </span>
  </label>
</template>
