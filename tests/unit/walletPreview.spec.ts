import { describe, expect, it } from 'vitest'
import { getVisibleWalletCount } from '@/utils/walletPreview'

describe('getVisibleWalletCount', () => {
  it('reserva espacio para el indicador +N de carteras restantes', () => {
    expect(getVisibleWalletCount(260, [112, 112, 112], 56)).toBe(1)
  })

  it('muestra todas las carteras cuando caben sin indicador', () => {
    expect(getVisibleWalletCount(352, [112, 112, 112], 56)).toBe(3)
  })

  it('muestra dos carteras cuando caben sin indicador', () => {
    expect(getVisibleWalletCount(232, [112, 112], 56)).toBe(2)
  })

  it('muestra cuatro carteras cuando caben junto al indicador +N', () => {
    expect(getVisibleWalletCount(536, Array(5).fill(112), 56)).toBe(4)
  })

  it('no muestra carteras si solo cabe el indicador de restantes', () => {
    expect(getVisibleWalletCount(100, [112, 112], 56)).toBe(0)
  })
})
