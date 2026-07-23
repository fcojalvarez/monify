<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import { useFamilyStore } from '@/stores/family'
import { useTransactionsStore } from '@/stores/transactions'
import { useRecurringTransactionsStore } from '@/stores/recurring-transactions'
import { useI18n, getIntlLocale } from '@/i18n'
import { todayISO, formatDateWithMonthName } from '@/utils/format'
import { parseVoiceCommand } from '@/utils/voiceParser'
import { parseWithAI } from '@/services/ai.service'
import { customOccurrenceOnOrAfter, normalizeMonths } from '@/utils/recurring'
import { useCategoryOptions, useMemberOptions } from '@/composables/useEntityOptions'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import CustomMonthsField from '@/components/transactions/CustomMonthsField.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const categoriesStore = useCategoriesStore()
const familyStore = useFamilyStore()
const transactionsStore = useTransactionsStore()
const recurringTransactionsStore = useRecurringTransactionsStore()
const { t } = useI18n()

const isSupported = ref(
  typeof window !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition)
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recognition = ref<any>(null)
const isListening = ref(false)
const transcript = ref('')
const hasParsed = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const unrecognized = ref<('amount' | 'category' | 'familyMember')[]>([])

const usedAI = ref(false)
const isAIProcessing = ref(false)
const geminiApiKey = ref(localStorage.getItem('monify_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '')
const geminiApiKeyInput = ref(localStorage.getItem('monify_gemini_api_key') || '')
const showAISettings = ref(false)

function saveApiKey() {
  const trimmed = geminiApiKeyInput.value.trim()
  localStorage.setItem('monify_gemini_api_key', trimmed)
  geminiApiKey.value = trimmed || import.meta.env.VITE_GEMINI_API_KEY || ''
  showAISettings.value = false
}

function clearApiKey() {
  localStorage.removeItem('monify_gemini_api_key')
  geminiApiKeyInput.value = ''
  geminiApiKey.value = import.meta.env.VITE_GEMINI_API_KEY || ''
}

const form = reactive({
  kind: 'expense' as 'expense' | 'income',
  amount: '',
  categoryId: '',
  familyMemberId: '',
  occurredOn: todayISO(),
  note: '',
  isCash: false,
  isRecurring: false,
  frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
  endOn: '',
  months: [] as number[],
  dayOfMonth: '1',
})

const categoryOptions = useCategoryOptions(() => form.kind)
const memberOptions = useMemberOptions()

// Ensure we have family members and categories loaded
onMounted(async () => {
  await Promise.all([
    categoriesStore.fetchAll(),
    familyStore.fetchAll()
  ])
})

function initSpeechRecognition() {
  if (!isSupported.value) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  recognition.value = new SpeechRecognition()

  const locale = getIntlLocale() || 'es'
  recognition.value.lang = locale.startsWith('en') ? 'en-US' : 'es-ES'
  recognition.value.continuous = false
  recognition.value.interimResults = false

  recognition.value.onstart = () => {
    isListening.value = true
    errorMsg.value = ''
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.value.onresult = (event: any) => {
    const resultText = event.results[0][0].transcript
    transcript.value = resultText
    processTranscript(resultText)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.value.onerror = (event: any) => {
    console.error('Speech recognition error', event)
    isListening.value = false
    if (event.error === 'not-allowed') {
      errorMsg.value = 'Permiso denegado para el uso del micrófono.'
    } else {
      errorMsg.value = 'Error en el reconocimiento de voz. Inténtalo de nuevo.'
    }
  }

  recognition.value.onend = () => {
    isListening.value = false
  }
}

function startListening() {
  if (!recognition.value) {
    initSpeechRecognition()
  }

  if (recognition.value && !isListening.value) {
    try {
      recognition.value.start()
    } catch (e) {
      console.error(e)
    }
  }
}

function stopListening() {
  if (recognition.value && isListening.value) {
    recognition.value.stop()
  }
}

async function processTranscript(text: string) {
  if (!text.trim()) return

  isAIProcessing.value = true
  usedAI.value = false
  errorMsg.value = ''

  try {
    const { parsed, usedAI: aiSuccess } = await parseWithAI(
      text,
      categoriesStore.items,
      familyStore.items,
      familyStore.self?.id || '',
      geminiApiKey.value
    )

    // Fusionar de forma inteligente si ya se había analizado previamente
    if (hasParsed.value) {
      form.kind = parsed.kind

      if (parsed.amount !== null && !parsed.unrecognizedFields.includes('amount')) {
        form.amount = String(parsed.amount)
      }

      if (parsed.categoryId && !parsed.unrecognizedFields.includes('category')) {
        form.categoryId = parsed.categoryId
      }

      if (parsed.familyMemberId && !parsed.unrecognizedFields.includes('familyMember')) {
        form.familyMemberId = parsed.familyMemberId
      }

      if (parsed.occurredOn !== todayISO()) {
        form.occurredOn = parsed.occurredOn
      }

      if (parsed.note) {
        form.note = parsed.note
      }

      if (parsed.isCash) {
        form.isCash = true
      }

      if (parsed.isRecurring) {
        form.isRecurring = true
        form.frequency = parsed.frequency
        form.months = parsed.months
        form.dayOfMonth = String(parsed.dayOfMonth)
      }

      if (parsed.endOn) {
        form.endOn = parsed.endOn
      }
    } else {
      form.kind = parsed.kind
      form.amount = parsed.amount !== null ? String(parsed.amount) : ''
      form.categoryId = parsed.categoryId
      form.familyMemberId = parsed.familyMemberId
      form.occurredOn = parsed.occurredOn
      form.note = parsed.note
      form.isCash = parsed.isCash
      form.isRecurring = parsed.isRecurring
      form.frequency = parsed.frequency
      form.months = parsed.months
      form.dayOfMonth = String(parsed.dayOfMonth)
      form.endOn = parsed.endOn || ''
    }

    // Forzar sincronización de la fecha (occurredOn) con el día de recurrencia si es mensual o personalizado.
    // Solo si el usuario no especificó otra fecha (es decir, es la fecha de hoy por defecto)
    if (form.isRecurring && (form.frequency === 'monthly' || form.frequency === 'custom')) {
      const dayNum = Number(form.dayOfMonth)
      if (dayNum >= 1 && dayNum <= 31 && form.occurredOn === todayISO()) {
        const parts = form.occurredOn.split('-')
        if (parts.length === 3) {
          form.occurredOn = `${parts[0]}-${parts[1]}-${String(dayNum).padStart(2, '0')}`
        }
      }
    }

    // Filtrar unrecognized según lo que ya está seleccionado o completado en el formulario
    const newUnrecognized = [...parsed.unrecognizedFields]
    if (form.amount) {
      const idx = newUnrecognized.indexOf('amount')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }
    if (form.categoryId) {
      const idx = newUnrecognized.indexOf('category')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }
    if (form.familyMemberId) {
      const idx = newUnrecognized.indexOf('familyMember')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }

    unrecognized.value = newUnrecognized
    hasParsed.value = true
    usedAI.value = aiSuccess
  } catch (error) {
    console.error('[AI Processing error]', error)

    // Mostramos el mensaje detallado de error para que el usuario sepa qué pasa
    const apiError = error instanceof Error ? error.message : String(error)
    errorMsg.value = `Error en el análisis de IA: ${apiError}. Usando procesador local alternativo.`

    // Fallback logic
    const parsed = parseVoiceCommand(
      text,
      categoriesStore.items,
      familyStore.items,
      familyStore.self?.id
    )

    if (hasParsed.value) {
      form.kind = parsed.kind

      if (parsed.amount !== null && !parsed.unrecognizedFields.includes('amount')) {
        form.amount = String(parsed.amount)
      }

      if (parsed.categoryId && !parsed.unrecognizedFields.includes('category')) {
        form.categoryId = parsed.categoryId
      }

      if (parsed.familyMemberId && !parsed.unrecognizedFields.includes('familyMember')) {
        form.familyMemberId = parsed.familyMemberId
      }

      if (parsed.occurredOn !== todayISO()) {
        form.occurredOn = parsed.occurredOn
      }

      if (parsed.note) {
        form.note = parsed.note
      }

      if (parsed.isCash) {
        form.isCash = true
      }

      if (parsed.isRecurring) {
        form.isRecurring = true
        form.frequency = parsed.frequency
        form.months = parsed.months
        form.dayOfMonth = String(parsed.dayOfMonth)
      }

      if (parsed.endOn) {
        form.endOn = parsed.endOn
      }
    } else {
      form.kind = parsed.kind
      form.amount = parsed.amount !== null ? String(parsed.amount) : ''
      form.categoryId = parsed.categoryId
      form.familyMemberId = parsed.familyMemberId
      form.occurredOn = parsed.occurredOn
      form.note = parsed.note
      form.isCash = parsed.isCash
      form.isRecurring = parsed.isRecurring
      form.frequency = parsed.frequency
      form.months = parsed.months
      form.dayOfMonth = String(parsed.dayOfMonth)
      form.endOn = parsed.endOn || ''
    }

    const newUnrecognized = [...parsed.unrecognizedFields]
    if (form.amount) {
      const idx = newUnrecognized.indexOf('amount')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }
    if (form.categoryId) {
      const idx = newUnrecognized.indexOf('category')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }
    if (form.familyMemberId) {
      const idx = newUnrecognized.indexOf('familyMember')
      if (idx !== -1) newUnrecognized.splice(idx, 1)
    }

    unrecognized.value = newUnrecognized
    hasParsed.value = true
    usedAI.value = false
  } finally {
    isAIProcessing.value = false
  }
}

function handleReprocess() {
  try {
    processTranscript(transcript.value)
  } catch (error) {
    console.log(error);
  }
}

function handleClose() {
  stopListening()
  emit('update:modelValue', false)
}

async function handleConfirm() {
  errorMsg.value = ''

  const amountNum = parseFloat(form.amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    errorMsg.value = t('form.errorAmount')
    return
  }

  if (!form.categoryId) {
    errorMsg.value = t('form.errorCategory')
    return
  }

  if (form.isCash) {
    const selectedMember = familyStore.items.find((m) => m.id === form.familyMemberId)
    const currentBalance = selectedMember?.cash_balance ?? 0
    if (form.kind === 'expense' && currentBalance - amountNum < 0) {
      errorMsg.value = t('transactionForm.insufficientWallet', { name: selectedMember?.name ?? t('transactionForm.thisPerson') })
      return
    }
  }

  saving.value = true

  try {
    const baseData = {
      kind: form.kind,
      amount: amountNum,
      category_id: form.categoryId,
      family_member_id: form.familyMemberId || familyStore.self?.id || '',
      note: form.note.trim() || null,
      payment_method: (form.isCash ? 'cash' : 'bank') as 'cash' | 'bank',
    }

    const gross = form.kind === 'income' ? amountNum : null

    if (form.isRecurring) {
      const day = Number(form.dayOfMonth)
      const scheduleData = form.frequency === 'custom'
        ? {
          frequency: 'custom' as const,
          start_on: form.occurredOn,
          next_execution: customOccurrenceOnOrAfter(form.occurredOn, form.months, day),
          months: normalizeMonths(form.months),
          day_of_month: day,
        }
        : {
          frequency: form.frequency,
          start_on: form.occurredOn,
          next_execution: form.occurredOn,
        }

      await recurringTransactionsStore.create({
        ...baseData,
        gross,
        end_on: form.endOn || null,
        ...scheduleData,
      })

      await recurringTransactionsStore.sync()
    } else {
      await transactionsStore.create({
        transaction: {
          ...baseData,
          occurred_on: form.occurredOn,
        },
        gross: gross ?? 0,
      })
    }

    emit('saved')
    handleClose()
  } catch (err) {
    console.error(err)
    errorMsg.value = err instanceof Error ? err.message : t('form.genericSaveError')
  } finally {
    saving.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    transcript.value = ''
    hasParsed.value = false
    errorMsg.value = ''
    unrecognized.value = []
    usedAI.value = false
    isAIProcessing.value = false

    // Default form pre-population
    form.kind = 'expense'
    form.amount = ''
    form.categoryId = ''
    form.familyMemberId = familyStore.self?.id || familyStore.items[0]?.id || ''
    form.occurredOn = todayISO()
    form.note = ''
    form.isCash = false
    form.isRecurring = false
    form.frequency = 'monthly'
    form.endOn = ''
    form.months = []
    form.dayOfMonth = String(Number(todayISO().split('-')[2]) || 1)

    if (isSupported.value) {
      nextTick(() => {
        startListening()
      })
    }
  } else {
    stopListening()
  }
})
</script>

<template>
  <BaseDialog :model-value="modelValue" :title="t('voice.title')" :show-close="true" @close="handleClose">
    <div class="space-y-6">
      <!-- Listening State -->
      <div v-if="isListening"
        class="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fade-in">
        <div class="relative flex items-center justify-center">
          <!-- Outer pulsing ring -->
          <span class="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-violet-400/30 opacity-75"></span>
          <!-- Inner pulsing ring -->
          <span class="absolute inline-flex h-16 w-16 animate-pulse rounded-full bg-violet-400/50"></span>
          <!-- Microphone Button -->
          <button type="button"
            class="relative flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg focus:outline-none"
            @click="stopListening">
            <AppIcon name="solar:microphone-bold" :size="28" />
          </button>
        </div>

        <div>
          <h3 class="font-bold text-violet-600 dark:text-violet-400 animate-pulse">
            {{ t('voice.listening') }}
          </h3>
          <p class="mt-2 text-sm text-content-muted max-w-xs mx-auto">
            {{ t('voice.speakPrompt') }}
          </p>
        </div>

        <BaseButton variant="secondary" size="sm" @click="stopListening">
          {{ t('voice.stop') }}
        </BaseButton>
      </div>

      <!-- Result / Editing State -->
      <div v-else class="space-y-4 animate-fade-in">
        <!-- Error Banner -->
        <div v-if="errorMsg"
          class="rounded-field bg-expense-light/50 border border-expense/30 p-3 text-sm text-expense font-medium">
          {{ errorMsg }}
        </div>

        <!-- Support Info & Fallback Input -->
        <div class="space-y-2">
          <p v-if="!isSupported" class="text-xs text-content-muted leading-relaxed">
            <AppIcon name="solar:danger-bold" :size="14" class="inline mr-1 text-warning" />
            {{ t('voice.notSupported') }}
          </p>

          <div class="flex gap-2">
            <input v-model="transcript" type="text" :placeholder="t('voice.fallbackPlaceholder')"
              class="h-11 flex-1 rounded-field border border-line bg-surface-muted px-4 text-sm text-content focus:border-primary-400 focus:outline-none focus:shadow-focus"
              @keyup.enter="handleReprocess" />
            <BaseButton variant="secondary" size="md" class="h-12" @click="handleReprocess" :loading="isAIProcessing">
              <AppIcon name="solar:play-bold" :size="16" />
              {{ t('voice.process') }}
            </BaseButton>
          </div>
        </div>

        <!-- Pulse Mic when we can try again -->
        <div v-if="isSupported && !isListening" class="flex justify-center py-1">
          <button type="button"
            class="flex items-center gap-2 rounded-pill bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 px-4 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 transition-colors"
            @click="startListening">
            <AppIcon name="solar:microphone-bold" :size="16" />
            <span>Volver a grabar voz</span>
          </button>
        </div>

        <!-- Processing State -->
        <div v-if="isAIProcessing" class="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-violet-600/30 border-t-violet-600"></div>
          <p class="text-sm font-semibold text-violet-600 dark:text-violet-400 animate-pulse">
            La IA está interpretando tu mensaje...
          </p>
        </div>

        <template v-else>
          <!-- Unrecognized Fields Warn Banners -->
          <div v-if="hasParsed && unrecognized.length > 0" class="space-y-1.5 animate-fade-in">
            <div v-if="unrecognized.includes('amount')"
              class="rounded-field bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 leading-snug">
              <AppIcon name="solar:info-circle-bold" :size="14" class="inline mr-1 text-amber-500" />
              No hemos podido detectar el importe en tu mensaje de voz. Por favor, introdúcelo manualmente.
            </div>
            <div v-if="unrecognized.includes('category')"
              class="rounded-field bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 leading-snug">
              <AppIcon name="solar:info-circle-bold" :size="14" class="inline mr-1 text-amber-500" />
              No se reconoció una categoría exacta. Hemos seleccionado una por defecto; puedes cambiarla si lo deseas.
            </div>
            <div v-if="unrecognized.includes('familyMember')"
              class="rounded-field bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 leading-snug">
              <AppIcon name="solar:info-circle-bold" :size="14" class="inline mr-1 text-amber-500" />
              No detectamos a qué miembro de la familia pertenece. Hemos seleccionado a ti por defecto; puedes cambiarlo.
            </div>
          </div>

          <!-- Parsed Transaction Fields -->
          <div v-if="hasParsed" class="rounded-card border border-line p-4 bg-surface/50 space-y-4">
            <div class="flex items-center justify-between border-b border-line pb-2">
              <h4 class="font-bold text-sm text-content-muted">
                {{ t('voice.summaryTitle') }}
              </h4>
              <span v-if="usedAI" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                <span>Procesado por IA</span>
                <AppIcon name="solar:stars-bold" :size="10" />
              </span>
              <span v-else class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-surface-muted text-content-muted">
                <span>Procesado Local</span>
              </span>
            </div>

            <div class="space-y-3">
              <SegmentedControl v-model="form.kind" :options="[
                { value: 'expense', label: t('form.expense') },
                { value: 'income', label: t('form.income') },
              ]" />

              <BaseSwitch v-model="form.isCash" :label="t('form.isCash')" />

              <div class="grid grid-cols-2 gap-3">
                <BaseInput v-model="form.amount" :label="t('form.amount')" type="number" placeholder="0.00" />
                <BaseInput v-model="form.occurredOn" :label="t('form.date')" type="date" />
              </div>

              <BaseSelect v-model="form.categoryId" :label="t('form.category')" :options="categoryOptions"
                :placeholder="t('form.selectCategory')" />

              <BaseSelect v-model="form.familyMemberId" :label="t('form.belongsTo')" :options="memberOptions"
                :placeholder="t('form.selectMember')" />

              <BaseInput v-model="form.note" :label="t('form.note')" icon="solar:pen-bold"
                :placeholder="t('form.notePlaceholder')">
                <template v-slot:label-slot>
                  <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
                </template>
              </BaseInput>

              <!-- Recurrence Config -->
              <BaseSwitch v-model="form.isRecurring" :label="t('transaction.repeatMovement')" />

              <div v-if="form.isRecurring" class="space-y-3 rounded-field border border-line p-3">
                <BaseSelect v-model="form.frequency" :label="t('transaction.frequency')" :options="[
                  { value: 'daily', label: t('recurringList.frequencies.daily') }, { value: 'weekly', label: t('recurringList.frequencies.weekly') },
                  { value: 'monthly', label: t('recurringList.frequencies.monthly') }, { value: 'yearly', label: t('recurringList.frequencies.yearly') },
                  { value: 'custom', label: t('recurringList.frequencies.custom') },
                ]" />

                <CustomMonthsField v-if="form.frequency === 'custom'" v-model:months="form.months"
                  v-model:day-of-month="form.dayOfMonth" :start-on="form.occurredOn" />

                <BaseInput v-model="form.endOn" :label="t('transaction.endDate')" type="date" icon="solar:calendar-bold">
                  <template v-slot:label-slot>
                    <span class="text-xs text-content-subtle">({{ t('common.optional') }})</span>
                  </template>
                </BaseInput>

                <p v-if="form.endOn" class="text-xs text-content-muted">
                  {{ t('transaction.endsOn', { date: formatDateWithMonthName(form.endOn) }) }}
                </p>
              </div>

            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <BaseButton variant="ghost" @click="handleClose">
              {{ t('voice.discard') }}
            </BaseButton>
            <BaseButton :loading="saving" :disabled="!hasParsed" @click="handleConfirm">
              {{ t('voice.confirm') }}
            </BaseButton>
          </div>
        </template>

        <!-- AI Settings Section -->
        <div class="border-t border-line pt-4 mt-4 text-xs">
          <button @click="showAISettings = !showAISettings" class="flex items-center gap-1.5 text-content-muted hover:text-primary transition-colors font-medium">
            <AppIcon :name="showAISettings ? 'solar:alt-arrow-up-bold' : 'solar:settings-bold'" :size="14" />
            <span>{{ showAISettings ? 'Ocultar ajustes de IA' : 'Ajustes de IA ✨' }}</span>
            <span v-if="geminiApiKey" class="text-emerald-500 font-bold ml-1 flex items-center gap-0.5">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Activa
            </span>
            <span v-else class="text-content-subtle ml-1">(Local)</span>
          </button>
          <div v-if="showAISettings" class="mt-3 p-3 bg-surface-muted rounded-field border border-line space-y-2.5 animate-fade-in">
            <p class="text-content-muted leading-relaxed">
              Monify puede usar <strong>Google Gemini 2.5 Flash</strong> (IA) para interpretar de forma inteligente tus comandos de voz, entendiendo expresiones más naturales y complejas.
            </p>
            <div class="space-y-1">
              <label class="block text-[11px] font-semibold text-content-muted">API Key de Google Gemini</label>
              <div class="flex gap-2">
                <input v-model="geminiApiKeyInput" type="password" placeholder="AIzaSy..." class="h-9 flex-1 rounded-field border border-line bg-surface px-3 text-xs text-content focus:border-primary-400 focus:outline-none" />
                <BaseButton variant="primary" size="sm" class="h-9 px-3 text-xs" @click="saveApiKey">
                  Guardar
                </BaseButton>
                <BaseButton v-if="geminiApiKey" variant="secondary" size="sm" class="h-9 px-3 text-xs" @click="clearApiKey">
                  Limpiar
                </BaseButton>
              </div>
              <p class="text-[10px] text-content-subtle mt-1">
                Consigue una API Key gratuita en <a href="https://aistudio.google.com/" target="_blank" class="text-primary hover:underline font-medium">Google AI Studio</a>. La clave se guarda de forma segura en tu navegador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>
