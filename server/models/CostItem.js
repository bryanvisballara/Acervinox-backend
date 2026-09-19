import mongoose from 'mongoose'
import { COST_CATEGORIES, COST_UNITS } from '../data/costItems.js'

const categories = COST_CATEGORIES.map((c) => c.id)

const costItemSchema = new mongoose.Schema(
  {
    category: { type: String, enum: categories, required: true },
    name: { type: String, required: true, trim: true },
    variant: { type: String, default: '', trim: true },
    unit: { type: String, enum: COST_UNITS, default: 'und' },
    price: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', trim: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true },
)

costItemSchema.index({ category: 1, sort: 1, name: 1 })
costItemSchema.index({ name: 'text', variant: 'text' })

export const CostItem = mongoose.model('CostItem', costItemSchema)
