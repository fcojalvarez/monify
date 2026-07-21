<script setup lang="ts">
import { ref } from 'vue'
import { SUGGESTED_ICONS } from '@/constants'
import AppIcon from './AppIcon.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ modelValue: string; color?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()

const custom = ref('')
const showCustom = ref(false)

function pick(icon: string) {
  const iconName = icon.includes('set:') ? `solar:${icon.split('set:')[1]}` : icon;
  emit('update:modelValue', iconName)
}

function applyCustom() {
  const value = custom.value.trim()
  if (value) pick(value)
}
</script>

<template>
  <div>
    <div class="grid grid-cols-6 gap-2">
      <button v-for="icon in SUGGESTED_ICONS" :key="icon" type="button"
        class="flex aspect-square items-center justify-center rounded-field border transition-colors" :class="modelValue === icon
          ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/15'
          : 'border-line text-content-muted hover:bg-surface-muted'
          " @click="pick(icon)">
        <AppIcon :name="icon" :size="22" />
      </button>

      <!-- Icono seleccionado que no está entre los sugeridos -->
      <div v-if="!SUGGESTED_ICONS.includes(modelValue as never)"
        class="flex aspect-square items-center justify-center rounded-field border border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/15"
        :style="color ? { color } : undefined">
        <AppIcon :name="modelValue" :size="22" />
      </div>

      <button type="button"
        class="flex aspect-square items-center justify-center rounded-field border border-dashed border-line text-content-subtle hover:bg-surface-muted"
        :aria-label="t('common.otherIcon')" @click="showCustom = !showCustom">
        <AppIcon name="solar:add-circle-linear" :size="22" />
      </button>
    </div>

    <!-- Cualquier icono de Iconify o un emoji -->
    <div v-if="showCustom" class="mt-3 flex gap-2">
      <input v-model="custom"
        class="h-10 flex-1 rounded-field border border-line bg-surface-muted px-3 text-sm text-content placeholder:text-content-subtle focus:border-primary-400 focus:outline-none"
        placeholder="p.ej. mdi:cash o 💸" @keydown.enter.prevent="applyCustom" />
      <button type="button" class="rounded-field bg-surface-muted px-4 text-sm font-semibold text-content hover:bg-line"
        @click="applyCustom">
        {{ t('common.use') }}
      </button>
    </div>
    <p class="helper-text">
      Usa cualquier icono de
      <a href="https://solar-icons.vercel.app/icons?style=bold" target="_blank" rel="noopener" class="underline">Solar
        icons</a>
      (formato <code>set:nombre</code>) o un emoji.
    </p>
  </div>
</template>
