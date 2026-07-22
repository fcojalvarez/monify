<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  modelValue: string | number | null
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
const inputRef = ref<HTMLInputElement | null>(null)

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type ?? 'text'
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus, $el: inputRef })
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="field-label">
      {{ label }} <slot name="label-slot"></slot>
    </label>

    <div class="relative">
      <AppIcon v-if="icon" :name="icon" :size="18"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle" />

      <input ref="inputRef" :id="id" :value="modelValue" :type="inputType" :placeholder="placeholder"
        :autocomplete="autocomplete" :required="required" :aria-invalid="hasError" :class="[
          'h-12 w-full rounded-field bg-surface-muted text-content placeholder:text-content-subtle',
          'border transition-colors duration-200 focus:bg-surface-raised focus:outline-none',
          icon ? 'pl-11' : 'pl-4',
          type === 'password' ? 'pr-11' : 'pr-4',
          hasError
            ? 'border-expense focus:border-expense'
            : 'border-transparent focus:border-primary-400',
        ]" @input="onInput" />

      <button v-if="type === 'password'" type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-content-subtle transition-colors hover:text-content"
        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="togglePassword">
        <AppIcon :name="showPassword
          ? 'solar:eye-closed-bold'
          : 'solar:eye-bold'
          " :size="18" />
      </button>
    </div>

    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">
      {{ error }}
    </p>
  </div>
</template>