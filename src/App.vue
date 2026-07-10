<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'

// Inicializa el tema (aplica la clase .dark según preferencia/almacenamiento)
useUiStore()

onMounted(() => {
  // Marca la app como lista (útil para splash en Capacitor)
  document.documentElement.dataset.appReady = 'true'
})
</script>

<template>
  <RouterView />
</template>
