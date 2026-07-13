<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
    defineProps<{
        modelValue: boolean
    }>(),
    {
        modelValue: false,
    },
)

const emit = defineEmits<{
    'update:modelValue': [boolean]
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
    dialog.value?.close()
    emit('update:modelValue', false)
}

function onCancel(event: Event) {
    event.preventDefault()
    close()
}

function onBackdrop(event: MouseEvent) {
    if (event.target === dialog.value) {
        close()
    }
}
</script>

<template>
    <dialog ref="dialog"
        class="m-0 h-full w-full max-w-none bg-transparent p-0 backdrop:bg-secondary-950/50 backdrop:backdrop-blur-sm"
        @cancel="onCancel" @click="onBackdrop">
        <div class="flex h-full items-end">
            <div class="w-full rounded-t-card bg-surface-raised shadow-raised">
                <slot />
            </div>
        </div>
    </dialog>
</template>