export type DashboardPeriod = 'day' | 'week' | 'month' | 'year'

const pad = (value: number) => String(value).padStart(2, '0')

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Devuelve los límites inclusivos del período actual para las consultas de movimientos. */
export function currentPeriodRange(period: DashboardPeriod, reference = new Date()) {
  const from = new Date(reference)
  const to = new Date(reference)

  switch (period) {
    case 'day':
      break
    case 'week': {
      const day = from.getDay()
      from.setDate(from.getDate() - (day === 0 ? 6 : day - 1))
      to.setTime(from.getTime())
      to.setDate(to.getDate() + 6)
      break
    }
    case 'month':
      from.setDate(1)
      to.setMonth(to.getMonth() + 1, 0)
      break
    case 'year':
      from.setMonth(0, 1)
      to.setMonth(11, 31)
      break
  }

  return { from: toISODate(from), to: toISODate(to) }
}

export const dashboardPeriodLabels: Record<DashboardPeriod, string> = {
  day: 'día',
  week: 'semana',
  month: 'mes',
  year: 'año',
}

export const dashboardMovementLabels: Record<DashboardPeriod, string> = {
  day: 'Movimientos de hoy',
  week: 'Movimientos de esta semana',
  month: 'Movimientos de este mes',
  year: 'Movimientos de este año',
}
