import mongoose from 'mongoose'

const catalogPartSchema = new mongoose.Schema(
  {
    part: { type: mongoose.Schema.Types.ObjectId, ref: 'Part' },
    name: String,
    qty: { type: Number, default: 1 },
    unitPrice: Number,
    pricing: { type: String, enum: ['estandar', 'medida'], default: 'estandar' },
    unit: { type: String, default: 'm' },
    measure: { type: Number, default: 0 },
  },
  { _id: false },
)

const catalogProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    origin: { type: String, enum: ['nacional', 'importado'], default: 'nacional' },
    brand: { type: String, default: 'acervinox' },
    steelType: { type: String, default: '' },
    gauge: { type: String, default: '' },
    specs: { type: [String], default: [] },
    image: { type: String, default: '' },
    parts: { type: [catalogPartSchema], default: [] },
  },
  { timestamps: true },
)

export const CatalogProduct = mongoose.model('CatalogProduct', catalogProductSchema)
