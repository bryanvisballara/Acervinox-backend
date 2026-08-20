import { Router } from 'express'
import { Client } from '../models/Client.js'
import { Product } from '../models/Product.js'
import { Maintenance } from '../models/Maintenance.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { STAGES } from '../config/stages.js'

export const dashboardRouter = Router()
dashboardRouter.use(requireAuth, requireRole('admin', 'workshop'))

dashboardRouter.get('/summary', async (_req, res) => {
  try {
    const [clients, productCount, delivered, inProgress, maintenances, list] = await Promise.all([
      Client.countDocuments(),
      Product.countDocuments(),
      Product.countDocuments({ status: 'delivered' }),
      Product.countDocuments({ status: 'in_progress' }),
      Maintenance.countDocuments({ status: 'scheduled' }),
      Product.find().populate('client').sort({ updatedAt: -1 }),
    ])

    const byStage = await Product.aggregate([{ $group: { _id: '$stageIndex', count: { $sum: 1 } } }])
    const stageCounts = STAGES.map((stage, index) => ({
      ...stage,
      index,
      count: byStage.find((row) => row._id === index)?.count || 0,
    }))

    const events = list
      .flatMap((p) =>
        (p.events || []).map((ev) => ({
          at: ev.at,
          tracking: p.tracking,
          stageCode: STAGES[ev.stageIndex]?.code || '',
          title: ev.note || ev.stageName,
          product: (p.items || []).map((i) => i.name).filter(Boolean).join(', ') || p.name,
          client: p.client?.name || '—',
          productId: p._id,
        })),
      )
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 25)

    res.json({
      stats: { clients, products: productCount, delivered, inProgress, maintenances },
      stageCounts,
      events,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo cargar el dashboard' })
  }
})
