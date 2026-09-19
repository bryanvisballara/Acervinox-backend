import { Router } from 'express'
import { Client } from '../models/Client.js'
import { Maintenance } from '../models/Maintenance.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const maintenancesRouter = Router()
maintenancesRouter.use(requireAuth, requireRole('admin', 'maintenance'))

function populateMaint() {
  return [
    { path: 'product', populate: { path: 'client' } },
    { path: 'client' },
  ]
}

maintenancesRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const status = String(req.query.status || '').trim()
    const filter = {}
    if (status) filter.status = status
    const items = await Maintenance.find(filter)
      .populate(populateMaint())
      .sort({ scheduledAt: 1 })
      .limit(300)

    const filtered = q
      ? items.filter((item) => {
          const hay = `${item.product?.name || ''} ${item.product?.tracking || ''} ${item.client?.name || ''}`.toLowerCase()
          return hay.includes(q.toLowerCase())
        })
      : items

    res.json({ maintenances: filtered })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar los mantenimientos' })
  }
})

maintenancesRouter.post('/', async (req, res) => {
  try {
    const clientId = String(req.body.client || '').trim()
    const productId = String(req.body.product || '').trim()
    const months = Number(req.body.intervalMonths)
    const at = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date()
    if (!clientId) return res.status(400).json({ error: 'Elige el cliente para programar la próxima visita' })
    if (!months || months < 1) return res.status(400).json({ error: 'Indica en cuántos meses vuelve' })
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Fecha inválida' })
    const client = await Client.findById(clientId)
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })
    if (productId) {
      const product = await Product.findById(productId)
      if (!product) return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    const item = await Maintenance.create({
      client: client._id,
      product: productId || undefined,
      intervalMonths: Math.round(months),
      scheduledAt: at,
      status: 'scheduled',
      notes: String(req.body.notes || '').trim().slice(0, 400),
      followUp: 'rescheduled',
    })
    const populated = await item.populate(populateMaint())
    res.status(201).json({ maintenance: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo programar el próximo mantenimiento' })
  }
})

maintenancesRouter.patch('/:id', async (req, res) => {
  try {
    const item = await Maintenance.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Mantenimiento no encontrado' })
    if (req.body.scheduledAt) {
      const at = new Date(req.body.scheduledAt)
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Fecha inválida' })
      item.scheduledAt = at
    }
    if (['none', 'contacted', 'visit', 'rescheduled'].includes(req.body.followUp)) {
      item.followUp = req.body.followUp
      if (req.body.followUp === 'contacted') item.contactedAt = new Date()
    }
    if (req.body.notes !== undefined) item.notes = String(req.body.notes || '').trim()
    await item.save()
    const populated = await item.populate(populateMaint())
    res.json({ maintenance: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el mantenimiento' })
  }
})
