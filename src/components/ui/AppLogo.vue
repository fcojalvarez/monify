<script setup lang="ts">
withDefaults(defineProps<{ size?: number; withWordmark?: boolean }>(), {
  size: 40,
  withWordmark: true,
})
</script>

<template>
  <div class="flex items-center gap-2.5">
    <svg :width="size" :height="size" viewBox="0 0 64 64" class="shrink-0" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#00b894" />
      <path
        d="M20 44V22c0-1.1.9-2 2-2h2c.7 0 1.3.35 1.7.93L32 31l4.3-10.07c.4-.58 1-.93 1.7-.93h2c1.1 0 2 .9 2 2v22"
        fill="none"
        stroke="#fff"
        stroke-width="4.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span v-if="withWordmark" class="text-xl font-bold tracking-tight text-content">Monify</span>
  </div>
</template>
