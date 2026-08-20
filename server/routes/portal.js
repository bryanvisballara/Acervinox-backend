import { Router } from 'express'
import { Client } from '../models/Client.js'
import { Product } from '../models/Product.js'
import { Maintenance } from '../models/Maintenance.js'
import { Visit } from '../models/Visit.js'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { STAGES, stageByIndex } from '../config/stages.js'
import { assertVisitCapacity, busyDayKeys } from '../lib/visitCapacity.js'
import { addPayment, ledger, money } from '../lib/accounting.js'
import { checkoutUrl, payRedirect, wompiEnabled } from '../lib/wompi.js'

export const portalRouter = Router()
portalRouter.use(requireAuth, requireRole('admin', 'client'))

function publicProduct(product) {
  const obj = product.toObject({ virtuals: true })
  const stage = stageByIndex(obj.stageIndex)
  const reports = obj.stageReports || []
  const accounting = ledger(obj)
  return {
    _id: obj._id,
    tracking: obj.tracking,
    name: obj.name,
    steelType: obj.steelType,
    gauge: obj.gauge,
    items: obj.items || [],
    stageIndex: obj.stageIndex,
    status: obj.status,
    deliveredAt: obj.deliveredAt,
    stage,
    stages: STAGES,
    stageReports: reports,
    photos: reports.flatMap((report) =>
      (report.photos || []).map((src) => ({
        src,
        stageIndex: report.stageIndex,
        stageName: stageByIndex(report.stageIndex)?.name,
        observations: report.observations || '',
      })),
    ),
    events: [...(obj.events || [])]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .map((ev) => ({
        stageIndex: ev.stageIndex,
        stageName: ev.stageName,
        note: ev.note,
        at: ev.at,
        by: ev.by,
      })),
    client: obj.client
      ? {
          name: obj.client.name,
          email: obj.client.email,
          phone: obj.client.phone,
          type: obj.client.type,
        }
      : null,
    accounting,
    payEnabled: wompiEnabled(),
    updatedAt: obj.updatedAt,
  }
}

async function clientForUser(user) {
  const email = String(user.email || '').toLowerCase()
  if (!email) return null
  let client = await Client.findOne({ email })
  if (client) return client
  if (user.role === 'admin') return null
  client = await Client.create({
    name: user.name || email,
    email,
    phone: String(user.phone || '').trim() || '0000000000',
    type: 'industria',
  })
  return client
}

async function rememberTracking(user, tracking) {
  if (!user?._id || !tracking) return
  await User.updateOne({ _id: user._id }, { $addToSet: { savedTrackings: tracking } })
}

async function canSeeProduct(user, product) {
  if (!product) return false
  if (user.role === 'admin') return true
  const email = String(user.email || '').toLowerCase()
  if (email && String(product.client?.email || '').toLowerCase() === email) return true
  const owner = await User.findById(user._id).select('savedTrackings')
  return (owner?.savedTrackings || []).includes(product.tracking)
}

async function ordersForUser(user) {
  if (user.role === 'admin') {
    return Product.find({}).populate('client').sort({ updatedAt: -1 }).limit(100)
  }
  const email = String(user.email || '').toLowerCase()
  const [client, owner] = await Promise.all([
    Client.findOne({ email }),
    User.findById(user._id).select('savedTrackings'),
  ])
  const or = []
  if (client) or.push({ client: client._id })
  const saved = owner?.savedTrackings || []
  if (saved.length) or.push({ tracking: { $in: saved } })
  if (!or.length) return []
  return Product.find({ $or: or }).populate('client').sort({ updatedAt: -1 }).limit(100)
}

