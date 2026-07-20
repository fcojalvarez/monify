import { describe, expect, it } from 'vitest'
import { currentPeriodRange } from '@/utils/period'

describe('currentPeriodRange', () => {
  const reference = new Date(2026, 6, 15)

  it.each([
    ['day', { from: '2026-07-15', to: '2026-07-15' }],
    ['week', { from: '2026-07-13', to: '2026-07-19' }],
    ['month', { from: '2026-07-01', to: '2026-07-31' }],
    ['year', { from: '2026-01-01', to: '2026-12-31' }],
  ] as const)('calcula el rango de %s', (period, expected) => {
    expect(currentPeriodRange(period, reference)).toEqual(expected)
  })

  it('considera el domingo como el último día de la semana', () => {
    expect(currentPeriodRange('week', new Date(2026, 6, 19))).toEqual({
      from: '2026-07-13',
      to: '2026-07-19',
    })
  })
})
