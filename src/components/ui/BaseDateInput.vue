<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { getIntlLocale, useI18n } from '@/i18n'
import { env } from '@/config/env'
import { formatDate, todayISO } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label?: string
    placeholder?: string
    icon?: string
    error?: string | null
    required?: boolean
    disabled?: boolean
  }>(),
  {
    icon: 'solar:calendar-bold',
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)

// El mes/año activo en el calendario
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth()) // 0-11

// Sincronizar el mes/año del calendario con el valor inicial al abrirse
watch(open, (isOpen) => {
  if (isOpen) {
    const baseDate = props.modelValue ? new Date(props.modelValue) : new Date()
    if (!isNaN(baseDate.getTime())) {
      year.value = baseDate.getFullYear()
      month.value = baseDate.getMonth()
    }
  }
})

const currentLocale = computed(() => getIntlLocale() || env.defaultLocale)

const hasError = computed(() => !!props.error)

const formattedDisplayDate = computed(() => {
  if (!props.modelValue) return props.placeholder || t('common.selectDate') || 'Seleccionar fecha'
  return formatDate(props.modelValue, { day: 'numeric', month: 'long', year: 'numeric' })
})

// Días de la semana abreviados según idioma local
const weekdays = computed(() => {
  const locale = currentLocale.value
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 5, 1 + i) // 1 de junio de 2026 es lunes
    const label = formatter.format(d)
    return label.replace(/\.$/, '') // Quitar el punto final si lo hay (como "lun.")
  })
})

// Título del mes y año (p. ej., "Enero 2026")
const monthYearLabel = computed(() => {
  const locale = currentLocale.value
  const d = new Date(year.value, month.value, 1)
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const formatted = formatter.format(d)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})

// Días en un mes
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

// Día de la semana del primer día del mes (ajustado para que lunes sea 0, domingo 6)
const startDayOfWeek = (y: number, m: number) => {
  const day = new Date(y, m, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// Formatear fecha en string YYYY-MM-DD
const formatDateString = (y: number, m: number, d: number) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

// Cuadrícula completa de 42 días para el calendario
const calendarDays = computed(() => {
  const days: { day: number; currentMonth: boolean; dateString: string; isToday: boolean }[] = []

  const totalDays = daysInMonth(year.value, month.value)
  const prevMonthTotalDays = daysInMonth(year.value, month.value - 1)
  const startDay = startDayOfWeek(year.value, month.value)
  const todayStr = todayISO()

  // Días del mes anterior (relleno al inicio)
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i
    const prevMonth = month.value === 0 ? 11 : month.value - 1
    const prevYear = month.value === 0 ? year.value - 1 : year.value
    const dateStr = formatDateString(prevYear, prevMonth, d)
    days.push({
      day: d,
      currentMonth: false,
      dateString: dateStr,
      isToday: dateStr === todayStr
    })
  }

  // Días del mes actual
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDateString(year.value, month.value, d)
    days.push({
      day: d,
      currentMonth: true,
      dateString: dateStr,
      isToday: dateStr === todayStr
    })
  }

  // Días del mes siguiente (relleno al final para completar las 6 semanas / 42 celdas)
  const remaining = 42 - days.length
  for (let n = 1; n <= remaining; n++) {
    const nextMonth = month.value === 11 ? 0 : month.value + 1
    const nextYear = month.value === 11 ? year.value + 1 : year.value
    const dateStr = formatDateString(nextYear, nextMonth, n)
    days.push({
      day: n,
      currentMonth: false,
      dateString: dateStr,
      isToday: dateStr === todayStr
    })
  }

  return days
})

function prevMonth() {
  if (month.value === 0) {
    month.value = 11
    year.value--
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 11) {
    month.value = 0
    year.value++
  } else {
    month.value++
  }
}

function selectDay(dateString: string) {
  if (props.disabled) return
  emit('update:modelValue', dateString)
  open.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (open.value && containerRef.value && !containerRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function toggleOpen() {
  if (!props.disabled) {
    open.value = !open.value
  }
}
</script>

<template>
  <div class="relative w-full" ref="containerRef">
    <label v-if="label" class="field-label">
      {{ label }}
    </label>

    <div class="relative">
      <button
        type="button"
        :disabled="disabled"
        class="h-12 w-full rounded-field border bg-surface-muted px-4 text-left text-content transition-all duration-200 focus:bg-surface-raised focus:outline-none focus:shadow-focus"
        :class="[
          icon ? 'pl-11' : 'pl-4',
          hasError ? 'border-expense focus:border-expense' : 'border-transparent focus:border-primary-400',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          modelValue ? 'text-content' : 'text-content-subtle'
        ]"
        @click="toggleOpen"
      >
        {{ formattedDisplayDate }}
      </button>

      <AppIcon
        v-if="icon"
        :name="icon"
        :size="18"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle"
      />

      <AppIcon
        name="solar:alt-arrow-down-linear"
        :size="16"
        class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-content-subtle"
      />
    </div>

    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">
      {{ error }}
    </p>

    <!-- Desplegable del calendario animado -->
    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute left-0 right-0 z-[100] mt-1.5 rounded-2xl border border-line bg-surface-raised p-4 shadow-raised transition-all duration-300"
      >
        <!-- Cabecera del calendario -->
        <div class="flex items-center justify-between pb-3">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-content hover:bg-surface-muted transition-colors"
            @click="prevMonth"
          >
            <AppIcon name="solar:alt-arrow-left-linear" :size="16" />
          </button>

          <span class="text-sm font-bold text-content">
            {{ monthYearLabel }}
          </span>

          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-content hover:bg-surface-muted transition-colors"
            @click="nextMonth"
          >
            <AppIcon name="solar:alt-arrow-right-linear" :size="16" />
          </button>
        </div>

        <!-- Días de la semana -->
        <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-content-subtle uppercase pb-1 border-b border-line/60">
          <div v-for="day in weekdays" :key="day" class="py-1">
            {{ day }}
          </div>
        </div>

        <!-- Cuadrícula de días -->
        <div class="grid grid-cols-7 gap-1 pt-2">
          <button
            v-for="cell in calendarDays"
            :key="cell.dateString"
            type="button"
            class="relative flex aspect-square items-center justify-center rounded-full text-xs font-medium transition-all duration-200"
            :class="[
              cell.currentMonth ? 'text-content' : 'text-content-subtle/40',
              cell.dateString === modelValue
                ? 'bg-primary-500 text-white font-bold scale-105 shadow-sm shadow-primary-500/30'
                : 'hover:bg-surface-muted',
            ]"
            @click="selectDay(cell.dateString)"
          >
            <span>{{ cell.day }}</span>
            <span
              v-if="cell.isToday && cell.dateString !== modelValue"
              class="absolute bottom-1 h-1 w-1 rounded-full bg-primary-500"
            />
          </button>
        </div>
      </div>
    </Transition>
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
