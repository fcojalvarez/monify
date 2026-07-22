<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseSheet from '@/components/ui/BaseSheet.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  modelValue: Date
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Date]
}>()

const { t } = useI18n()

const showPicker = ref(false)
const pickerYear = ref(props.modelValue.getFullYear())

const months = computed(() => [
  t('misc.month.january'),
  t('misc.month.february'),
  t('misc.month.march'),
  t('misc.month.april'),
  t('misc.month.may'),
  t('misc.month.june'),
  t('misc.month.july'),
  t('misc.month.august'),
  t('misc.month.september'),
  t('misc.month.october'),
  t('misc.month.november'),
  t('misc.month.december'),
])

const currentMonthLabel = computed(() => {
  const label = props.modelValue.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const isCurrentMonth = computed(() => {
  const now = new Date()
  return (
    props.modelValue.getFullYear() === now.getFullYear() &&
    props.modelValue.getMonth() === now.getMonth()
  )
})

function prevMonth() {
  const newDate = new Date(props.modelValue)
  newDate.setMonth(newDate.getMonth() - 1)
  emit('update:modelValue', newDate)
}

function nextMonth() {
  const newDate = new Date(props.modelValue)
  newDate.setMonth(newDate.getMonth() + 1)
  emit('update:modelValue', newDate)
}

function goToCurrentMonth() {
  emit('update:modelValue', new Date())
}

function selectMonth(monthIndex: number) {
  const newDate = new Date(pickerYear.value, monthIndex, 1)
  emit('update:modelValue', newDate)
  showPicker.value = false
}

function changePickerYear(delta: number) {
  pickerYear.value += delta
}

function openPicker() {
  pickerYear.value = props.modelValue.getFullYear()
  showPicker.value = true
}
</script>

<template>
  <div
    class="flex items-center justify-between rounded-card bg-surface-raised border border-line p-2 shadow-sm"
  >
    <!-- Botón anterior -->
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted hover:text-content transition-colors active:scale-95"
      :aria-label="t('misc.monthSelectorPrevAria')"
      type="button"
      @click="prevMonth"
    >
      <AppIcon name="solar:alt-arrow-left-bold" :size="22" />
    </button>

    <!-- Botón central para abrir selector -->
    <button
      class="flex items-center gap-2 px-4 py-2 rounded-pill hover:bg-surface-muted text-content font-bold transition-colors"
      type="button"
      @click="openPicker"
    >
      <span>{{ currentMonthLabel }}</span>
      <AppIcon name="solar:calendar-bold-duotone" :size="18" class="text-primary-500" />
    </button>

    <!-- Botón siguiente/actual -->
    <div class="flex items-center gap-1">
      <!-- Botón de ir al mes actual (solo si no es el mes actual) -->
      <button
        v-if="!isCurrentMonth"
        class="flex h-10 px-3 items-center justify-center gap-1.5 rounded-pill bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-950/30 dark:hover:bg-primary-950/50 dark:text-primary-400 text-xs font-semibold transition-colors"
        type="button"
        @click="goToCurrentMonth"
      >
        <AppIcon name="solar:restart-bold" :size="14" />
        {{ t('misc.monthSelectorToday') }}
      </button>

      <button
        class="flex h-10 w-10 items-center justify-center rounded-full text-content-muted hover:bg-surface-muted hover:text-content transition-colors active:scale-95"
        :aria-label="t('misc.monthSelectorNextAria')"
        type="button"
        @click="nextMonth"
      >
        <AppIcon name="solar:alt-arrow-right-bold" :size="22" />
      </button>
    </div>

    <!-- BaseSheet para el selector histórico -->
    <BaseSheet v-model="showPicker" :title="t('misc.monthSelectorTitle')">
      <div class="space-y-6">
        <!-- Selector de Año -->
        <div class="flex items-center justify-between rounded-field bg-surface-muted p-1">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-[0.625rem] text-content-muted hover:text-content hover:bg-surface-raised transition-all"
            type="button"
            @click="changePickerYear(-1)"
          >
            <AppIcon name="solar:alt-arrow-left-bold" :size="18" />
          </button>
          <span class="text-base font-bold text-content">{{ pickerYear }}</span>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-[0.625rem] text-content-muted hover:text-content hover:bg-surface-raised transition-all"
            type="button"
            @click="changePickerYear(1)"
          >
            <AppIcon name="solar:alt-arrow-right-bold" :size="18" />
          </button>
        </div>

        <!-- Grid de Meses -->
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(monthName, index) in months"
            :key="index"
            type="button"
            class="h-12 rounded-field text-sm font-semibold transition-all duration-200"
            :class="
              modelValue.getFullYear() === pickerYear && modelValue.getMonth() === index
                ? 'bg-primary-500 text-white shadow-raised'
                : 'bg-surface-muted text-content hover:bg-line'
            "
            @click="selectMonth(index)"
          >
            {{ monthName }}
          </button>
        </div>
      </div>
    </BaseSheet>
  </div>
</template>
