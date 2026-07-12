<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Category, CategoryKind } from '@/types'
import { useCategoriesStore } from '@/stores/categories'
import { parseAmount, isPositiveAmount } from '@/utils/validation'
import { DEFAULT_CATEGORY_ICON, PALETTE } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import IconPicker from '@/components/ui/IconPicker.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const props = defineProps<{ category?: Category }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const categories = useCategoriesStore()
const isEdit = computed(() => !!props.category)

const form = reactive({
  name: props.category?.name ?? '',
  kind: (props.category?.kind ?? 'expense') as CategoryKind,
  icon: props.category?.icon ?? DEFAULT_CATEGORY_ICON,
  color: props.category?.color ?? PALETTE[0],
  hasLimit: props.category?.monthly_limit != null,
  limit: props.category?.monthly_limit != null ? String(props.category.monthly_limit) : '',
})

const errors = reactive<Record<string, string | undefined>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)

function validate(): boolean {
  errors.name = form.name.trim() ? undefined : 'Ponle un nombre'
  if (form.hasLimit) {
    errors.limit = isPositiveAmount(parseAmount(form.limit))
      ? undefined
      : 'El límite debe ser mayor que 0'
  } else {
    errors.limit = undefined
  }
  return !errors.name && !errors.limit
}

async function onSubmit() {
  serverError.value = null
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      icon: form.icon,
      color: form.color,
      monthly_limit: form.hasLimit ? parseAmount(form.limit) : null,
    }
    if (props.category) await categories.update(props.category.id, payload)
    else await categories.create(payload)
    emit('saved')
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

const initialForm = {
  name: form.name,
  kind: form.kind,
  icon: form.icon,
  color: form.color,
  hasLimit: form.hasLimit,
  limit: form.limit,
}

const hasChanges = computed(() => {
  return (
    form.name !== initialForm.name ||
    form.kind !== initialForm.kind ||
    form.icon !== initialForm.icon ||
    form.color !== initialForm.color ||
    form.hasLimit !== initialForm.hasLimit ||
    form.limit !== initialForm.limit
  )
})

const showConfirmDialog = ref(false)

function onCancelClick() {
  if (hasChanges.value) {
    showConfirmDialog.value = true
  } else {
    emit('cancel')
  }
}

defineExpose({
  hasChanges,
})
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="onSubmit">
    <!-- Vista previa -->
    <div class="flex items-center gap-3">
      <span
        class="flex h-12 w-12 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: form.color }"
      >
        <AppIcon :name="form.icon" :size="24" />
      </span>
      <span class="text-sm text-content-muted">Así se verá tu categoría</span>
    </div>

    <SegmentedControl
      v-model="form.kind"
      :options="[
        { value: 'expense', label: 'Gasto' },
        { value: 'income', label: 'Ingreso' },
      ]"
    />

    <BaseInput
      v-model="form.name"
      label="Nombre"
      icon="solar:tag-bold"
      placeholder="p.ej. Ocio, Nómina…"
      :error="errors.name"
    />

    <div>
      <span class="field-label">Icono</span>
      <IconPicker v-model="form.icon" :color="form.color" />
    </div>

    <div>
      <span class="field-label">Color</span>
      <ColorPicker v-model="form.color" />
    </div>

    <!-- Límite mensual opcional (vale también para ingresos) -->
    <div>
      <label class="flex cursor-pointer items-center justify-between">
        <span class="text-sm font-medium text-content">Límite mensual</span>
        <input v-model="form.hasLimit" type="checkbox" class="peer sr-only" />
        <span
          class="relative h-6 w-11 rounded-pill bg-line transition-colors peer-checked:bg-primary-500"
        >
          <span
            class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
          />
        </span>
      </label>
      <div v-if="form.hasLimit" class="mt-3">
        <BaseInput
          v-model="form.limit"
          type="number"
          icon="solar:tag-price-bold"
          placeholder="0,00"
          :error="errors.limit"
        />
      </div>
    </div>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex gap-3 pt-1">
      <BaseButton type="button" variant="secondary" block @click="onCancelClick">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" block :loading="saving">
        {{ isEdit ? 'Guardar' : 'Crear categoría' }}
      </BaseButton>
    </div>
  </form>

  <BaseDialog
    v-slot:default
    v-model="showConfirmDialog"
    variant="danger"
    title="Cambios sin guardar"
    confirm-text="Descartar"
    cancel-text="Seguir editando"
    show-cancel
    @confirm="emit('cancel')"
  >
    <p class="text-content">
      Tienes cambios sin guardar. ¿Seguro que quieres salir? Se perderán los datos introducidos.
    </p>
  </BaseDialog>
</template>
