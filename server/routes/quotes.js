import { Router } from 'express'
import { Part } from '../models/Part.js'
import { CatalogProduct } from '../models/CatalogProduct.js'
import { Quotation } from '../models/Quotation.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { calcQuote } from '../lib/quoteMath.js'
import { quotationHtml } from '../lib/quotationHtml.js'
import { createOrderFromQuote, ensureOrderFromQuote, quoteOrderName } from '../lib/createOrderFromQuote.js'
import { Product } from '../models/Product.js'
import { FUNNEL_STAGES, FUNNEL_LOST } from '../config/stages.js'

export const quotesRouter = Router()
quotesRouter.use(requireAuth, requireRole('admin'))

quotesRouter.get('/parts', async (_req, res) => {
  const parts = await Part.find().sort({ category: 1, name: 1 })
  res.json({ parts })
})

quotesRouter.post('/parts', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const price = Number(req.body.price)
    if (!name || Number.isNaN(price)) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' })
    }
    const payload = {
      name,
      category: String(req.body.category || '').trim(),
      price,
      pricing: req.body.pricing === 'medida' ? 'medida' : 'estandar',
      unit: ['m', 'm2', 'und'].includes(req.body.unit) ? req.body.unit : 'm',
      steelType: String(req.body.steelType || '').trim(),
      gauge: String(req.body.gauge || '').trim(),
      notes: String(req.body.notes || '').trim(),
    }
    const part = await Part.create(payload)
    res.status(201).json({ part })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo crear la pieza' })
  }
})

quotesRouter.patch('/parts/:id', async (req, res) => {
  try {
    const part = await Part.findById(req.params.id)
    if (!part) return res.status(404).json({ error: 'Pieza no encontrada' })
    const name = String(req.body.name || '').trim()
    const price = Number(req.body.price)
    if (!name || Number.isNaN(price)) {
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' })
    }
    part.name = name
    part.category = String(req.body.category || '').trim()
    part.price = price
    part.pricing = req.body.pricing === 'medida' ? 'medida' : 'estandar'
    part.unit = ['m', 'm2', 'und'].includes(req.body.unit) ? req.body.unit : 'm'
    part.steelType = String(req.body.steelType || '').trim()
    part.gauge = String(req.body.gauge || '').trim()
    part.notes = String(req.body.notes || '').trim()
    await part.save()
    res.json({ part })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar la pieza' })
  }
})

quotesRouter.delete('/parts/:id', async (req, res) => {
  try {
    const part = await Part.findById(req.params.id)
    if (!part) return res.status(404).json({ error: 'Pieza no encontrada' })
    await part.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar la pieza' })
  }
})

quotesRouter.get('/catalog', async (req, res) => {
  const sort = { origin: -1, category: 1, name: 1 }
  const page = Math.max(0, Math.floor(Number(req.query.page) || 0))
  const limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 20)))
  if (page) {
    const total = await CatalogProduct.countDocuments()
    const pages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, pages)
    const products = await CatalogProduct.find()
      .sort(sort)
      .skip((safePage - 1) * limit)
      .limit(limit)
    return res.json({ products, total, page: safePage, pages, limit })
  }
  const products = await CatalogProduct.find().sort(sort)
  res.json({ products })
})

quotesRouter.post('/catalog', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' })
    const product = await CatalogProduct.create({
      name,
      origin: req.body.origin === 'importado' ? 'importado' : 'nacional',
      brand: String(req.body.brand || 'acervinox'),
      category: String(req.body.category || ''),
      price: Number(req.body.price) || 0,
      steelType: String(req.body.steelType || ''),
      gauge: String(req.body.gauge || ''),
      specs: Array.isArray(req.body.specs) ? req.body.specs : [],
      image: String(req.body.image || ''),
      parts: req.body.parts || [],
    })
    res.status(201).json({ product })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el producto estándar' })
  }
})

quotesRouter.patch('/catalog/:id', async (req, res) => {
  try {
    const product = await CatalogProduct.findById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' })
    product.name = name
    product.origin = req.body.origin === 'importado' ? 'importado' : 'nacional'
    product.brand = String(req.body.brand || 'acervinox')
    product.category = String(req.body.category || '')
    product.price = Number(req.body.price) || 0
    product.steelType = String(req.body.steelType || '')
    product.gauge = String(req.body.gauge || '')
    product.specs = Array.isArray(req.body.specs) ? req.body.specs : product.specs
    if (req.body.image !== undefined) product.image = String(req.body.image || '')
    product.parts = req.body.parts || product.parts
    await product.save()
    res.json({ product })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el producto' })
  }
})

quotesRouter.delete('/catalog/:id', async (req, res) => {
  try {
    const product = await CatalogProduct.findById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    await product.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar el producto' })
  }
})

quotesRouter.get('/quotations', async (req, res) => {
  const stage = String(req.query.stage || '')
  const type = String(req.query.type || '')
  const q = String(req.query.q || '').trim()
  const filter = {}
  const typeFilter = type ? { clientType: type } : {}
  if (stage) filter.funnelStage = stage
  else if (String(req.query.lost) !== '1') filter.funnelStage = { $ne: 'desistido' }
  if (type) filter.clientType = type
  if (q) {
    filter.$or = [
      { number: new RegExp(q, 'i') },
      { clientName: new RegExp(q, 'i') },
      { clientEmail: new RegExp(q, 'i') },
    ]
  }
  const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).limit(300)
  const counts = {}
  for (const s of [...FUNNEL_STAGES, FUNNEL_LOST]) {
    counts[s.id] = await Quotation.countDocuments({ funnelStage: s.id, ...typeFilter })
  }
  res.json({ quotations, counts, stages: FUNNEL_STAGES, lost: FUNNEL_LOST })
})

