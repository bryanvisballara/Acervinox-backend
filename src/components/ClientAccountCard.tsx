import { type FormEvent, useEffect, useState } from 'react'
import { NumberField } from './NumberField'
import { api } from '../lib/api'
import { cop } from '../lib/image'
import { PAY_METHOD_LABELS, PAY_STATUS_LABELS, type Accounting } from '../lib/pay'

export function ClientAccountCard({
  product,
  onPaid,
}: {
  product: any
  onPaid?: (product: any) => void
}) {
  const acc: Accounting = product.accounting || {
    totalAmount: 0,
    paid: 0,
    pending: 0,
    balance: 0,
    payments: [],
  }
  const [amount, setAmount] = useState(acc.balance || 0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setAmount(acc.balance || 0)
  }, [acc.balance])

  const pay = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api(`/api/portal/orders/${product._id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })
      onPaid?.(data.product)
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="capp-card" id="cuenta">
      <p className="capp-kicker">Contabilidad</p>
      <h2>Estado de cuenta</h2>
      <p className="capp-copy">
        Anticipos, total del pedido y saldo. Si quieres abonar, lo haces aquí mismo.
      </p>
      <div className="capp-specs">
        <div>
          <span>Valor total</span>
          <strong>{acc.totalAmount ? cop(acc.totalAmount) : 'Por definir'}</strong>
        </div>
        <div>
          <span>Pagado / anticipo</span>
          <strong>{cop(acc.paid)}</strong>
        </div>
        <div>
          <span>Saldo</span>
          <strong>{cop(acc.balance)}</strong>
        </div>
        <div>
          <span>En proceso</span>
          <strong>{cop(acc.pending)}</strong>
        </div>
      </div>

      {acc.payments.length > 0 && (
        <ul className="capp-pays">
          {acc.payments
            .filter((p) => p.status !== 'failed')
            .map((p) => (
              <li key={p.id}>
                <span>
                  {PAY_METHOD_LABELS[p.method] || p.method}
                  {p.source === 'app' ? ' · App' : ''}
                </span>
                <strong>{cop(p.amount)}</strong>
                <em>
                  {PAY_STATUS_LABELS[p.status] || p.status}
                  {p.at ? ` · ${new Date(p.at).toLocaleDateString('es-CO')}` : ''}
                </em>
              </li>
            ))}
        </ul>
      )}

      {!acc.totalAmount ? (
        <p className="mt-4 text-sm text-steel">
          El valor total lo define el equipo de acervinox. Cuando esté listo verás el saldo aquí.
        </p>
      ) : acc.balance <= 0 ? (
        <p className="mt-4 text-sm font-semibold text-ink">Este pedido está pago.</p>
      ) : product.payEnabled ? (
        <form className="mt-5 grid gap-3" onSubmit={pay}>
          <label className="capp-label">
            Valor a abonar
            <NumberField className="field" value={amount} onChange={setAmount} />
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" className="btn btn-red capp-cta" disabled={busy}>
            {busy ? 'Abriendo pasarela…' : 'Abonar ahora'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-steel">
          La pasarela de la app se activa cuando acervinox configura Wompi. Mientras tanto los
          pagos los registra el administrador.
        </p>
      )}
    </section>
  )
}
