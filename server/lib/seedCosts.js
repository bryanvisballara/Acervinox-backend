import { CostItem } from '../models/CostItem.js'
import { DEFAULT_COST_ITEMS } from '../data/costItems.js'

function keyOf(item) {
  return `${item.category}|${item.name}|${item.variant || ''}`
}

export async function seedCostItems() {
  const count = await CostItem.countDocuments()
  if (count === 0) {
    await CostItem.insertMany(DEFAULT_COST_ITEMS.map((item, sort) => ({ ...item, sort })))
    console.log(`Lista de costos cargada: ${DEFAULT_COST_ITEMS.length} ítems`)
    return
  }

  const existing = await CostItem.find({}, 'category name variant').lean()
  const have = new Set(existing.map(keyOf))
  const missing = DEFAULT_COST_ITEMS.filter((item) => !have.has(keyOf(item)))
  if (!missing.length) return
  const last = await CostItem.findOne().sort({ sort: -1 })
  await CostItem.insertMany(missing.map((item, i) => ({ ...item, sort: (last?.sort || 0) + 1 + i })))
  console.log(`Costos nuevos: ${missing.length} ítems`)
}