async function withOrder(quote) {
  const obj = quote.toObject()
  if (!obj.orderId) {
    obj.order = null
    return obj
  }
  const order = await Product.findById(obj.orderId).select('name tracking')
  obj.order = order ? { _id: String(order._id), name: order.name, tracking: order.tracking } : null
  return obj
}

async function syncQuoteOrder(quote, user) {
  if (!quote.clientId || !quoteOrderName(quote)) return null
  const product = await ensureOrderFromQuote(quote, user)
  quote.orderId = product._id
  await quote.save()
  return product
}

quotesRouter.get('/quotations/:id', async (req, res) => {
  const quote = await Quotation.findById(req.params.id)
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })
  res.json({ quotation: await withOrder(quote) })
})

quotesRouter.post('/quotations', async (req, res) => {
  try {
    const last = await Quotation.findOne().sort({ seq: -1 })
    const seq = (last?.seq || 230) + 1
    const priced = calcQuote(req.body.items || [])
    const quote = await Quotation.create({
      seq,
      number: `A${String(seq).padStart(5, '0')}`,
      clientName: String(req.body.clientName || '').trim(),
      clientEmail: String(req.body.clientEmail || '').trim().toLowerCase(),
      clientPhone: String(req.body.clientPhone || '').trim(),
      clientDocType: req.body.clientDocType || '',
      clientDocNumber: String(req.body.clientDocNumber || '').trim(),
      clientId: req.body.clientId || undefined,
      clientType: req.body.clientType || '',
      notes: String(req.body.notes || ''),
      orderName: String(req.body.orderName || '').trim(),
      funnelStage: 'cotizacion',
      ...priced,
    })
    try {
      await syncQuoteOrder(quote, req.user)
    } catch (err) {
      if (err.status && err.status < 500) {
        return res.status(err.status).json({ error: err.message, quotation: await withOrder(quote) })
      }
      throw err
    }
    res.status(201).json({ quotation: await withOrder(quote) })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'No se pudo guardar la cotización' })
  }
})

quotesRouter.patch('/quotations/:id/stage', async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })
    const stage = String(req.body.stage || '')
    const allowed = [...FUNNEL_STAGES.map((s) => s.id), FUNNEL_LOST.id]
    if (!allowed.includes(stage)) return res.status(400).json({ error: 'Etapa inválida' })

    let order = null
    if (stage === 'pedido' && req.body.createOrder) {
      if (quote.orderId) {
        order = { _id: quote.orderId }
      } else {
        const product = await createOrderFromQuote(quote, req.user)
        quote.orderId = product._id
        order = { _id: product._id, tracking: product.tracking }
      }
    }

    quote.funnelStage = stage
    await quote.save()
    res.json({ quotation: quote, order })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'No se pudo cambiar la etapa' })
  }
})

function publicOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

quotesRouter.put('/quotations/:id', async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })
    const priced = calcQuote(req.body.items || quote.items)
    quote.clientName = String(req.body.clientName ?? quote.clientName).trim()
    quote.clientEmail = String(req.body.clientEmail ?? quote.clientEmail).trim().toLowerCase()
    quote.clientPhone = String(req.body.clientPhone ?? quote.clientPhone).trim()
    quote.clientDocType = req.body.clientDocType ?? quote.clientDocType
    quote.clientDocNumber = String(req.body.clientDocNumber ?? quote.clientDocNumber).trim()
    if (req.body.clientId) quote.clientId = req.body.clientId
    quote.clientType = req.body.clientType ?? quote.clientType
    quote.notes = String(req.body.notes ?? quote.notes)
    if (req.body.orderName != null) quote.orderName = String(req.body.orderName).trim()
    quote.items = priced.items
    quote.subtotal = priced.subtotal
    quote.iva = priced.iva
    quote.total = priced.total
    await quote.save()
    try {
      await syncQuoteOrder(quote, req.user)
    } catch (err) {
      if (err.status && err.status < 500) {
        return res.status(err.status).json({ error: err.message, quotation: await withOrder(quote) })
      }
      throw err
    }
    res.json({ quotation: await withOrder(quote) })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'No se pudo actualizar la cotización' })
  }
})

quotesRouter.get('/quotations/:id/print', async (req, res) => {
  const quote = await Quotation.findById(req.params.id)
  if (!quote) return res.status(404).send('No encontrada')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(quotationHtml(quote.toObject(), publicOrigin(req)))
})

quotesRouter.post('/quotations/:id/send', async (req, res) => {
  const quote = await Quotation.findById(req.params.id)
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })
  if (!quote.clientEmail) {
    return res.status(400).json({ error: 'Esta cotización no tiene correo de cliente' })
  }
  const key = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER
  if (!key || !sender) {
    return res.status(409).json({
      error: 'Brevo aún no está conectado. Puedes generar el PDF mientras tanto.',
      needsBrevo: true,
    })
  }
  const html = quotationHtml(quote.toObject(), publicOrigin(req))
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'acervinox', email: sender },
      to: [{ email: quote.clientEmail, name: quote.clientName || quote.clientEmail }],
      subject: `Cotización ${quote.number} — acervinox`,
      htmlContent: html,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    console.error('Brevo', body)
    return res.status(502).json({ error: 'Brevo no pudo enviar el correo' })
  }
  quote.sentAt = new Date()
  if (quote.funnelStage === 'cotizacion') quote.funnelStage = 'cotizacion'
  await quote.save()
  res.json({ ok: true, quotation: quote })
})
