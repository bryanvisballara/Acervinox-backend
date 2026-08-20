import { Router } from 'express'
import { CatalogProduct } from '../models/CatalogProduct.js'
import { Product } from '../models/Product.js'
import { Client } from '../models/Client.js'
import { Maintenance } from '../models/Maintenance.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { LAST_STAGE_INDEX, STAGES, stageByIndex } from '../config/stages.js'
import { addPayment, ledger, money, PAY_METHODS } from '../lib/accounting.js'
import { notifyProductAudience } from '../lib/push.js'

export const productsRouter = Router()
productsRouter.use(requireAuth, requireRole('admin', 'workshop'))

function nextTracking() {
  const n = Date.now().toString().slice(-8)
  return `AX-${n}`
}

function serialize(product, role) {
  const obj = product.toObject({ virtuals: true })
  const stage = stageByIndex(obj.stageIndex)
  const { payments, totalAmount, ...rest } = obj
  const out = {
    ...rest,
    id: obj._id,
    stage,
    client: obj.client,
  }
  if (role !== 'workshop') {
    out.totalAmount = totalAmount
    out.payments = payments
    out.accounting = ledger(obj)
  }
  return out
}

productsRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const stage = req.query.stage
    const status = String(req.query.status || '').trim()
    const client = String(req.query.client || '').trim()
    const filter = {}
    if (stage !== undefined && stage !== '') filter.stageIndex = Number(stage)
    if (status) filter.status = status
    if (client) filter.client = client
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { tracking: new RegExp(q, 'i') },
        { steelType: new RegExp(q, 'i') },
      ]
    }
    const products = await Product.find(filter)
      .populate('client')
      .sort({ createdAt: -1 })
      .limit(300)
    res.json({ products: products.map((p) => serialize(p, req.user.role)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar los pedidos' })
  }
})

productsRouter.post('/', requireRole('admin'), async (req, res) => {
  try {
    const clientId = String(req.body.clientId || '').trim()
    const technicianNotes = String(req.body.technicianNotes || '').trim()
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds.map(String)
      : []
    if (!clientId) return res.status(400).json({ error: 'Selecciona un cliente' })
    if (!productIds.length) {
      return res.status(400).json({ error: 'Selecciona al menos un producto del catálogo' })
    }
    const client = await Client.findById(clientId)
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })

    const catalog = await CatalogProduct.find({ _id: { $in: productIds } })
    if (!catalog.length) {
      return res.status(400).json({
        error: 'No se encontraron los productos seleccionados. Créalos en Productos.',
      })
    }
    const byId = new Map(catalog.map((p) => [String(p._id), p]))
    const items = productIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => ({
        catalogProduct: p._id,
        name: p.name,
        origin: p.origin,
        brand: p.brand,
        steelType: p.steelType || '',
        gauge: p.gauge || '',
        image: p.image || '',
        specs: p.specs || [],
        qty: 1,
      }))

    const stage = STAGES[0]
    const name = items.map((item) => item.name).join(' + ')
    const product = await Product.create({
      tracking: nextTracking(),
      name,
      steelType: items[0]?.steelType || '',
      gauge: items[0]?.gauge || '',
      client: client._id,
      items,
      technicianNotes,
      stageIndex: 0,
      status: 'in_progress',
      events: [
        {
          stageIndex: 0,
          stageName: stage.name,
          note: technicianNotes
            ? `Pedido creado. Observaciones para taller: ${technicianNotes}`
            : 'Pedido creado. Entra a etapa 1.',
          by: req.user.name || req.user.email,
          at: new Date(),
        },
      ],
    })
    const populated = await product.populate('client')
    res.status(201).json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo crear el pedido' })
  }
})

productsRouter.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    const maintenances = await Maintenance.find({ product: product._id }).sort({ scheduledAt: 1 })
    res.json({ product: serialize(product, req.user.role), maintenances })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el producto' })
  }
})

