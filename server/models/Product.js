import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema(
  {
    stageIndex: { type: Number, required: true },
    stageName: { type: String, required: true },
    note: { type: String, default: '' },
    by: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['anticipo', 'transferencia', 'efectivo', 'wompi', 'otro'],
      default: 'otro',
    },
    source: { type: String, enum: ['admin', 'app'], default: 'admin' },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'confirmed' },
    reference: { type: String, default: '' },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: String, default: '' },
  },
  { _id: true },
)

const orderItemSchema = new mongoose.Schema(
  {
    catalogProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogProduct' },
    name: { type: String, required: true },
    origin: { type: String, enum: ['nacional', 'importado'], default: 'nacional' },
    brand: { type: String, default: 'acervinox' },
    steelType: { type: String, default: '' },
    gauge: { type: String, default: '' },
    image: { type: String, default: '' },
    specs: { type: [String], default: [] },
    qty: { type: Number, default: 1 },
  },
  { _id: true },
)

const productSchema = new mongoose.Schema(
  {
    tracking: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    steelType: { type: String, default: '', trim: true },
    gauge: { type: String, default: '', trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    items: { type: [orderItemSchema], default: [] },
    technicianNotes: { type: String, default: '' },
    stageIndex: { type: Number, default: 0 },
    status: { type: String, enum: ['in_progress', 'delivered'], default: 'in_progress' },
    events: { type: [eventSchema], default: [] },
    stageReports: {
      type: [
        {
          stageIndex: { type: Number, required: true },
          observations: { type: String, default: '' },
          photos: { type: [String], default: [] },
          updatedAt: { type: Date, default: Date.now },
          by: { type: String, default: '' },
        },
      ],
      default: [],
    },
    deliveredAt: { type: Date },
    totalAmount: { type: Number, default: 0, min: 0 },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true },
)

productSchema.index({ 'payments.reference': 1 })

export const Product = mongoose.model('Product', productSchema)
