<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import AppIcon from './AppIcon.vue'

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
    },
)

const emit = defineEmits<{
    'update:modelValue': [boolean]
    confirm: []
    cancel: []
    close: []
}>()

const dialog = ref<HTMLDialogElement>()

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
    },
)

function close() {
    if (props.persistent) return

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

    emit('update:modelValue', false)
    emit('close')
}

function onBackdrop(event: MouseEvent) {
    if (!props.closeOnBackdrop || props.persistent) return

    if (event.target === dialog.value) {
        close()
    }
}
</script>

<template>
    <dialog ref="dialog"
        class="w-full max-w-md rounded-card border border-line bg-surface-raised p-0 text-content shadow-raised backdrop:bg-secondary-950/50 backdrop:backdrop-blur-sm"
        @cancel="onCancel" @click="onBackdrop">
        <div class="p-6">

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