portalRouter.get('/orders', async (req, res) => {
  try {
    const products = await ordersForUser(req.user)
    res.json({ products: products.map(publicProduct) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar tus pedidos' })
  }
})

portalRouter.get('/orders/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product || !(await canSeeProduct(req.user, product))) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    await rememberTracking(req.user, product.tracking)
    res.json({ product: publicProduct(product) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el pedido' })
  }
})

portalRouter.get('/track/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim()
    if (!code) return res.status(400).json({ error: 'Escribe el número de guía' })
    const product = await Product.findOne({
      tracking: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    }).populate('client')
    if (!product) return res.status(404).json({ error: 'No encontramos esa guía' })
    await rememberTracking(req.user, product.tracking)
    const maintenances = await Maintenance.find({
      product: product._id,
      status: { $ne: 'cancelled' },
    }).sort({ scheduledAt: 1 })
    res.json({ product: publicProduct(product), maintenances })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo rastrear la guía' })
  }
})

portalRouter.post('/orders/:id/checkout', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('client')
    if (!product || !(await canSeeProduct(req.user, product))) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    if (!wompiEnabled()) {
      return res.status(409).json({ error: 'La pasarela de pagos no está configurada' })
    }
    const acc = ledger(product)
    if (!acc.totalAmount) {
      return res.status(400).json({ error: 'Este pedido aún no tiene un valor total definido' })
    }
    const amount = money(req.body.amount || acc.balance)
    if (amount < 1) return res.status(400).json({ error: 'Indica un valor para abonar' })
    if (amount > acc.balance) {
      return res.status(400).json({ error: 'El abono no puede ser mayor al saldo' })
    }
    const reference = `AXPAY-${product._id}-${Date.now()}`
    addPayment(product, {
      amount,
      method: 'wompi',
      source: 'app',
      status: 'pending',
      reference,
      note: 'Abono desde la app',
      by: req.user.email,
    })
    await product.save()
    const url = checkoutUrl({
      reference,
      amount,
      redirectUrl: payRedirect(req, product.tracking),
    })
    res.json({ url, reference, product: publicProduct(product) })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'No se pudo iniciar el pago' })
  }
})

portalRouter.get('/taller', async (req, res) => {
  try {
    const client = await clientForUser(req.user)
    const filter = req.user.role === 'admin' ? {} : client ? { client: client._id } : { client: null }
    if (filter.client === null) {
      return res.json({ products: [], maintenances: [], visits: [], busyDays: [] })
    }
    const from = req.query.from ? new Date(String(req.query.from)) : new Date()
    from.setHours(0, 0, 0, 0)
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(from)
    to.setMonth(to.getMonth() + 2)
    const [products, maintenances, visits, busyDays] = await Promise.all([
      Product.find(filter).populate('client').sort({ updatedAt: -1 }).limit(100),
      Maintenance.find({ ...filter, status: { $ne: 'cancelled' } })
        .populate('product')
        .sort({ scheduledAt: 1 }),
      Visit.find({
        ...(req.user.role === 'admin' ? {} : { client: client._id }),
        status: { $ne: 'cancelled' },
      })
        .populate('product')
        .sort({ at: 1 })
        .limit(200),
      busyDayKeys(from, to),
    ])
    res.json({
      products: products.map(publicProduct),
      maintenances,
      visits,
      busyDays,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el taller' })
  }
})

portalRouter.post('/taller', async (req, res) => {
  try {
    const client = await clientForUser(req.user)
    if (!client) return res.status(400).json({ error: 'No hay ficha de cliente para agendar' })
    const at = new Date(req.body.at)
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Fecha y hora inválidas' })
    if (at.getTime() < Date.now() - 60 * 1000) {
      return res.status(400).json({ error: 'La visita debe ser en una fecha futura' })
    }
    await assertVisitCapacity(at)
    let product
    if (req.body.productId) {
      product = await Product.findById(req.body.productId)
      if (!product) return res.status(404).json({ error: 'Pedido no encontrado' })
      if (req.user.role !== 'admin' && String(product.client) !== String(client._id)) {
        return res.status(403).json({ error: 'Ese pedido no está en tu cuenta' })
      }
    }
    const visit = await Visit.create({
      client: client._id,
      product: product?._id,
      title: String(req.body.title || 'Solicitud de mantenimiento').trim(),
      notes: String(req.body.notes || '').trim(),
      at,
      source: 'client',
    })
    const populated = await visit.populate('product')
    res.status(201).json({ visit: populated })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || 'No se pudo crear la solicitud' })
  }
})
