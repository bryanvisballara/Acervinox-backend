import { Router } from 'express'
import { Product } from '../models/Product.js'
import { verifyWompiEvent } from '../lib/wompi.js'
import { notifyProductAudience } from '../lib/push.js'
import { money } from '../lib/accounting.js'

export const paymentsRouter = Router()

paymentsRouter.post('/wompi', async (req, res) => {
  try {
    if (!verifyWompiEvent(req.body)) {
      return res.status(401).json({ error: 'Firma de evento inválida' })
    }
    const txn = req.body?.data?.transaction || {}
    const reference = String(txn.reference || '').trim()
    const status = String(txn.status || '').toUpperCase()
    if (!reference) return res.json({ ok: true })

    const product = await Product.findOne({ 'payments.reference': reference }).populate('client')
    if (!product) return res.json({ ok: true })

    const payment = product.payments.find((p) => p.reference === reference)
    if (!payment) return res.json({ ok: true })
    if (payment.status === 'confirmed') return res.json({ ok: true })

    if (status === 'APPROVED') {
      payment.status = 'confirmed'
      if (txn.amount_in_cents) payment.amount = money(Number(txn.amount_in_cents) / 100)
      payment.note = payment.note || `Pago Wompi ${txn.id || ''}`.trim()
      product.markModified('payments')
      await product.save()
      notifyProductAudience(product, {
        title: 'Pago confirmado',
        body: `Se registró un abono en ${product.tracking}`,
        url: `/portal/guia/${product.tracking}`,
      })
    } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(status)) {
      payment.status = 'failed'
      product.markModified('payments')
      await product.save()
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No se pudo procesar el evento de pago' })
  }
})
