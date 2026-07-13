<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import BaseDialog from './BaseDialog.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    hasChanges?: boolean
  }>(),
  {
    hasChanges: false,
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const showConfirmDialog = ref(false)

/**
 * Swipe
 */
const startY = ref(0)
const translateY = ref(0)
const dragging = ref(false)

function onTouchStart(e: TouchEvent) {
  dragging.value = true
  startY.value = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (!dragging.value) return

  const delta = e.touches[0].clientY - startY.value

  translateY.value = Math.max(delta, 0)
}

function onTouchEnd() {
  dragging.value = false

  if (translateY.value > 120) {
    forceClose()
  }

  startY.value = 0
  translateY.value = 0
}


/**
 * Close handling
 */
function close() {
  if (props.hasChanges) {
    showConfirmDialog.value = true
  } else {
    emit('update:modelValue', false)
  }
}

function forceClose() {
  showConfirmDialog.value = false
  translateY.value = 0
  emit('update:modelValue', false)
}


/**
 * Keyboard
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (showConfirmDialog.value) return
    close()
  }
}


/**
 * Body scroll lock
 */
watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return

    document.body.style.overflow = open ? 'hidden' : ''

    if (open) {
      translateY.value = 0
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
      showConfirmDialog.value = false
      translateY.value = 0
    }
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
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog"
        aria-modal="true" :aria-label="title">
        <!-- Backdrop -->
        <div class="sheet-backdrop absolute inset-0 bg-secondary-950/50 backdrop-blur-sm" @click="close" />

        <!-- Panel -->
        <div
          class="sheet-panel relative w-full max-w-md rounded-t-[1.75rem] bg-surface-raised shadow-raised sm:rounded-card"
          :style="{
            transform: `translateY(${translateY}px)`
          }">
          <!-- Asa (grabber) -->
          <div class="flex justify-center pt-3 sm:hidden" @touchstart="onTouchStart" @touchmove="onTouchMove"
            @touchend="onTouchEnd">
            <span class="h-1.5 w-10 rounded-pill bg-line-strong" />
          </div>

          <header class="flex items-center justify-between px-5 pb-3 pt-4 gap-3">
            <h2 class="text-lg font-bold text-content">
              {{ title }}
            </h2>

            <div class="flex gap-2">
              <slot name="actions" />

              <button type="button"
                class="inline-flex h-7 items-center gap-2 rounded-full px-3 text-sm font-medium text-content-muted transition-colors hover:bg-surface-muted"
                aria-label="Cerrar" @click="close">
                <span>Cerrar</span>
              </button>
            </div>
          </header>

          <div class="max-h-[75dvh] overflow-y-auto px-5 pb-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>

    <BaseDialog v-model="showConfirmDialog" variant="danger" title="Cambios sin guardar" confirm-text="Descartar"
      cancel-text="Seguir editando" show-cancel @confirm="forceClose">
      <p class="text-content">
        Tienes cambios sin guardar. ¿Seguro que quieres salir? Se perderán los datos introducidos.
      </p>
    </BaseDialog>
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