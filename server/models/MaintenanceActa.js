import mongoose from 'mongoose'

const actaSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    number: { type: String, required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    maintenance: { type: mongoose.Schema.Types.ObjectId, ref: 'Maintenance' },
    clientName: { type: String, default: '', trim: true },
    date: { type: Date, default: Date.now },
    description: { type: String, default: '', trim: true },
    technicianName: { type: String, default: '', trim: true },
    situationFound: { type: String, default: '' },
    worksPerformed: { type: String, default: '' },
    parts: { type: [String], default: [] },
    technicianNotes: { type: String, default: '' },
    clientNotes: { type: String, default: '' },
    serviceRating: { type: Number, min: 0, max: 5, default: 0 },
    photos: { type: [String], default: [] },
    clientSignature: { type: String, default: '' },
    by: { type: String, default: '' },
  },
  { timestamps: true },
)

actaSchema.index({ date: -1 })
actaSchema.index({ client: 1, date: -1 })

export const MaintenanceActa = mongoose.model('MaintenanceActa', actaSchema)
