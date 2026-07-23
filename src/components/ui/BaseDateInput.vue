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
const buttonRef = ref<HTMLButtonElement | null>(null)

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
    updateDropdownPosition()
  }
})

const currentLocale = computed(() => getIntlLocale() || env.defaultLocale)

const hasError = computed(() => !!props.error)

// Visualización de fecha más corta y compacta para evitar desbordamientos en móviles
const formattedDisplayDate = computed(() => {
  if (!props.modelValue) return props.placeholder || t('common.selectDate')
  return formatDate(props.modelValue, { day: 'numeric', month: 'short', year: 'numeric' })
})

// Nombres de los meses localizados para acceso directo
const monthNames = computed(() => {
  const locale = currentLocale.value
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' })
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, i, 1)
    const label = formatter.format(d)
    return label.charAt(0).toUpperCase() + label.slice(1)
  })
})

// Rango de años para acceso rápido (los últimos 20 años y los próximos 10)
const availableYears = computed(() => {
  const currentY = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentY - 20; y <= currentY + 10; y++) {
    years.push(y)
  }
  return years
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

const dropdownStyle = ref<Record<string, string>>({})
const isPlacedUpward = ref(false)

function updateDropdownPosition() {
  if (open.value && buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 310 // Altura estimada del calendario
    const minWidth = 280

    // Auto-posicionamiento vertical: si no cabe abajo, colocar hacia arriba
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    let leftPos = rect.left
    // Mantener dentro de los márgenes de la pantalla
    if (leftPos + minWidth > window.innerWidth) {
      leftPos = Math.max(16, window.innerWidth - minWidth - 16)
    }

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      isPlacedUpward.value = true
      dropdownStyle.value = {
        position: 'fixed',
        bottom: `${viewportHeight - rect.top + 6}px`,
        left: `${leftPos}px`,
        width: `${Math.max(rect.width, minWidth)}px`,
        maxWidth: '320px',
        zIndex: '999999',
      }
    } else {
      isPlacedUpward.value = false
      dropdownStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${leftPos}px`,
        width: `${Math.max(rect.width, minWidth)}px`,
        maxWidth: '320px',
        zIndex: '999999',
      }
    }
  }
}

const teleportTarget = ref<string | HTMLElement>('body')

function resolveTeleportTarget(): string | HTMLElement {
  return containerRef.value?.closest('dialog') ?? 'body'
}

function handleClickOutside(event: MouseEvent) {
  if (open.value && containerRef.value && !containerRef.value.contains(event.target as Node)) {
    // Si estamos usando Teleport, los clics en el propio calendario flotante (que está en body)
    // deben ser ignorados y no cerrar el calendario. Por eso comprobamos si el clic ocurrió
    // dentro de algún elemento con la clase '.calendar-dropdown-container'
    const target = event.target as HTMLElement
    if (target.closest('.calendar-dropdown-container')) return

    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('scroll', updateDropdownPosition, true)
  window.addEventListener('resize', updateDropdownPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition, true)
})

function toggleOpen() {
  if (!props.disabled) {
    teleportTarget.value = resolveTeleportTarget()
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
      <button ref="buttonRef" type="button" :disabled="disabled"
        class="h-12 w-full rounded-field border bg-surface-muted px-4 text-left text-content transition-all duration-200 focus:bg-surface-raised focus:outline-none focus:shadow-focus"
        :class="[
          icon ? 'pl-11' : 'pl-4',
          hasError ? 'border-expense focus:border-expense' : 'border-transparent focus:border-primary-400',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          modelValue ? 'text-content' : 'text-content-subtle'
        ]" @click="toggleOpen">
        {{ formattedDisplayDate }}
      </button>

      <AppIcon v-if="icon" :name="icon" :size="18"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle" />

      <AppIcon name="solar:alt-arrow-down-linear" :size="16"
        class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-content-subtle" />
    </div>

    <p v-if="hasError" class="mt-1.5 text-xs font-medium text-expense">
      {{ error }}
    </p>

    <!-- Desplegable del calendario animado y teletransportado -->
    <Teleport :to="teleportTarget">
      <Transition name="dropdown">
        <div v-if="open" :style="dropdownStyle"
          class="calendar-dropdown-container rounded-2xl border border-line bg-surface-raised p-4 shadow-raised transition-all duration-300"
          :class="[isPlacedUpward ? 'origin-bottom' : 'origin-top']">
          <!-- Cabecera del calendario con selectores rápidos -->
          <div class="flex items-center justify-between pb-3">
            <button type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-content hover:bg-surface-muted transition-colors"
              @click="prevMonth">
              <AppIcon name="solar:alt-arrow-left-linear" :size="16" />
            </button>

            <!-- Acceso directo a meses y años mediante selects integrados -->
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-muted transition-colors">
              <select v-model="month"
                class="bg-transparent font-bold text-sm text-content focus:outline-none cursor-pointer hover:text-primary-500 py-0.5">
                <option v-for="(mName, idx) in monthNames" :key="idx" :value="idx">
                  {{ mName }}
                </option>
              </select>

              <select v-model="year"
                class="bg-transparent font-bold text-sm text-content focus:outline-none cursor-pointer hover:text-primary-500 py-0.5">
                <option v-for="yNum in availableYears" :key="yNum" :value="yNum">
                  {{ yNum }}
                </option>
              </select>
            </div>

            <button type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-content hover:bg-surface-muted transition-colors"
              @click="nextMonth">
              <AppIcon name="solar:alt-arrow-right-linear" :size="16" />
            </button>
          </div>

          <!-- Días de la semana -->
          <div
            class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-content-subtle uppercase pb-1 border-b border-line/60">
            <div v-for="day in weekdays" :key="day" class="py-1">
              {{ day }}
            </div>
          </div>

          <!-- Cuadrícula de días -->
          <div class="grid grid-cols-7 gap-1 pt-2">
            <button v-for="cell in calendarDays" :key="cell.dateString" type="button"
              class="relative flex aspect-square items-center justify-center rounded-full text-xs font-medium transition-all duration-200"
              :class="[
                cell.currentMonth ? 'text-content' : 'text-content-subtle/40',
                cell.dateString === modelValue
                  ? 'bg-primary-500 text-white font-bold scale-105 shadow-sm shadow-primary-500/30'
                  : 'hover:bg-surface-muted',
              ]" @click="selectDay(cell.dateString)">
              <span>{{ cell.day }}</span>
              <span v-if="cell.isToday && cell.dateString !== modelValue"
                class="absolute bottom-1 h-1 w-1 rounded-full bg-primary-500" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  transform: scaleY(0.95) translateY(4px);
  opacity: 0;
}

/* Ocultar flechas por defecto en los select de la cabecera */
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
</style>
