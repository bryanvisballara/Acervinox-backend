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
    description: { type: String, default: '' },
    specs: { type: [String], default: [] },
    steelType: String,
    gauge: String,
    kind: { type: String, enum: ['catalog', 'medida'], default: 'catalog' },
    cutPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'CutPlan' },
    jobCostId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobCost' },
    sheetsUsed: { type: Number, default: 0 },
    costTotal: { type: Number, default: 0 },
    priceChoice: { type: String, enum: ['total', 'sale50', 'resale70', 'custom'], default: 'sale50' },
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
    orderName: { type: String, default: '', trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true },
)

export const Quotation = mongoose.model('Quotation', quotationSchema)
