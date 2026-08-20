import { Router } from 'express'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { vapidPublicKey } from '../lib/push.js'

export const pushRouter = Router()

pushRouter.get('/vapid', (_req, res) => {
  res.json({ publicKey: vapidPublicKey(), enabled: Boolean(vapidPublicKey()) })
})

pushRouter.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const endpoint = String(req.body.endpoint || '').trim()
    const p256dh = String(req.body.keys?.p256dh || req.body.p256dh || '').trim()
    const auth = String(req.body.keys?.auth || req.body.auth || '').trim()
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Suscripción incompleta' })
    }
    const user = await User.findById(req.user._id)
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
    if (!Array.isArray(user.pushSubs)) user.pushSubs = []
    user.pushSubs = user.pushSubs.filter((s) => s.endpoint !== endpoint)
    user.pushSubs.push({
      endpoint,
      p256dh,
      auth,
      platform: 'web',
      token: '',
      updatedAt: new Date(),
    })
    if (user.pushSubs.length > 12) user.pushSubs = user.pushSubs.slice(-12)
    await user.save()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo guardar la suscripción' })
  }
})

pushRouter.post('/device', requireAuth, async (req, res) => {
  try {
    const token = String(req.body.token || '').trim()
    const platform = req.body.platform === 'ios' ? 'ios' : 'android'
    if (!token) return res.status(400).json({ error: 'Falta el token del dispositivo' })
    const user = await User.findById(req.user._id)
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
    if (!Array.isArray(user.pushSubs)) user.pushSubs = []
    user.pushSubs = user.pushSubs.filter((s) => s.token !== token)
    user.pushSubs.push({
      endpoint: '',
      p256dh: '',
      auth: '',
      platform,
      token,
      updatedAt: new Date(),
    })
    if (user.pushSubs.length > 12) user.pushSubs = user.pushSubs.slice(-12)
    await user.save()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo registrar el dispositivo' })
  }
})
