const IVA = 0.19

export function money(n) {
  return Math.round(Number(n) || 0)
}

export function partAmount(part) {
  if (part?.pricing === 'medida') {
    return Math.round(money(part.unitPrice) * Number(part.measure || 0))
  }
  return money(part.unitPrice) * Number(part.qty || 0)
}

export function calcItem(item) {
  const net = (item.parts || []).reduce((sum, part) => sum + partAmount(part), 0)
  const iva = Math.round(net * IVA)
  return { ...item, net, iva, total: net + iva }
}

export function calcQuote(items) {
  const priced = items.map(calcItem)
  const subtotal = priced.reduce((s, i) => s + i.net, 0)
  const iva = priced.reduce((s, i) => s + i.iva, 0)
  return { items: priced, subtotal, iva, total: subtotal + iva }
}
