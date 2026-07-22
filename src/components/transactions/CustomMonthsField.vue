<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { formatDate } from '@/utils/format'
import { customOccurrenceOnOrAfter } from '@/utils/recurring'
import { useI18n, getIntlLocale } from '@/i18n'

const props = defineProps<{
  months: number[]
  dayOfMonth: string
  /** Fecha de inicio para calcular la vista previa de la próxima ejecución (opcional). */
  startOn?: string
  monthsError?: string
  dayError?: string
}>()

const emit = defineEmits<{
  'update:months': [value: number[]]
  'update:dayOfMonth': [value: string]
}>()

const { t } = useI18n()

// Rejilla de meses con nombres cortos localizados.
const monthButtons = computed(() => {
  const formatter = new Intl.DateTimeFormat(getIntlLocale(), { month: 'short' })
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: formatter.format(new Date(Date.UTC(2000, index, 1))),
  }))
})

function toggleMonth(month: number) {
  const next = [...props.months]
  const position = next.indexOf(month)
  if (position === -1) {
    next.push(month)
  } else {
    next.splice(position, 1)
  }
  emit('update:months', next)
}

const dayModel = computed({
  get: () => props.dayOfMonth,
  set: (value: string) => emit('update:dayOfMonth', value),
})

// Vista previa de la próxima ejecución.
const nextOccurrence = computed(() => {
  const day = Number(props.dayOfMonth)
  if (!props.startOn || !props.months.length || !Number.isFinite(day) || day < 1) return ''
  return customOccurrenceOnOrAfter(props.startOn, props.months, day)
})
</script>

<template>
  <div class="space-y-3 rounded-field border border-line p-3">
    <div>
      <label class="field-label">{{ t('recurringForm.selectMonths') }}</label>
      <div class="mt-2 grid grid-cols-4 gap-2">
        <button v-for="month in monthButtons" :key="month.value" type="button" :data-month="month.value"
          class="h-9 rounded-field text-sm font-medium capitalize transition-colors"
          :class="months.includes(month.value)
            ? 'bg-primary-500 text-white'
            : 'bg-surface-muted text-content-muted hover:bg-line'"
          @click="toggleMonth(month.value)">
          {{ month.label }}
        </button>
      </div>
      <p v-if="monthsError" class="mt-1 text-xs text-expense">{{ monthsError }}</p>
    </div>

    <BaseInput v-model="dayModel" :label="t('recurringForm.dayOfMonth')" type="number" min="1" max="31"
      icon="solar:calendar-bold" :error="dayError" />

    <p class="text-xs text-content-muted">{{ t('recurringForm.customHint') }}</p>

    <p v-if="nextOccurrence" class="text-xs font-medium text-content">
      {{ t('recurringForm.nextOccurrence', { date: formatDate(nextOccurrence) }) }}
    </p>
  </div>
</template>
