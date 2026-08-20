import mongoose from 'mongoose'

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    pricing: { type: String, enum: ['estandar', 'medida'], default: 'estandar' },
    unit: { type: String, enum: ['m', 'm2', 'und'], default: 'm' },
    steelType: { type: String, default: '', trim: true },
    gauge: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true },
)

export const Part = mongoose.model('Part', partSchema)
