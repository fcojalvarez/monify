<script setup lang="ts" generic="T extends string">
import { computed, ref, useId, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  modelValue: T | ''
  label?: string
  placeholder?: string
  options: ReadonlyArray<{
    value: T | ''
    label: string
  }>
  error?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T | '']
}>()

const id = useId()

const open = ref(false)
const search = ref('')
const dialog = ref<HTMLDialogElement>()

watch(open, value => {
  if (!dialog.value) return

  if (value && !dialog.value.open) {
    dialog.value.showModal()
  }

  if (!value && dialog.value.open) {
    dialog.value.close()
  }
})

const filteredOptions = computed(() => {
  const query = search.value.toLowerCase().trim()

  if (!query) return props.options

  return props.options.filter(option =>
    option.label.toLowerCase().includes(query),
  )
})

const selectedLabel = computed(() => {
  return props.options.find(o => o.value === props.modelValue)?.label
})

function close() {
  open.value = false
  search.value = ''
}

function select(value: T | '') {
  emit('update:modelValue', value)
  close()
}

function onCancel(event: Event) {
  event.preventDefault()
  close()
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    close()
  }
}
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="field-label">
      {{ label }}
    </label>

    <button :id="id" type="button"
      class="h-12 w-full rounded-field border border-transparent bg-surface-muted px-4 text-left text-content transition-colors focus:border-primary-400 focus:bg-surface-raised focus:outline-none focus:shadow-focus"
      @click="open = true">
      {{ selectedLabel ?? placeholder ?? 'Selecciona…' }}
    </button>

    <dialog ref="dialog"
      class="w-full max-w-md rounded-card border border-line bg-surface-raised p-0 text-content shadow-raised backdrop:bg-secondary-950/50 backdrop:backdrop-blur-sm"
      @cancel="onCancel" @click="onBackdrop">
      <div class="p-4">
        <input v-model="search" type="text" placeholder="Buscar..."
          class="mb-4 h-11 w-full rounded-field border border-line bg-surface px-3 text-content placeholder:text-content-subtle focus:border-primary-400 focus:outline-none focus:shadow-focus">

        <div class="max-h-80 overflow-y-auto">
          <button v-for="option in filteredOptions" :key="option.value" type="button" :class="[
            'flex w-full items-center justify-between rounded-field px-4 py-3 text-left transition-colors',
            option.value === modelValue
              ? 'bg-primary-500/10 text-content'
              : 'text-content hover:bg-surface',
          ]" @click="select(option.value)">
            <span>{{ option.label }}</span>

            <AppIcon v-if="option.value === modelValue" name="solar:check-circle-bold" :size="18"
              class="text-primary-500" />
          </button>

          <p v-if="filteredOptions.length === 0" class="py-6 text-center text-sm text-content-subtle">
            Sin resultados
          </p>
        </div>
      </div>
    </dialog>

    <p v-if="error" class="mt-1.5 text-xs text-expense">
      {{ error }}
    </p>
  </div>
</template>