<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FamilyMember } from '@/types'
import { useFamilyStore } from '@/stores/family'
import { PALETTE } from '@/constants'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ColorPicker from '@/components/ui/ColorPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const props = defineProps<{ member?: FamilyMember }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const family = useFamilyStore()
const isEdit = computed(() => !!props.member)

const AVATARS = [
  'solar:user-bold',
  'solar:women-bold',
  'solar:men-bold',
  'solar:smile-circle-bold',
  'solar:heart-bold',
  'solar:star-bold',
]

const form = reactive({
  name: props.member?.name ?? '',
  color: props.member?.color ?? PALETTE[0],
  avatar: props.member?.avatar_icon ?? AVATARS[0],
})

const error = ref<string | null>(null)
const serverError = ref<string | null>(null)
const saving = ref(false)

async function onSubmit() {
  error.value = null
  serverError.value = null
  if (!form.name.trim()) {
    error.value = 'Ponle un nombre'
    return
  }
  saving.value = true
  try {
    const payload = { name: form.name.trim(), color: form.color, avatar_icon: form.avatar }
    if (props.member) await family.update(props.member.id, payload)
    else await family.create(payload)
    emit('saved')
  } catch (e) {
    serverError.value = e instanceof Error ? e.message : 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

const initialForm = {
  name: form.name,
  color: form.color,
  avatar: form.avatar,
}

const hasChanges = computed(() => {
  return (
    form.name !== initialForm.name ||
    form.color !== initialForm.color ||
    form.avatar !== initialForm.avatar
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
    <div class="flex justify-center">
      <span
        class="flex h-16 w-16 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: form.color }"
      >
        <AppIcon :name="form.avatar" :size="32" />
      </span>
    </div>

    <BaseInput
      v-model="form.name"
      label="Nombre"
      icon="solar:user-bold"
      placeholder="p.ej. Ana, Papá…"
      :error="error"
    />

    <div>
      <span class="field-label">Avatar</span>
      <div class="grid grid-cols-6 gap-2">
        <button
          v-for="avatar in AVATARS"
          :key="avatar"
          type="button"
          class="flex aspect-square items-center justify-center rounded-field border transition-colors"
          :class="
            form.avatar === avatar
              ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/15'
              : 'border-line text-content-muted hover:bg-surface-muted'
          "
          @click="form.avatar = avatar"
        >
          <AppIcon :name="avatar" :size="22" />
        </button>
      </div>
    </div>

    <div>
      <span class="field-label">Color</span>
      <ColorPicker v-model="form.color" />
    </div>

    <p v-if="serverError" class="text-sm font-medium text-expense">{{ serverError }}</p>

    <div class="flex gap-3 pt-1">
      <BaseButton type="button" variant="secondary" block @click="onCancelClick">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" block :loading="saving">
        {{ isEdit ? 'Guardar' : 'Añadir miembro' }}
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
