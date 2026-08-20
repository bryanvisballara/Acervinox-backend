import { Router } from 'express'
import { Visit } from '../models/Visit.js'
import { Client } from '../models/Client.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { assertVisitCapacity } from '../lib/visitCapacity.js'

export const visitsRouter = Router()
visitsRouter.use(requireAuth, requireRole('admin', 'workshop'))

function populate(query) {
  return query
    .populate('client')
    .populate('product')
    .populate('maintenance')
}

visitsRouter.get('/', async (req, res) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    const filter = { status: { $ne: 'cancelled' } }
    if (from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      filter.at = { $gte: from, $lte: to }
    }
    const visits = await populate(Visit.find(filter).sort({ at: 1 }).limit(500))
    res.json({ visits })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar las visitas' })
  }
})

visitsRouter.post('/', async (req, res) => {
  try {
    const clientId = String(req.body.clientId || '').trim()
    const at = new Date(req.body.at)
    if (!clientId) return res.status(400).json({ error: 'Selecciona un cliente' })
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'La fecha de la visita no es válida' })
    await assertVisitCapacity(at)
    const client = await Client.findById(clientId)
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })
    const visit = await Visit.create({
      client: client._id,
      product: req.body.productId || undefined,
      maintenance: req.body.maintenanceId || undefined,
      title: String(req.body.title || '').trim(),
      notes: String(req.body.notes || '').trim(),
      at,
      source: req.body.maintenanceId ? 'maintenance' : 'manual',
    })
    res.status(201).json({ visit: await populate(Visit.findById(visit._id)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo agendar la visita' })
  }
})

visitsRouter.patch('/:id', async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' })
    if (req.body.at) {
      const at = new Date(req.body.at)
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Fecha inválida' })
      visit.at = at
    }
    if (req.body.notes !== undefined) visit.notes = String(req.body.notes || '').trim()
    if (req.body.title !== undefined) visit.title = String(req.body.title || '').trim()
    if (['scheduled', 'done', 'cancelled'].includes(req.body.status)) visit.status = req.body.status
    await visit.save()
    res.json({ visit: await populate(Visit.findById(visit._id)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar la visita' })
  }
})

visitsRouter.delete('/:id', async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
    if (!visit) return res.status(404).json({ error: 'Visita no encontrada' })
    await visit.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar la visita' })
  }
})
