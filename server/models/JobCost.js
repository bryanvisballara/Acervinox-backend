import mongoose from 'mongoose'

const lineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'CostItem' },
    category: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    variant: { type: String, default: '' },
    unit: { type: String, default: 'und' },
    qty: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
)

const jobCostSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    number: { type: String, required: true, unique: true },
    name: { type: String, default: '', trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    quoteItemId: { type: mongoose.Schema.Types.ObjectId },
    lines: { type: [lineSchema], default: [] },
    notes: { type: String, default: '' },
    materialTotal: { type: Number, default: 0 },
    laborTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    sale50: { type: Number, default: 0 },
    resale70: { type: Number, default: 0 },
    by: { type: String, default: '' },
  },
  { timestamps: true },
)

jobCostSchema.index({ client: 1, updatedAt: -1 })
jobCostSchema.index({ product: 1, updatedAt: -1 })

export const JobCost = mongoose.model('JobCost', jobCostSchema)
