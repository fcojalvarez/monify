<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { Icon } from '@iconify/vue'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
  }>(),
  {
    size: 24,
  },
)

const isEmoji = computed(() => !props.name.includes(':'))

const sizeStyle = computed(() => {
  const value = typeof props.size === 'number' ? `${props.size}px` : props.size

  return {
    fontSize: value,
    width: value,
    height: value,
  }
})
</script>

<template>
  <span v-if="isEmoji" class="inline-flex items-center justify-center leading-none" :style="sizeStyle" v-bind="attrs"
    aria-hidden="true">
    {{ name }}
  </span>

  <Icon v-else :icon="name" :width="size" :height="size" v-bind="attrs" aria-hidden="true" />
</template>