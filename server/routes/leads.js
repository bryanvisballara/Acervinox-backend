import { Router } from 'express'
import { Lead } from '../models/Lead.js'

export const leadsRouter = Router()

leadsRouter.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    const company = String(req.body.company || '').trim()
    const email = String(req.body.email || '')
      .toLowerCase()
      .trim()
    const message = String(req.body.message || '').trim()

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nombre, correo y mensaje son obligatorios' })
    }

    const lead = await Lead.create({ name, company, email, message })
    res.status(201).json({ ok: true, id: lead._id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo enviar la cotización' })
  }
})
