import { Router } from 'express'
import { Client } from '../models/Client.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

export const clientsRouter = Router()
clientsRouter.use(requireAuth, requireRole('admin', 'workshop'))

function fail(err, res, fallback) {
  console.error(err)
  if (err?.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((item) => item.message)
      .join('. ')
    return res.status(400).json({ error: message || 'Datos de cliente inválidos' })
  }
  if (err?.code === 11000) {
    return res.status(400).json({ error: 'Ya existe un cliente con ese correo o documento' })
  }
  res.status(500).json({ error: fallback })
}

function readClientBody(body) {
  const name = String(body.name || '').trim()
  const email = String(body.email || '')
    .toLowerCase()
    .trim()
  const phone = String(body.phone || '').trim()
  const type = String(body.type || '').trim()
  const docType = String(body.docType || '').trim()
  const docNumber = String(body.docNumber || '').trim()
  if (!name || !email || !phone || !type) {
    return { error: 'Nombre, correo, teléfono y tipo son obligatorios' }
  }
  if (!['industria', 'gastronomico', 'sanitario'].includes(type)) {
    return { error: 'Tipo de cliente inválido' }
  }
  if (docType && !['nit', 'cc', 'ce', 'pasaporte', 'rut'].includes(docType)) {
    return { error: 'Tipo de documento inválido' }
  }
  return {
    data: {
      name,
      email,
      phone,
      type,
      docNumber,
      docType: docType || undefined,
    },
  }
}

clientsRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const type = String(req.query.type || '').trim()
    const filter = {}
    if (type) filter.type = type
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { docNumber: new RegExp(q, 'i') },
      ]
    }
    const clients = await Client.find(filter).sort({ createdAt: -1 }).limit(200)
    res.json({ clients })
  } catch (err) {
    fail(err, res, 'No se pudieron cargar los clientes')
  }
})

clientsRouter.post('/', requireRole('admin'), async (req, res) => {
  try {
    const parsed = readClientBody(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })
    const payload = { ...parsed.data }
    if (!payload.docType) delete payload.docType
    const client = await Client.create(payload)
    res.status(201).json({ client })
  } catch (err) {
    fail(err, res, 'No se pudo crear el cliente')
  }
})

clientsRouter.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })
    const parsed = readClientBody(req.body)
    if (parsed.error) return res.status(400).json({ error: parsed.error })
    client.name = parsed.data.name
    client.email = parsed.data.email
    client.phone = parsed.data.phone
    client.type = parsed.data.type
    client.docNumber = parsed.data.docNumber
    if (parsed.data.docType) client.docType = parsed.data.docType
    else client.docType = undefined
    await client.save()
    res.json({ client })
  } catch (err) {
    fail(err, res, 'No se pudo actualizar el cliente')
  }
})

clientsRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' })
    const orders = await Product.countDocuments({ client: client._id })
    if (orders > 0) {
      return res.status(409).json({
        error: `Este cliente tiene ${orders} pedido(s). Borra o reasigna esos pedidos antes de eliminar el cliente.`,
      })
    }
    await client.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    fail(err, res, 'No se pudo borrar el cliente')
  }
})
