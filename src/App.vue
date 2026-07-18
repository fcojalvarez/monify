<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'

useUiStore()

onMounted(() => {
  document.documentElement.dataset.appReady = 'true'
})
</script>

<template>
  <RouterView />
</template>
