export function addMonths(date: Date, months: number) {
  const result = new Date(date)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  if (result.getDate() !== day) result.setDate(0)
  return result
}

export function occurrenceInMonth(
  scheduledAt: string | Date,
  intervalMonths: number,
  year: number,
  month: number,
) {
  const anchor = new Date(scheduledAt)
  if (Number.isNaN(anchor.getTime())) return null
  const step = Math.max(1, Number(intervalMonths) || 1)
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  if (anchor > monthEnd) return null

  const monthsDiff = (year - anchor.getFullYear()) * 12 + (month - anchor.getMonth())
  if (monthsDiff < 0) return null

  const k = Math.floor(monthsDiff / step)
  for (const n of [k, k - 1, k + 1]) {
    if (n < 0) continue
    const visit = addMonths(anchor, n * step)
    if (visit >= monthStart && visit <= monthEnd) return visit
  }
  return null
}

export function monthLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
