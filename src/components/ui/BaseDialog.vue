<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import AppIcon from './AppIcon.vue'
import { useI18n } from '@/i18n'

const props = withDefaults(
    defineProps<{
        modelValue: boolean
        title?: string

        /**
         * Presets:
         * - default
         * - confirm
         * - danger
         */
        variant?: 'default' | 'confirm' | 'danger'

        confirmText?: string
        cancelText?: string

        showCancel?: boolean
        showClose?: boolean

        closeOnBackdrop?: boolean
        persistent?: boolean

        loading?: boolean
        hasChanges?: boolean
    }>(),
    {
        variant: 'default',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        showCancel: false,
        showClose: true,
        closeOnBackdrop: true,
        persistent: false,
        loading: false,
        hasChanges: false,
    },
)

const emit = defineEmits<{
    'update:modelValue': [boolean]
    confirm: []
    cancel: []
    close: []
}>()

const dialog = ref<HTMLDialogElement>()
const showConfirmDiscard = ref(false)
const { t } = useI18n()

watch(
    () => props.modelValue,
    (open) => {
        if (!dialog.value) return

        if (open && !dialog.value.open) {
            dialog.value.showModal()
        }

        if (!open && dialog.value.open) {
            dialog.value.close()
        }

        // Reset confirmation state upon open/close
        showConfirmDiscard.value = false
    },
)

function close() {
    if (props.persistent) return

    if (props.hasChanges) {
        showConfirmDiscard.value = true
        return
    }

    dialog.value?.close()
    emit('update:modelValue', false)
    emit('close')
}

function confirmForceClose() {
    showConfirmDiscard.value = false
    dialog.value?.close()
    emit('update:modelValue', false)
    emit('close')
}

function cancel() {
    dialog.value?.close()
    emit('update:modelValue', false)
    emit('cancel')
}

function confirm() {
    emit('confirm')
}

function onCancel(event: Event) {
    if (props.persistent) {
        event.preventDefault()
        return
    }

    if (props.hasChanges) {
        event.preventDefault()
        showConfirmDiscard.value = true
        return
    }

    emit('update:modelValue', false)
    emit('close')
}

function onBackdrop(event: MouseEvent) {
    if (!props.closeOnBackdrop || props.persistent) return

    if (event.target === dialog.value) {
        close()
    }
}

defineExpose({
    close,
    showConfirmDiscard,
})
</script>

<template>
    <dialog ref="dialog"
        class="relative w-full max-w-md rounded-card border border-line bg-surface-raised p-0 text-content shadow-raised backdrop:bg-secondary-950/50 backdrop:backdrop-blur-sm"
        @cancel="onCancel" @click="onBackdrop">
        <div class="p-6">
            <!-- Confirmación de cambios sin guardar -->
            <div v-if="showConfirmDiscard" class="absolute inset-0 z-50 flex flex-col justify-center bg-surface-raised p-6 rounded-card border border-line">
                <h3 class="text-lg font-bold text-expense flex items-center gap-2 mb-2">
                    <AppIcon name="solar:danger-bold" class="text-expense" :size="24" />
                    {{ t('common.unsavedChanges') }}
                </h3>
                <p class="text-sm text-content-muted mb-6 leading-relaxed">
                    {{ t('common.unsavedChangesMessage') }}
                </p>
                <div class="flex justify-end gap-3">
                    <BaseButton type="button" variant="ghost" @click="showConfirmDiscard = false">
                        {{ t('common.keepEditing') }}
                    </BaseButton>
                    <BaseButton type="button" variant="danger" @click="confirmForceClose">
                        {{ t('common.discard') }}
                    </BaseButton>
                </div>
            </div>

            <!-- Header -->

            <header v-if="title || showClose" class="mb-5 flex items-center justify-between">
                <h2 class="text-lg font-bold">
                    {{ title }}
                </h2>

                <button v-if="showClose" class="rounded-full p-1 text-content-muted hover:bg-surface-muted"
                    @click="close">
                    <AppIcon name="solar:close-circle-bold" :size="22" />
                </button>
            </header>

            <!-- Content -->

            <slot />

            <!-- Footer -->

            <footer v-if="variant !== 'default'" class="mt-6 flex justify-end gap-3">
                <BaseButton v-if="showCancel" variant="ghost" @click="cancel">
                    {{ cancelText }}
                </BaseButton>

                <BaseButton :variant="variant === 'danger' ? 'danger' : 'primary'" :loading="loading" @click="confirm">
                    {{ confirmText }}
                </BaseButton>
            </footer>

        </div>
    </dialog>
</template>

<style scoped>
/* Entrada suave del diálogo (el <dialog> nativo aparece de golpe por defecto). */
dialog[open] {
    animation: dialog-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

dialog[open]::backdrop {
    animation: backdrop-in 0.2s ease-out;
}

@keyframes dialog-in {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes backdrop-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {

    dialog[open],
    dialog[open]::backdrop {
        animation: none;
    }
}
</style>