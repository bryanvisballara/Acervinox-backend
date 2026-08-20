import mongoose from 'mongoose'

const quotePartSchema = new mongoose.Schema(
  {
    partId: String,
    name: String,
    qty: Number,
    unitPrice: Number,
    pricing: { type: String, enum: ['estandar', 'medida'], default: 'estandar' },
    unit: { type: String, default: 'm' },
    measure: { type: Number, default: 0 },
    steelType: String,
    gauge: String,
  },
  { _id: false },
)

const quoteItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    origin: { type: String, enum: ['nacional', 'importado'], default: 'nacional' },
    brand: { type: String, default: 'acervinox' },
    image: { type: String, default: '' },
    specs: { type: [String], default: [] },
    steelType: String,
    gauge: String,
    parts: { type: [quotePartSchema], default: [] },
    net: { type: Number, default: 0 },
    iva: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true },
)

const quotationSchema = new mongoose.Schema(
  {
    seq: { type: Number, required: true },
    number: { type: String, required: true, unique: true },
    clientName: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    clientDocType: {
      type: String,
      enum: ['nit', 'cc', 'ce', 'pasaporte', 'rut', ''],
      default: '',
    },
    clientDocNumber: { type: String, default: '' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientType: {
      type: String,
      enum: ['industria', 'gastronomico', 'sanitario', ''],
      default: '',
    },
    items: { type: [quoteItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    iva: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    funnelStage: {
      type: String,
      enum: ['cotizacion', 'negociacion', 'pedido', 'desistido'],
      default: 'cotizacion',
    },
    sentAt: { type: Date },
    notes: { type: String, default: '' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true },
)

export const Quotation = mongoose.model('Quotation', quotationSchema)
