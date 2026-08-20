import mongoose from 'mongoose'

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['industria', 'gastronomico', 'sanitario'],
      required: true,
    },
    docType: {
      type: String,
      enum: ['nit', 'cc', 'ce', 'pasaporte', 'rut'],
      default: undefined,
    },
    docNumber: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

clientSchema.index({ name: 'text', email: 'text' })

export const Client = mongoose.model('Client', clientSchema)
