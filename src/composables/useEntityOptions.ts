import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { useCategoriesStore } from '@/stores/categories'
import { t } from '@/i18n'
import type { CategoryKind } from '@/types'

export interface SelectOption {
  value: string
  label: string
}

/** Configura la opción "todos/todas" que se antepone a una lista de opciones. */
export interface AllOption {
  include?: boolean
  value?: string
  label?: string
}

function withAll(base: SelectOption[], all: AllOption | undefined, defaultValue: string): SelectOption[] {
  if (!all?.include) return base
  return [{ value: all.value ?? defaultValue, label: all.label ?? t('common.all') }, ...base]
}

/** Opciones de miembros de la familia (value = id). */
export function useMemberOptions(all?: AllOption): ComputedRef<SelectOption[]> {
  const family = useFamilyStore()
  return computed(() =>
    withAll(
      family.items.map((member) => ({ value: member.id, label: member.name })),
      all,
      '',
    ),
  )
}

/** Opciones de tipo de flujo (gasto / ingreso). */
export function useKindOptions(all?: AllOption): ComputedRef<SelectOption[]> {
  return computed(() =>
    withAll(
      [
        { value: 'expense', label: t('form.expense') },
        { value: 'income', label: t('form.income') },
      ],
      all,
      'all',
    ),
  )
}

/**
 * Opciones de categoría, filtradas opcionalmente por tipo. Si `kind` es 'all' (o vacío)
 * no se filtra. `all` antepone una opción "todas".
 */
export function useCategoryOptions(
  kind: MaybeRefOrGetter<CategoryKind | 'all' | '' | undefined>,
  all?: AllOption,
): ComputedRef<SelectOption[]> {
  const categories = useCategoriesStore()
  return computed(() => {
    const currentKind = toValue(kind)
    const filtered =
      currentKind && currentKind !== 'all'
        ? categories.items.filter((category) => category.kind === currentKind)
        : categories.items
    return withAll(
      filtered.map((category) => ({ value: category.id, label: category.name })),
      all,
      '',
    )
  })
}
