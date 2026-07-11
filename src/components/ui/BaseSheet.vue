<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

// Bloquea el scroll del fondo mientras el sheet está abierto
watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Backdrop -->
        <div class="sheet-backdrop absolute inset-0 bg-secondary-950/50 backdrop-blur-sm" />

        <!-- Panel -->
        <div
          class="sheet-panel relative w-full max-w-md rounded-t-[1.75rem] bg-surface-raised shadow-raised sm:rounded-card"
          :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
        >
          <!-- Asa (grabber) -->
          <div class="flex justify-center pt-3 sm:hidden">
            <span class="h-1.5 w-10 rounded-pill bg-line-strong" />
          </div>

          <header class="flex items-center justify-between px-5 pb-3 pt-4">
            <h2 class="text-lg font-bold text-content">{{ title }}</h2>
            <div class="flex items-center gap-1">
              <slot name="actions" />
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted"
                aria-label="Cerrar"
                @click="close"
              >
                <AppIcon name="solar:close-circle-bold" :size="22" />
              </button>
            </div>
          </header>

          <div class="max-h-[75dvh] overflow-y-auto px-5 pb-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: scale(0.96);
  }
}
</style>
