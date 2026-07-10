<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLogo from '@/components/ui/AppLogo.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface">
    <!-- Cabecera decorativa con degradado de marca -->
    <div class="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 pb-16 pt-12">
      <div
        class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        class="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-secondary-500/20 blur-2xl"
        aria-hidden="true"
      />
      <div class="relative mx-auto w-full max-w-md px-6">
        <AppLogo :size="44" class="[&_span]:text-white" />
        <h1 class="mt-6 text-2xl font-bold text-white">Tus finanzas, claras.</h1>
        <p class="mt-1 text-sm text-white/80">Controla gastos e ingresos, en familia.</p>
      </div>
    </div>

    <!-- Tarjeta de formulario, superpuesta a la cabecera -->
    <main class="mx-auto -mt-10 w-full max-w-md flex-1 px-6 pb-10">
      <div class="card animate-slide-up p-6">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </div>
    </main>
  </div>
</template>
