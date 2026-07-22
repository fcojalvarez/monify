<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useI18n } from '@/i18n'

defineProps<{ title?: string; clearLabel?: string }>()
const emit = defineEmits<{ clear: [] }>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <BaseCard class="space-y-4 p-5">
    <div class="flex cursor-pointer items-center justify-between" @click="open = !open">
      <div class="flex items-center">
        <AppIcon :name="`solar:alt-arrow-${open ? 'up' : 'down'}-linear`" :size="18" class="mr-2 text-content-muted" />
        <span class="text-sm font-semibold text-content">
          {{ title ?? t('recurringList.filters') }}
        </span>
      </div>

      <button v-if="open" type="button"
        class="text-xs font-semibold text-primary-500 transition-colors hover:text-primary-600"
        @click.stop="emit('clear')">
        {{ clearLabel ?? t('recurringList.clearFilters') }}
      </button>
    </div>

    <section v-if="open" class="space-y-3">
      <slot />
    </section>
  </BaseCard>
</template>
