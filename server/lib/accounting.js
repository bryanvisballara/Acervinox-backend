export const PAY_METHODS = ['anticipo', 'transferencia', 'efectivo', 'wompi', 'otro']

export function money(n) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.round(v) : 0
}

export function ledger(product, { includeAll = true } = {}) {
  const all = Array.isArray(product.payments) ? product.payments : []
  const confirmed = all.filter((p) => p.status === 'confirmed')
  const pending = all.filter((p) => p.status === 'pending')
  const paid = confirmed.reduce((sum, p) => sum + money(p.amount), 0)
  const pendingAmount = pending.reduce((sum, p) => sum + money(p.amount), 0)
  const totalAmount = money(product.totalAmount)
  const list = includeAll ? all : confirmed.concat(pending)
  return {
    totalAmount,
    paid,
    pending: pendingAmount,
    balance: Math.max(0, totalAmount - paid),
    payments: [...list]
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      .map((p) => ({
        id: String(p._id || ''),
        amount: money(p.amount),
        method: p.method || 'otro',
        source: p.source || 'admin',
        status: p.status || 'confirmed',
        reference: p.reference || '',
        note: p.note || '',
        at: p.at,
        by: p.by || '',
      })),
  }
}

export function addPayment(product, payload) {
  if (!Array.isArray(product.payments)) product.payments = []
  product.payments.push({
    amount: money(payload.amount),
    method: PAY_METHODS.includes(payload.method) ? payload.method : 'otro',
    source: payload.source === 'app' ? 'app' : 'admin',
    status: payload.status || 'confirmed',
    reference: String(payload.reference || '').slice(0, 120),
    note: String(payload.note || '').slice(0, 500),
    at: payload.at || new Date(),
    by: String(payload.by || ''),
  })
  product.markModified('payments')
  return product.payments[product.payments.length - 1]
}
