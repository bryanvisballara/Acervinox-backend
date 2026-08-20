import crypto from 'node:crypto'
import { money } from './accounting.js'
import { appUrl } from './appUrl.js'

export function wompiEnabled() {
  return Boolean(String(process.env.WOMPI_PUBLIC_KEY || '').trim())
}

export function integritySignature(reference, amountInCents, currency = 'COP') {
  const secret = String(process.env.WOMPI_INTEGRITY_SECRET || '').trim()
  if (!secret) return ''
  return crypto
    .createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest('hex')
}

export function checkoutUrl({ reference, amount, redirectUrl }) {
  const publicKey = String(process.env.WOMPI_PUBLIC_KEY || '').trim()
  if (!publicKey) {
    const err = new Error('La pasarela de pagos no está configurada')
    err.status = 409
    throw err
  }
  const amountInCents = money(amount) * 100
  if (amountInCents < 150000) {
    const err = new Error('El abono mínimo es $1.500')
    err.status = 400
    throw err
  }
  const params = new URLSearchParams({
    'public-key': publicKey,
    currency: 'COP',
    'amount-in-cents': String(amountInCents),
    reference,
    'redirect-url': redirectUrl,
  })
  const signature = integritySignature(reference, amountInCents, 'COP')
  if (signature) params.set('signature:integrity', signature)
  return `https://checkout.wompi.co/p/?${params.toString()}`
}

export function payRedirect(req, tracking) {
  return `${appUrl(req)}/portal/pago/${encodeURIComponent(tracking)}`
}

export function verifyWompiEvent(body) {
  const secret = String(process.env.WOMPI_EVENTS_SECRET || '').trim()
  if (!secret) return !process.env.WOMPI_PUBLIC_KEY
  const props = body?.signature?.properties
  if (!Array.isArray(props) || !props.length) return false
  const values = props
    .map((path) =>
      String(path)
        .split('.')
        .reduce((acc, key) => acc?.[key], body.data),
    )
    .join('')
  const concat = `${values}${body.timestamp}${secret}`
  const hash = crypto.createHash('sha256').update(concat).digest('hex')
  return hash.toLowerCase() === String(body.signature?.checksum || '').toLowerCase()
}
