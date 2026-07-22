<script setup lang="ts" generic="T extends string">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'
import { useI18n } from '@/i18n'

type Option<T extends string> = { value: T | '', label: string }

const props = withDefaults(
  defineProps<{
    modelValue: T | ''
    label?: string
    placeholder?: string
    options: ReadonlyArray<{ value: T; label: string }>
    error?: string | null
    showAllOption?: boolean
    allLabel?: string
    teleport?: boolean
    closeOnClickOutside?: boolean
  }>(),
  {
    showAllOption: false,
    allLabel: 'Todos',
    teleport: true,
    closeOnClickOutside: true
  }
)

const { t } = useI18n()

const allLabel = computed(() => props.allLabel || t('common.all'))

const emit = defineEmits<{ 'update:modelValue': [value: T | ''] }>()

const open = ref(false)
const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)

/**
 * Destino del Teleport del desplegable.
 *
 * Por defecto es `<body>`, pero si el select vive dentro de un `<dialog>` abierto con
 * `showModal()` (que el navegador promociona al "top layer"), un teleport a `<body>`
 * quedaría PINTADO POR DEBAJO de ese diálogo — no se podrían elegir opciones. En ese
 * caso teletransportamos el desplegable DENTRO del propio `<dialog>`, de modo que
 * comparta su top layer y quede siempre por encima del contenido del formulario.
 */
const teleportTarget = ref<string | HTMLElement>('body')

function resolveTeleportTarget(): string | HTMLElement {
  if (!props.teleport) return 'body'
  return buttonRef.value?.closest('dialog') ?? 'body'
}

const hasError = computed(() => !!props.error)

const allOptions = computed<Option<T>[]>(() => {
  const options: Option<T>[] = [...props.options]
  if (props.showAllOption) options.unshift({ value: '', label: allLabel.value })
  return options
})

const showSearch = computed(() => allOptions.value.length > 8)

const filteredOptions = computed(() => {
  const query = search.value.trim().toLowerCase()
  return query
    ? allOptions.value.filter(o => o.label.toLowerCase().includes(query))
    : allOptions.value
})

const selectedLabel = computed(() =>
  allOptions.value.find(o => o.value === props.modelValue)?.label
)

/**
 * Keyboard handling
 */
const keyboardOffset = ref(0)

function updateKeyboardOffset() {
  if (!window.visualViewport) return

  const viewport = window.visualViewport

  keyboardOffset.value = Math.max(
    window.innerHeight - viewport.height,
    0
  )
}

onMounted(() => {
  window.visualViewport?.addEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.addEventListener('scroll', updateKeyboardOffset)
})

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
  window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
})


/**
 * Swipe
 */
const startY = ref(0)
const translateY = ref(0)
const dragging = ref(false)

function onTouchStart(e: TouchEvent) {
  if (!props.teleport) return

  dragging.value = true
  startY.value = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (!dragging.value || !props.teleport) return

  const delta = e.touches[0].clientY - startY.value
  translateY.value = Math.max(delta, 0)
}

function onTouchEnd() {
  if (!props.teleport) return

  dragging.value = false

  if (translateY.value > 120) {
    close()
  }

  startY.value = 0
  translateY.value = 0
}

function onOpenHandle() {
  teleportTarget.value = resolveTeleportTarget()
  open.value = true
  search.value = ''
  if (showSearch.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
  translateY.value = 0
  keyboardOffset.value = 0
}

function close() {
  open.value = false
  search.value = ''
  translateY.value = 0
  keyboardOffset.value = 0
}

function handleOverlayClick() {
  if (props.closeOnClickOutside) {
    close()
  }
}

function select(value: T | '') {
  emit('update:modelValue', value)
  close()
}

function focus() {
  buttonRef.value?.focus()
}

defineExpose({ focus, $el: buttonRef })
</script>

<template>
  <div class="relative">
    <label v-if="label" class="field-label">
      {{ label }}
    </label>

    <div class="relative">
      <button ref="buttonRef" type="button"
        class="h-12 w-full rounded-field border bg-surface-muted px-4 pr-10 text-left text-content transition-colors focus:bg-surface-raised focus:outline-none focus:shadow-focus"
        :class="hasError ? 'border-expense focus:border-expense' : 'border-transparent focus:border-primary-400'"
        @click="onOpenHandle">
        {{ selectedLabel ?? placeholder ?? t('common.select') }}
      </button>

      <AppIcon name="solar:alt-arrow-down-linear" :size="16"
        class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
    </div>

    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">
      {{ error }}
    </p>

    <Teleport :disabled="!teleport" :to="teleportTarget">
      <Transition enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div v-if="open" data-testid="select-overlay" @click.self.stop="handleOverlayClick" :class="[
          teleport
            ? 'fixed inset-0 z-[999999] flex items-end justify-center bg-secondary-950/50 backdrop-blur-sm md:items-center'
            : 'absolute left-0 top-full z-[100] mt-2 w-full'
        ]">

          <Transition enter-active-class="transition duration-300 ease-out"
            leave-active-class="transition duration-200 ease-in"
            enter-from-class="translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"
            leave-to-class="translate-y-full md:translate-y-0 md:scale-95 md:opacity-0">

            <div v-if="open" class="
                flex
                flex-col
                bg-surface-raised
                shadow-raised
                w-full
                max-h-[85dvh]
                border-line
                border-t
                md:border
                rounded-t-2xl
              " :class="[
                teleport ? 'md:max-w-md' : '',
                keyboardOffset > 0 ? 'fixed bottom-0' : ''
              ]" :style="teleport
                ? {
                  maxHeight: keyboardOffset > 0 ? `calc(${keyboardOffset}px - 16px)` : '85dvh',
                  marginBottom: keyboardOffset > 0 ? '16px' : '0',
                  transform: `translateY(${translateY}px)`
                }
                : {}
                ">

              <!-- Solo el handle controla el swipe -->
              <div class="flex justify-center py-3 md:hidden" @touchstart="onTouchStart" @touchmove="onTouchMove"
                @touchend="onTouchEnd">
                <div class="h-1.5 w-12 rounded-full bg-line" />
              </div>


              <div v-if="showSearch" class="border-b border-line px-4 py-3">
                <input v-model="search" ref="searchInput" type="text" :placeholder="t('common.search')" class="
                    h-10
                    w-full
                    rounded-field
                    border
                    border-line
                    bg-surface
                    px-3
                    text-sm
                    text-content
                    placeholder:text-content-subtle
                    focus:border-primary-400
                    focus:outline-none
                    focus:shadow-focus
                  ">
              </div>


              <div class="
                  min-h-0
                  overflow-y-auto
                  overscroll-contain
                  px-2
                  p-2
                ">
                <p v-if="search.trim() && !filteredOptions.length"
                  class="px-3 py-6 text-center text-sm text-content-subtle">
                  {{ t('common.noResults') }}
                </p>

                <button v-else v-for="option in filteredOptions" :key="String(option.value)" type="button" class="
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-lg
                    px-3
                    py-3.5
                    text-left
                    text-sm
                    transition-all
                    duration-200
                  " :class="option.value === modelValue
                    ? 'bg-primary-500/10 text-content'
                    : 'text-content hover:bg-surface'
                    " @click="select(option.value)">
                  <span>{{ option.label }}</span>

                  <AppIcon v-if="option.value === modelValue" name="solar:check-circle-bold" :size="16"
                    class="text-primary-500" />
                </button>
              </div>

            </div>

          </Transition>

        </div>
      </Transition>
    </Teleport>
  </div>
</template>