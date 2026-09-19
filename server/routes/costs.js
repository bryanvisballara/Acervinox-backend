import { Router } from 'express'
import { CostItem } from '../models/CostItem.js'
import { JobCost } from '../models/JobCost.js'
import { COST_CATEGORIES, COST_UNITS } from '../data/costItems.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const costsRouter = Router()
costsRouter.use(requireAuth, requireRole('admin'))

function money(n) {
  const v = Number(n)
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : 0
}

function qty(n) {
  const v = Number(n)
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : 0
}

function cleanItem(body) {
  const category = String(body.category || '')
  if (!COST_CATEGORIES.some((c) => c.id === category)) return { error: 'Categoría inválida' }
  const name = String(body.name || '').trim().slice(0, 80)
  if (!name) return { error: 'El nombre es obligatorio' }
  const unit = COST_UNITS.includes(body.unit) ? body.unit : 'und'
  return {
    category,
    name,
    variant: String(body.variant || '').trim().slice(0, 80),
    unit,
    price: money(body.price),
    notes: String(body.notes || '').trim().slice(0, 160),
    sort: money(body.sort),
  }
}

function lineTotal(line) {
  return money(qty(line.qty) * money(line.price))
}

function summarize(lines) {
  const materialTotal = lines
    .filter((l) => l.category !== 'fabricacion')
    .reduce((s, l) => s + money(l.total), 0)
  const laborTotal = lines
    .filter((l) => l.category === 'fabricacion')
    .reduce((s, l) => s + money(l.total), 0)
  const total = materialTotal + laborTotal
  return {
    materialTotal,
    laborTotal,
    total,
    sale50: money(total * 1.5),
    resale70: money(total * 1.7),
  }
}

function cleanLines(list) {
  return (Array.isArray(list) ? list : [])
    .map((l) => {
      const name = String(l.name || '').trim().slice(0, 80)
      if (!name) return null
      const next = {
        item: l.item || undefined,
        category: String(l.category || ''),
        name,
        variant: String(l.variant || '').trim().slice(0, 80),
        unit: COST_UNITS.includes(l.unit) ? l.unit : 'und',
        qty: qty(l.qty),
        price: money(l.price),
      }
      next.total = lineTotal(next)
      return next
    })
    .filter(Boolean)
    .slice(0, 200)
}

costsRouter.get('/categories', (_req, res) => {
  res.json({ categories: COST_CATEGORIES, units: COST_UNITS })
})

costsRouter.get('/items', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const category = String(req.query.category || '').trim()
    const filter = {}
    if (category) filter.category = category
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { variant: new RegExp(q, 'i') }]
    const items = await CostItem.find(filter).sort({ category: 1, sort: 1, name: 1, variant: 1 })
    res.json({ items, categories: COST_CATEGORIES, units: COST_UNITS })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar los costos' })
  }
})

costsRouter.post('/items', async (req, res) => {
  try {
    const data = cleanItem(req.body)
    if (data.error) return res.status(400).json({ error: data.error })
    const last = await CostItem.findOne({ category: data.category }).sort({ sort: -1 })
    data.sort = (last?.sort || 0) + 1
    const item = await CostItem.create(data)
    res.status(201).json({ item })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo crear el ítem' })
  }
})

costsRouter.patch('/items/:id', async (req, res) => {
  try {
    const item = await CostItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' })
    const data = cleanItem({ ...item.toObject(), ...req.body })
    if (data.error) return res.status(400).json({ error: data.error })
    Object.assign(item, data)
    await item.save()
    res.json({ item })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el precio' })
  }
})

costsRouter.delete('/items/:id', async (req, res) => {
  try {
    const item = await CostItem.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Ítem no encontrado' })
    await item.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar el ítem' })
  }
})

costsRouter.get('/jobs', async (req, res) => {
  try {
    const filter = {}
    if (req.query.client) filter.client = req.query.client
    if (req.query.product) filter.product = req.query.product
    const q = String(req.query.q || '').trim()
    const jobs = await JobCost.find(filter)
      .populate('client', 'name')
      .populate('product', 'name tracking')
      .sort({ updatedAt: -1 })
      .limit(200)
    const rows = q
      ? jobs.filter((j) =>
          `${j.number} ${j.name} ${j.client?.name || ''} ${j.product?.tracking || ''}`.toLowerCase().includes(q.toLowerCase()),
        )
      : jobs
    res.json({ jobs: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudieron cargar los costos de trabajo' })
  }
})

costsRouter.get('/jobs/:id', async (req, res) => {
  try {
    const job = await JobCost.findById(req.params.id).populate('client', 'name').populate('product', 'name tracking')
    if (!job) return res.status(404).json({ error: 'Costo no encontrado' })
    res.json({ job })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el costo' })
  }
})

function jobPayload(req) {
  const lines = cleanLines(req.body.lines)
  return {
    name: String(req.body.name || '').trim().slice(0, 120),
    client: req.body.client || null,
    product: req.body.product || null,
    quotation: req.body.quotation || null,
    quoteItemId: req.body.quoteItemId || null,
    lines,
    notes: String(req.body.notes || '').trim().slice(0, 500),
    ...summarize(lines),
    by: req.user?.name || req.user?.email || '',
  }
}

costsRouter.post('/jobs', async (req, res) => {
  try {
    const data = jobPayload(req)
    const last = await JobCost.findOne().sort({ seq: -1 })
    const seq = (last?.seq || 0) + 1
    const job = await JobCost.create({
      ...data,
      seq,
      number: `CST-${String(seq).padStart(4, '0')}`,
    })
    const populated = await job.populate([{ path: 'client', select: 'name' }, { path: 'product', select: 'name tracking' }])
    res.status(201).json({ job: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar el costo del trabajo' })
  }
})

costsRouter.patch('/jobs/:id', async (req, res) => {
  try {
    const job = await JobCost.findById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Costo no encontrado' })
    Object.assign(job, jobPayload(req))
    await job.save()
    const populated = await job.populate([{ path: 'client', select: 'name' }, { path: 'product', select: 'name tracking' }])
    res.json({ job: populated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo actualizar el costo' })
  }
})

costsRouter.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await JobCost.findById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Costo no encontrado' })
    await job.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo borrar el costo' })
  }
})
