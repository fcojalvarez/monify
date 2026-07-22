/** Geometría y helpers compartidos por las gráficas SVG del panel de análisis. */

export interface Point {
  x: number
  y: number
}

// Dimensiones del lienzo SVG (viewBox) y márgenes internos.
export const SVG_W = 500
export const SVG_H = 200
export const PAD_L = 50
export const PAD_R = 15
export const PAD_T = 20
export const PAD_B = 30
export const CHART_W = SVG_W - PAD_L - PAD_R
export const CHART_H = SVG_H - PAD_T - PAD_B

/** Redondea el máximo a un valor "bonito" para el eje Y (con un mínimo por defecto). */
export function niceMax(values: number[], floor = 100): number {
  const max = Math.max(...values, floor)
  const order = Math.pow(10, Math.floor(Math.log10(max)))
  const factor = order / 2
  return Math.ceil(max / factor) * factor
}

/** Construye el atributo `d` de una polilínea a partir de una lista de puntos. */
export function linePath(points: Point[]): string {
  return points
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}

/** Construye el atributo `d` de un área (polilínea cerrada contra la base del gráfico). */
export function areaPath(points: Point[]): string {
  if (points.length === 0) return ''
  const base = PAD_T + CHART_H
  return `${linePath(points)} L ${points[points.length - 1].x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`
}

/** Posición X del centro de un grupo de barras (gráfica de barras agrupadas). */
export function barGroupX(index: number, total: number): number {
  return PAD_L + (index + 0.5) * (CHART_W / total)
}
