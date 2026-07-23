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
    noItemMessage?: string
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  {
    showAllOption: false,
    allLabel: 'Todos',
    teleport: true,
    closeOnClickOutside: true,
    size: 'md',
    disabled: false
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

const dropdownStyle = ref<Record<string, string>>({})

function updateDropdownPosition() {
  if (open.value && props.teleport && buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    // Usamos posicionamiento fixed relativo al viewport para que siempre
    // aparezca pegado por debajo, sin importar contextos de apilado.
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: '999999',
    }
  }
}

// Escuchar cambios de scroll/resize para re-posicionar el dropdown si está abierto
onMounted(() => {
  window.addEventListener('scroll', updateDropdownPosition, true)
  window.addEventListener('resize', updateDropdownPosition, true)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition, true)
})

function onOpenHandle() {
  if (props.disabled) return
  teleportTarget.value = resolveTeleportTarget()
  open.value = !open.value

  if (open.value) {
    search.value = ''
    if (showSearch.value) {
      nextTick(() => {
        searchInput.value?.focus()
      })
    }
    updateDropdownPosition()
  }
}

function close() {
  open.value = false
  search.value = ''
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

defineExpose({ focus, $el: buttonRef, close, open, search })
</script>

<template>
  <div class="relative w-full">
    <label v-if="label" class="field-label" :class="[size === 'sm' ? 'text-[11px] mb-1' : '']">
      {{ label }}
    </label>

    <div class="relative">
      <button ref="buttonRef" type="button" :disabled="disabled"
        class="w-full rounded-field border bg-surface-muted px-4 text-left text-content transition-all duration-200 focus:bg-surface-raised focus:outline-none focus:shadow-focus"
        :class="[
          size === 'sm' ? 'h-8 text-xs pr-8' : 'h-12 text-sm pr-10',
          hasError ? 'border-expense focus:border-expense' : 'border-transparent focus:border-primary-400',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        ]"
        @click="onOpenHandle">
        {{ selectedLabel ?? placeholder ?? t('common.select') }}
      </button>

      <AppIcon name="solar:alt-arrow-down-linear" :size="size === 'sm' ? 14 : 16"
        class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-content-muted"
        :class="[size === 'sm' ? 'right-2' : 'right-2.5']" />
    </div>

    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">
      {{ error }}
    </p>

    <Teleport :disabled="!teleport" :to="teleportTarget">
      <Transition enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div v-if="open" data-testid="select-overlay" @click.self.stop="handleOverlayClick" :class="[
          teleport
            ? 'fixed inset-0 z-[999999] bg-transparent'
            : 'absolute left-0 top-full z-[100] mt-1.5 w-full'
        ]">

          <Transition name="dropdown" appear>
            <div v-if="open" :style="teleport ? dropdownStyle : {}" class="
                flex
                flex-col
                bg-surface-raised
                shadow-raised
                border
                border-line
                rounded-2xl
                max-h-60
                overflow-hidden
              " :class="[
                teleport ? '' : 'absolute left-0 right-0 top-full mt-1.5 w-full'
              ]">

              <div v-if="showSearch" class="border-b border-line px-3 py-2">
                <input v-model="search" ref="searchInput" type="text" :placeholder="t('common.search')" class="
                    h-8
                    w-full
                    rounded-field
                    border
                    border-line
                    bg-surface
                    px-3
                    text-xs
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
                  p-1.5
                ">
                <slot name="header" :close="close" :search="search" />

                <p v-if="search.trim() && !filteredOptions.length"
                  class="px-3 py-4 text-center text-xs text-content-subtle">
                  {{ noItemMessage || t('common.noResults') }}
                </p>

                <template v-else>
                  <button v-for="option in filteredOptions" :key="String(option.value)" type="button" class="
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-lg
                      px-3
                      py-2
                      text-left
                      text-xs
                      transition-all
                      duration-200
                    " :class="option.value === modelValue
                      ? 'bg-primary-500/10 text-content font-semibold'
                      : 'text-content hover:bg-surface-muted'
                      " @click="select(option.value)">
                    <span>{{ option.label }}</span>

                    <AppIcon v-if="option.value === modelValue" name="solar:check-circle-bold" :size="14"
                      class="text-primary-500" />
                  </button>
                </template>
              </div>

            </div>
          </Transition>

        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
  transform-origin: top;
}
.dropdown-enter-from,
.dropdown-leave-to {
  transform: scaleY(0.95) translateY(-8px);
  opacity: 0;
}
</style>
