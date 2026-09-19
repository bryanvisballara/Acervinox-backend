import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number, default: 1, min: 0 },
  },
  { _id: true },
)

const materialRequestSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    number: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    maintenance: { type: mongoose.Schema.Types.ObjectId, ref: 'Maintenance' },
    acta: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceActa' },
    forLabel: { type: String, default: '', trim: true },
    items: { type: [itemSchema], default: [] },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'seen', 'approved', 'delivered', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, default: '' },
    by: { type: String, default: '' },
  },
  { timestamps: true },
)

materialRequestSchema.index({ createdAt: -1 })
materialRequestSchema.index({ status: 1, createdAt: -1 })

export const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema)
