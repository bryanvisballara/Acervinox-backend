import { Router } from 'express'
import { CutPlan } from '../models/CutPlan.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const cutsRouter = Router()
cutsRouter.use(requireAuth, requireRole('admin', 'workshop'))

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function cleanPieces(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => ({
      id: String(p.id || '').slice(0, 40),
      label: String(p.label || '').trim().slice(0, 80),
      length: Math.max(0, num(p.length)),
      width: Math.max(0, num(p.width)),
      qty: Math.max(0, Math.floor(num(p.qty, 1))),
      material: String(p.material || '').trim().slice(0, 80),
      allowRotate: p.allowRotate !== false,
    }))
    .filter((p) => p.length > 0 && p.width > 0 && p.qty > 0)
    .slice(0, 80)
}

function cleanStocks(list) {
  return (Array.isArray(list) ? list : [])
    .map((s) => ({
      id: String(s.id || '').slice(0, 40),
      label: String(s.label || '').trim().slice(0, 80),
      length: Math.max(0, num(s.length)),
      width: Math.max(0, num(s.width)),
      qty: Math.max(0, Math.floor(num(s.qty))),
      material: String(s.material || '').trim().slice(0, 80),
    }))
    .filter((s) => s.length > 0 && s.width > 0)
    .slice(0, 20)
}

function payload(req) {
  const pieces = cleanPieces(req.body.pieces)
  const stocks = cleanStocks(req.body.stocks)
  return {
    name: String(req.body.name || req.body.jobName || '').trim().slice(0, 120),
    materialName: String(req.body.materialName || '').trim().slice(0, 80),
    kerf: Math.max(0, num(req.body.kerf)),
    pieces,
    stocks,
    sheetsUsed: Math.max(0, Math.floor(num(req.body.sheetsUsed))),
    utilization: Math.max(0, num(req.body.utilization)),
    scrap: Math.max(0, num(req.body.scrap)),
    designCount: Math.max(0, Math.floor(num(req.body.designCount))),
    quotation: req.body.quotation || undefined,
    quoteItemId: req.body.quoteItemId || undefined,
    by: req.user?.name || req.user?.email || '',
  }
}

cutsRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = q
      ? {
          $or: [
            { number: new RegExp(q, 'i') },
            { name: new RegExp(q, 'i') },
            { materialName: new RegExp(q, 'i') },
          ],
        }
      : {}
    const plans = await CutPlan.find(filter).sort({ updatedAt: -1 }).limit(200)
    res.json({ plans })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar los planes de corte' })
  }
})

cutsRouter.get('/:id', async (req, res) => {
  try {
    const plan = await CutPlan.findById(req.params.id)
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' })
    res.json({ plan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el plan' })
  }
})

cutsRouter.post('/', async (req, res) => {
  try {
    const data = payload(req)
    if (!data.pieces.length) return res.status(400).json({ error: 'El plan no tiene cortes válidos' })
    if (!data.stocks.length) return res.status(400).json({ error: 'El plan no tiene láminas válidas' })
    const last = await CutPlan.findOne().sort({ seq: -1 })
    const seq = (last?.seq || 0) + 1
    const plan = await CutPlan.create({
      ...data,
      seq,
      number: `CUT-${String(seq).padStart(4, '0')}`,
    })
    res.status(201).json({ plan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el plan' })
  }
})

cutsRouter.patch('/:id', async (req, res) => {
  try {
    const plan = await CutPlan.findById(req.params.id)
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' })
    const data = payload(req)
    if (!data.pieces.length) return res.status(400).json({ error: 'El plan no tiene cortes válidos' })
    if (!data.stocks.length) return res.status(400).json({ error: 'El plan no tiene láminas válidas' })
    Object.assign(plan, data)
    await plan.save()
    res.json({ plan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el plan' })
  }
})

cutsRouter.delete('/:id', async (req, res) => {
  try {
    const plan = await CutPlan.findById(req.params.id)
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' })
    await plan.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar el plan' })
  }
})
