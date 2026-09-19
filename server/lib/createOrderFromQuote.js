import { Client } from '../models/Client.js'
import { Product } from '../models/Product.js'
import { STAGES } from '../config/stages.js'

function nextTracking() {
  const n = Date.now().toString().slice(-8)
  return `AX-${n}`
}

function fail(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}

export function quoteOrderItems(quote) {
  const items = (quote.items || []).map((item) => ({
    name: item.name,
    origin: item.origin === 'importado' ? 'importado' : 'nacional',
    brand: item.brand || 'acervinox',
    steelType: item.steelType || '',
    gauge: item.gauge || '',
    image: item.image || '',
    specs: item.specs || [],
    qty: 1,
  }))
  const name = String(quote.orderName || '').trim()
  if (!items.length && name) return [{ name }]
  return items
}

export function quoteOrderName(quote) {
  const named = String(quote.orderName || '').trim()
  if (named) return named
  const items = quote.items || []
  if (items.length) return items.map((item) => item.name).filter(Boolean).join(' + ')
  return ''
}

export async function resolveQuoteClient(quote) {
  let client = quote.clientId ? await Client.findById(quote.clientId) : null
  if (!client && quote.clientEmail) {
    client = await Client.findOne({ email: String(quote.clientEmail).trim().toLowerCase() })
  }
  return client
}

export async function ensureOrderFromQuote(quote, user, { requireItems = false } = {}) {
  const client = await resolveQuoteClient(quote)
  if (!client) {
    throw fail(
      'Elige o crea el cliente para abrir el pedido.',
    )
  }

  const name = quoteOrderName(quote)
  if (!name) throw fail('Escribe el nombre del pedido')

  const items = quoteOrderItems(quote)
  if (requireItems && !items.length) {
    throw fail('La cotización no tiene productos para fabricar.')
  }

  if (quote.orderId) {
    const product = await Product.findById(quote.orderId)
    if (product) {
      product.name = name
      product.client = client._id
      product.items = items
      if (quote.total) product.totalAmount = quote.total
      await product.save()
      return product
    }
  }

  const stage = STAGES[0]
  const product = await Product.create({
    tracking: nextTracking(),
    name,
    steelType: items[0]?.steelType || '',
    gauge: items[0]?.gauge || '',
    client: client._id,
    items,
    technicianNotes: quote.number ? `Pedido desde cotización ${quote.number}.` : '',
    stageIndex: 0,
    status: 'in_progress',
    events: [
      {
        stageIndex: 0,
        stageName: stage.name,
        note: quote.number
          ? `Pedido creado desde cotización ${quote.number}. Entra a etapa 1.`
          : 'Pedido creado. Entra a etapa 1.',
        by: user?.name || user?.email || '',
        at: new Date(),
      },
    ],
    totalAmount: quote.total || 0,
  })

  return product
}

export async function createOrderFromQuote(quote, user) {
  return ensureOrderFromQuote(quote, user, { requireItems: false })
}
