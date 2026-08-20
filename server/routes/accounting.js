import { Router } from 'express'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ledger } from '../lib/accounting.js'

export const accountingRouter = Router()
accountingRouter.use(requireAuth, requireRole('admin'))

accountingRouter.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const filter = {}
    if (q) {
      filter.$or = [{ name: new RegExp(q, 'i') }, { tracking: new RegExp(q, 'i') }]
    }
    const products = await Product.find(filter).populate('client').sort({ updatedAt: -1 }).limit(300)
    res.json({
      products: products.map((p) => {
        const obj = p.toObject({ virtuals: true })
        const acc = ledger(obj)
        return {
          _id: obj._id,
          tracking: obj.tracking,
          name: obj.name,
          client: obj.client,
          status: obj.status,
          updatedAt: obj.updatedAt,
          accounting: acc,
        }
      }),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar la contabilidad' })
  }
})
