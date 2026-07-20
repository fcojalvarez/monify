import { beforeEach, describe, expect, it, vi } from 'vitest'

const { result, builder, getUser, from } = vi.hoisted(() => {
  const result = { value: { data: null as any, error: null as any } }
  const builder: any = {}
  for (const method of ['select', 'order', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result.value).then(resolve)
  const getUser = vi.fn()
  const from = vi.fn(() => builder)
  return { result, builder, getUser, from }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from, auth: { getUser } } }))

import { categoriesService } from '@/services/categories.service'
import { familyService } from '@/services/family.service'
import { profileService } from '@/services/profile.service'

const reset = () => {
  vi.clearAllMocks()
  result.value = { data: null, error: null }
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
}

describe('servicios de catálogos y perfil', () => {
  beforeEach(reset)

  it('lista categorías y propaga errores de la consulta', async () => {
    result.value = { data: [{ id: 'category-1', name: 'Comida' }], error: null }
    await expect(categoriesService.list()).resolves.toEqual(result.value.data)
    expect(from).toHaveBeenCalledWith('categories')
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true })

    result.value = { data: null, error: new Error('db') }
    await expect(categoriesService.list()).rejects.toThrow('db')
  })

  it('asigna el usuario autenticado al crear categoría o persona', async () => {
    result.value = { data: { id: 'created' }, error: null }
    await categoriesService.create({ name: 'Ocio', kind: 'expense', color: '#f00', icon: 'solar:tag-bold', monthly_limit: null } as any)
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'user-1', name: 'Ocio' }))

    await familyService.create({ name: 'Alex', color: '#0f0', avatar_icon: 'solar:user-bold', is_self: false } as any)
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'user-1', cash_balance: 0 }))
  })

  it('rechaza crear recursos sin sesión y protege saldos negativos', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    await expect(categoriesService.create({} as any)).rejects.toThrow('Usuario no autenticado')

    result.value = { data: { cash_balance: 10 }, error: null }
    await expect(familyService.changeCashBalance('member-1', -11)).rejects.toThrow('suficiente efectivo')
  })

  it('obtiene y actualiza el perfil del usuario actual', async () => {
    result.value = { data: { id: 'user-1', currency: 'EUR' }, error: null }
    await expect(profileService.getProfile()).resolves.toEqual(result.value.data)
    await expect(profileService.update({ currency: 'USD' } as any)).resolves.toEqual(result.value.data)
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1')
  })
})
