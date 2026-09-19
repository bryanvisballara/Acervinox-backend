import { Router } from 'express'
import { Maintenance } from '../models/Maintenance.js'
import { MaintenanceActa } from '../models/MaintenanceActa.js'
import { MaterialRequest } from '../models/MaterialRequest.js'
import { actaHtml } from '../lib/actaHtml.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const mttoRouter = Router()
mttoRouter.use(requireAuth, requireRole('admin', 'maintenance'))

function publicOrigin(req) {
  return `${req.protocol}://${req.get('host')}`
}

function cleanText(v, max = 4000) {
  return String(v || '').trim().slice(0, max)
}

function cleanParts(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => String(p || '').trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 40)
}

function cleanPhotos(list) {
  return (Array.isArray(list) ? list : []).filter((p) => typeof p === 'string' && p.startsWith('data:image/')).slice(0, 8)
}

function cleanItems(list) {
  return (Array.isArray(list) ? list : [])
    .map((it) => ({
      name: String(it.name || '').trim().slice(0, 120),
      qty: Math.max(0, Number(it.qty) || 1),
    }))
    .filter((it) => it.name)
    .slice(0, 40)
}

function populateActa() {
  return [
    { path: 'client', select: 'name email phone' },
    { path: 'product', select: 'name tracking' },
    { path: 'maintenance' },
  ]
}

function populateMaterial() {
  return [
    { path: 'client', select: 'name' },
    { path: 'product', select: 'name tracking' },
    { path: 'maintenance' },
    { path: 'acta', select: 'number description' },
  ]
}

function actaPayload(req) {
  const rating = Number(req.body.serviceRating)
  return {
    client: req.body.client || null,
    product: req.body.product || null,
    maintenance: req.body.maintenance || null,
    clientName: cleanText(req.body.clientName, 120),
    date: req.body.date ? new Date(req.body.date) : new Date(),
    description: cleanText(req.body.description, 400),
    technicianName: cleanText(req.body.technicianName || req.user?.name, 120),
    situationFound: cleanText(req.body.situationFound),
    worksPerformed: cleanText(req.body.worksPerformed),
    parts: cleanParts(req.body.parts),
    technicianNotes: cleanText(req.body.technicianNotes),
    clientNotes: cleanText(req.body.clientNotes),
    serviceRating: rating >= 1 && rating <= 5 ? rating : 0,
    photos: cleanPhotos(req.body.photos),
    clientSignature:
      typeof req.body.clientSignature === 'string' && req.body.clientSignature.startsWith('data:image/')
        ? req.body.clientSignature
        : '',
    by: req.user?.name || req.user?.email || '',
  }
}

mttoRouter.get('/actas', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const actas = await MaintenanceActa.find()
      .populate(populateActa())
      .sort({ date: -1 })
      .limit(200)
    const rows = q
      ? actas.filter((a) =>
          `${a.number} ${a.clientName} ${a.client?.name || ''} ${a.description} ${a.technicianName}`.toLowerCase().includes(q.toLowerCase()),
        )
      : actas
    res.json({ actas: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar las actas' })
  }
})

mttoRouter.get('/actas/:id', async (req, res) => {
  try {
    const acta = await MaintenanceActa.findById(req.params.id).populate(populateActa())
    if (!acta) return res.status(404).json({ error: 'Acta no encontrada' })
    res.json({ acta })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el acta' })
  }
})

mttoRouter.post('/actas', async (req, res) => {
  try {
    const data = actaPayload(req)
    if (!data.clientName && !data.client) {
      return res.status(400).json({ error: 'Indica el cliente' })
    }
    if (Number.isNaN(data.date.getTime())) return res.status(400).json({ error: 'Fecha inválida' })
    const last = await MaintenanceActa.findOne().sort({ seq: -1 })
    const seq = (last?.seq || 0) + 1
    const acta = await MaintenanceActa.create({
      ...data,
      seq,
      number: `ACTA-${String(seq).padStart(4, '0')}`,
    })
    if (data.maintenance) {
      await Maintenance.findByIdAndUpdate(data.maintenance, { status: 'done', notes: data.description || 'Acta de visita' })
    }
    const populated = await acta.populate(populateActa())
    res.status(201).json({ acta: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el acta' })
  }
})

mttoRouter.patch('/actas/:id', async (req, res) => {
  try {
    const acta = await MaintenanceActa.findById(req.params.id)
    if (!acta) return res.status(404).json({ error: 'Acta no encontrada' })
    Object.assign(acta, actaPayload(req))
    if (Number.isNaN(acta.date.getTime())) return res.status(400).json({ error: 'Fecha inválida' })
    await acta.save()
    const populated = await acta.populate(populateActa())
    res.json({ acta: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el acta' })
  }
})

mttoRouter.get('/actas/:id/print', async (req, res) => {
  const acta = await MaintenanceActa.findById(req.params.id).populate(populateActa())
  if (!acta) return res.status(404).send('No encontrada')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(actaHtml(acta.toObject(), publicOrigin(req)))
})

mttoRouter.get('/materials', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = {}
    if (status) filter.status = status
    const requests = await MaterialRequest.find(filter).populate(populateMaterial()).sort({ createdAt: -1 }).limit(300)
    res.json({ requests })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' })
  }
})

mttoRouter.post('/materials', async (req, res) => {
  try {
    const items = cleanItems(req.body.items)
    if (!items.length) return res.status(400).json({ error: 'Agrega al menos un material' })
    const last = await MaterialRequest.findOne().sort({ seq: -1 })
    const seq = (last?.seq || 0) + 1
    const row = await MaterialRequest.create({
      seq,
      number: `MAT-${String(seq).padStart(4, '0')}`,
      client: req.body.client || null,
      product: req.body.product || null,
      maintenance: req.body.maintenance || null,
      acta: req.body.acta || null,
      forLabel: cleanText(req.body.forLabel, 200),
      items,
      notes: cleanText(req.body.notes, 800),
      by: req.user?.name || req.user?.email || '',
    })
    const populated = await row.populate(populateMaterial())
    res.status(201).json({ request: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo enviar la solicitud' })
  }
})

mttoRouter.patch('/materials/:id', requireRole('admin'), async (req, res) => {
  try {
    const row = await MaterialRequest.findById(req.params.id)
    if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' })
    if (['pending', 'seen', 'approved', 'delivered', 'rejected'].includes(req.body.status)) {
      row.status = req.body.status
    }
    if (req.body.adminNotes !== undefined) row.adminNotes = cleanText(req.body.adminNotes, 500)
    await row.save()
    const populated = await row.populate(populateMaterial())
    res.json({ request: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar la solicitud' })
  }
})
