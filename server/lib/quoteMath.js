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

function clampDiscountPct(pct) {
  return Math.min(100, Math.max(0, Number(pct) || 0))
}

export function itemGrossNet(item) {
  return (item.parts || []).reduce((sum, part) => sum + partAmount(part), 0)
}

export function calcItem(item) {
  const grossNet = itemGrossNet(item)
  const discountPct = clampDiscountPct(item.discountPct)
  const discountAmount = Math.round(grossNet * (discountPct / 100))
  const net = grossNet - discountAmount
  const iva = Math.round(net * IVA)
  return {
    ...item,
    discountPct,
    discountAmount,
    grossNet,
    net,
    iva,
    total: net + iva,
  }
}

export function calcQuote(items) {
  const priced = items.map(calcItem)
  const discountTotal = priced.reduce((s, i) => s + (i.discountAmount || 0), 0)
  const subtotal = priced.reduce((s, i) => s + i.net, 0)
  const iva = priced.reduce((s, i) => s + i.iva, 0)
  return { items: priced, subtotal, discountTotal, iva, total: subtotal + iva }
}
