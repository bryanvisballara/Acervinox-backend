import mongoose from 'mongoose'

const pieceSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    qty: { type: Number, default: 1 },
    material: { type: String, default: '' },
    allowRotate: { type: Boolean, default: true },
  },
  { _id: false },
)

const stockSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    material: { type: String, default: '' },
  },
  { _id: false },
)

const cutPlanSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    number: { type: String, required: true, unique: true },
    name: { type: String, default: '', trim: true },
    materialName: { type: String, default: '', trim: true },
    kerf: { type: Number, default: 0, min: 0 },
    pieces: { type: [pieceSchema], default: [] },
    stocks: { type: [stockSchema], default: [] },
    sheetsUsed: { type: Number, default: 0 },
    utilization: { type: Number, default: 0 },
    scrap: { type: Number, default: 0 },
    designCount: { type: Number, default: 0 },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    quoteItemId: { type: mongoose.Schema.Types.ObjectId },
    by: { type: String, default: '' },
  },
  { timestamps: true },
)

cutPlanSchema.index({ name: 'text', materialName: 'text', number: 'text' })

export const CutPlan = mongoose.model('CutPlan', cutPlanSchema)
