import { Router } from 'express'
import { Maintenance } from '../models/Maintenance.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const maintenancesRouter = Router()
maintenancesRouter.use(requireAuth, requireRole('admin', 'workshop'))

maintenancesRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const status = String(req.query.status || '').trim()
    const filter = {}
    if (status) filter.status = status
    const items = await Maintenance.find(filter)
      .populate({ path: 'product', populate: { path: 'client' } })
      .populate('client')
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
    const populated = await item.populate([
      { path: 'product', populate: { path: 'client' } },
      { path: 'client' },
    ])
    res.json({ maintenance: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el mantenimiento' })
  }
})