productsRouter.patch('/:id/report', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    const stageIndex = Number(req.body.stageIndex ?? product.stageIndex)
    if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > product.stageIndex) {
      return res.status(400).json({ error: 'Solo puedes documentar etapas ya alcanzadas' })
    }
    const photos = Array.isArray(req.body.photos) ? req.body.photos.map(String) : null
    if (photos && photos.length > 10) {
      return res.status(400).json({ error: 'Máximo 10 fotos por etapa' })
    }
    if (!Array.isArray(product.stageReports)) product.stageReports = []
    let report = product.stageReports.find((r) => r.stageIndex === stageIndex)
    if (!report) {
      product.stageReports.push({
        stageIndex,
        observations: '',
        photos: [],
        updatedAt: new Date(),
        by: '',
      })
      report = product.stageReports[product.stageReports.length - 1]
    }
    if (req.body.observations !== undefined) {
      report.observations = String(req.body.observations || '').slice(0, 4000)
    }
    if (photos) report.photos = photos
    report.updatedAt = new Date()
    report.by = req.user.name || req.user.email || ''
    product.markModified('stageReports')
    await product.save()
    const populated = await product.populate('client')
    res.json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el avance para el cliente' })
  }
})

productsRouter.post('/:id/transition', async (req, res) => {
  try {
    const dir = req.body.direction === 'back' ? -1 : 1
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

    const nextIndex = product.stageIndex + dir
    if (nextIndex < 0 || nextIndex > LAST_STAGE_INDEX) {
      return res.status(400).json({ error: 'No hay más etapas en esa dirección' })
    }

    if (dir === 1 && nextIndex === LAST_STAGE_INDEX) {
      const months = Number(req.body.intervalMonths)
      if (!months || months < 1) {
        return res.status(400).json({
          error: 'Indica en cuántos meses se agenda el mantenimiento periódico',
          needsMaintenance: true,
        })
      }
      const scheduledAt = new Date()
      scheduledAt.setMonth(scheduledAt.getMonth() + months)
      await Maintenance.create({
        product: product._id,
        client: product.client._id || product.client,
        intervalMonths: months,
        scheduledAt,
        status: 'scheduled',
      })
      product.status = 'delivered'
      product.deliveredAt = new Date()
    }

    if (dir === -1 && product.status === 'delivered') {
      product.status = 'in_progress'
      product.deliveredAt = undefined
    }

    const stage = stageByIndex(nextIndex)
    product.stageIndex = nextIndex
    product.events.push({
      stageIndex: nextIndex,
      stageName: stage.name,
      note: dir === 1 ? 'Avance de etapa' : 'Retroceso de etapa',
      by: req.user.name || req.user.email,
      at: new Date(),
    })
    await product.save()
    const populated = await product.populate('client')
    notifyProductAudience(populated, {
      title: 'Actualización de pedido',
      body: `${populated.tracking}: ${stage.name}`,
      url: `/portal/guia/${populated.tracking}`,
    })
    res.json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cambiar la etapa' })
  }
})

productsRouter.patch('/:id/accounting', requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Pedido no encontrado' })
    if (req.body.totalAmount !== undefined) {
      const total = money(req.body.totalAmount)
      if (total < 0) return res.status(400).json({ error: 'El valor total no es válido' })
      product.totalAmount = total
    }
    await product.save()
    const populated = await product.populate('client')
    res.json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar la contabilidad' })
  }
})

productsRouter.post('/:id/payments', requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Pedido no encontrado' })
    const amount = money(req.body.amount)
    if (amount < 1) return res.status(400).json({ error: 'Indica un valor de pago' })
    addPayment(product, {
      amount,
      method: PAY_METHODS.includes(req.body.method) ? req.body.method : 'otro',
      source: 'admin',
      status: 'confirmed',
      note: req.body.note,
      by: req.user.name || req.user.email,
    })
    await product.save()
    const populated = await product.populate('client')
    notifyProductAudience(populated, {
      title: 'Pago registrado',
      body: `Se añadió un abono en ${populated.tracking}`,
      url: `/portal/guia/${populated.tracking}`,
    })
    res.json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo registrar el pago' })
  }
})

productsRouter.delete('/:id/payments/:payId', requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product) return res.status(404).json({ error: 'Pedido no encontrado' })
    const before = product.payments.length
    product.payments = product.payments.filter((p) => String(p._id) !== String(req.params.payId))
    if (product.payments.length === before) {
      return res.status(404).json({ error: 'Pago no encontrado' })
    }
    product.markModified('payments')
    await product.save()
    const populated = await product.populate('client')
    res.json({ product: serialize(populated, req.user.role) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo eliminar el pago' })
  }
})
