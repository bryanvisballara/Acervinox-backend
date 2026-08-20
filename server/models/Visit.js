import mongoose from 'mongoose'

const visitSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    maintenance: { type: mongoose.Schema.Types.ObjectId, ref: 'Maintenance' },
    title: { type: String, default: '' },
    notes: { type: String, default: '' },
    at: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'done', 'cancelled'], default: 'scheduled' },
    source: { type: String, enum: ['maintenance', 'manual', 'client'], default: 'manual' },
  },
  { timestamps: true },
)

visitSchema.index({ at: 1 })

export const Visit = mongoose.model('Visit', visitSchema)
