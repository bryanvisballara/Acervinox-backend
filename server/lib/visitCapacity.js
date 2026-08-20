import { Visit } from '../models/Visit.js'

export const MAX_VISITS_PER_DAY = 3

export function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayBounds(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export async function visitsOnDay(date) {
  const { start, end } = dayBounds(date)
  return Visit.countDocuments({
    at: { $gte: start, $lt: end },
    status: { $ne: 'cancelled' },
  })
}

export async function assertVisitCapacity(date) {
  const count = await visitsOnDay(date)
  if (count >= MAX_VISITS_PER_DAY) {
    const err = new Error('Ese día ya no tiene cupos de visita. Elige otra fecha.')
    err.status = 409
    throw err
  }
}

export async function busyDayKeys(from, to) {
  const visits = await Visit.find({
    at: { $gte: from, $lte: to },
    status: { $ne: 'cancelled' },
  }).select('at')
  const map = new Map()
  for (const visit of visits) {
    const key = dayKey(visit.at)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].filter(([, n]) => n >= MAX_VISITS_PER_DAY).map(([key]) => key)
}
