<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    block?: boolean
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const base =
  'inline-flex items-center justify-center gap-2 rounded-field font-semibold ' +
  'transition-all duration-200 ease-smooth active:scale-[0.97] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none'

const variants: Record<Variant, string> = {
  primary: 'bg-primary-500 text-white shadow-primary-glow hover:bg-primary-600',
  secondary: 'bg-surface-muted text-content hover:bg-line',
  ghost: 'bg-transparent text-content-muted hover:bg-surface-muted',
  danger: 'bg-expense text-white hover:bg-expense-dark',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

const classes = computed(() => [
  base,
  variants[props.variant],
  sizes[props.size],
  props.block && 'w-full',
])
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading">
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <slot />
  </button>
</template>
