<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * Icono universal basado en Iconify → permite usar "el icono que quieras"
 * (cualquier set: solar, mdi, lucide…) con carga bajo demanda.
 * Si el nombre es un emoji, se pinta tal cual.
 */
const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
  }>(),
  { size: 24 },
)

const isEmoji = computed(() => !props.name.includes(':'))
const sizeStyle = computed(() => {
  const value = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { fontSize: value, width: value, height: value }
})
</script>

<template>
  <span
    v-if="isEmoji"
    class="inline-flex items-center justify-center leading-none"
    :style="sizeStyle"
    aria-hidden="true"
    >{{ name }}</span
  >
  <Icon v-else :icon="name" :width="size" :height="size" aria-hidden="true" />
</template>
