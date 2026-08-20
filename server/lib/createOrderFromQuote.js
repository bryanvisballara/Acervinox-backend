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

export async function createOrderFromQuote(quote, user) {
  let client = quote.clientId ? await Client.findById(quote.clientId) : null
  if (!client && quote.clientEmail) {
    client = await Client.findOne({ email: String(quote.clientEmail).trim().toLowerCase() })
  }
  if (!client) {
    throw fail(
      'Esta cotización no tiene un cliente asociado. Ábrela en el cotizador, elige o crea el cliente y vuelve a confirmar E3.',
    )
  }

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
  if (!items.length) {
    throw fail('La cotización no tiene productos para fabricar.')
  }

  const stage = STAGES[0]
  const product = await Product.create({
    tracking: nextTracking(),
    name: items.map((item) => item.name).join(' + '),
    steelType: items[0].steelType,
    gauge: items[0].gauge,
    client: client._id,
    items,
    technicianNotes: `Pedido confirmado desde cotización ${quote.number}.`,
    stageIndex: 0,
    status: 'in_progress',
    events: [
      {
        stageIndex: 0,
        stageName: stage.name,
        note: `Pedido creado desde cotización ${quote.number}. Entra a etapa 1.`,
        by: user?.name || user?.email || '',
        at: new Date(),
      },
    ],
  })

  return product
}
