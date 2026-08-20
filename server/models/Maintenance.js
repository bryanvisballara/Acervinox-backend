import mongoose from 'mongoose'

const maintenanceSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    intervalMonths: { type: Number, required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'done', 'cancelled'], default: 'scheduled' },
    notes: { type: String, default: '' },
    followUp: {
      type: String,
      enum: ['none', 'contacted', 'visit', 'rescheduled'],
      default: 'none',
    },
    contactedAt: { type: Date },
  },
  { timestamps: true },
)

export const Maintenance = mongoose.model('Maintenance', maintenanceSchema)
