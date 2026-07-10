<script setup lang="ts">
import { ref } from 'vue'
import type { FamilyMember } from '@/types'
import { useFamilyStore } from '@/stores/family'
import FamilyForm from './FamilyForm.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const family = useFamilyStore()

type Mode = { view: 'list' } | { view: 'form'; member?: FamilyMember }
const mode = ref<Mode>({ view: 'list' })

async function onDelete(member: FamilyMember) {
  if (member.is_self) return
  if (!window.confirm(`¿Eliminar a "${member.name}"? Sus movimientos también se borrarán.`)) return
  await family.remove(member.id)
}
</script>

<template>
  <div v-if="mode.view === 'form'">
    <FamilyForm
      :member="mode.member"
      @saved="mode = { view: 'list' }"
      @cancel="mode = { view: 'list' }"
    />
  </div>

  <div v-else class="space-y-4">
    <ul class="space-y-1">
      <li
        v-for="member in family.items"
        :key="member.id"
        class="flex items-center gap-3 rounded-field p-2 hover:bg-surface-muted"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          :style="{ backgroundColor: member.color }"
        >
          <AppIcon :name="member.avatar_icon" :size="18" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-content">
            {{ member.name }}
            <span v-if="member.is_self" class="text-xs font-normal text-content-subtle">(tú)</span>
          </p>
        </div>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:bg-line"
          aria-label="Editar"
          @click="mode = { view: 'form', member }"
        >
          <AppIcon name="solar:pen-2-linear" :size="18" />
        </button>
        <button
          v-if="!member.is_self"
          class="flex h-8 w-8 items-center justify-center rounded-full text-expense hover:bg-expense-light"
          aria-label="Eliminar"
          @click="onDelete(member)"
        >
          <AppIcon name="solar:trash-bin-trash-linear" :size="18" />
        </button>
      </li>
    </ul>

    <BaseButton block variant="secondary" @click="mode = { view: 'form' }">
      <AppIcon name="solar:add-circle-bold" :size="20" />
      Añadir miembro
    </BaseButton>
  </div>
</template>
