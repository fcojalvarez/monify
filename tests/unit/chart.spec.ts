import { describe, it, expect } from 'vitest'
import { niceMax, linePath, areaPath, barGroupX, PAD_L, CHART_W } from '@/utils/chart'

describe('chart utils', () => {
  it('niceMax redondea el máximo hacia arriba respetando el suelo por defecto', () => {
    expect(niceMax([0, 0])).toBe(100) // suelo mínimo
    expect(niceMax([120])).toBe(150) // order 100, factor 50 → ceil(120/50)*50
    expect(niceMax([4300])).toBe(4500)
  })

  it('linePath construye la polilínea con M/L y un decimal', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M 0.0 0.0 L 10.0 5.0')
    expect(linePath([])).toBe('')
  })

  it('areaPath cierra la polilínea contra la base del gráfico', () => {
    const path = areaPath([{ x: 0, y: 0 }, { x: 10, y: 5 }])
    expect(path.startsWith('M 0.0 0.0 L 10.0 5.0')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(areaPath([])).toBe('')
  })

  it('barGroupX centra el grupo de barras', () => {
    expect(barGroupX(0, 4)).toBeCloseTo(PAD_L + 0.5 * (CHART_W / 4))
    expect(barGroupX(3, 4)).toBeCloseTo(PAD_L + 3.5 * (CHART_W / 4))
  })
})
