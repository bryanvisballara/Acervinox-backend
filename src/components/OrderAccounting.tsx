import { type FormEvent, useEffect, useState } from 'react'
import { NumberField } from './NumberField'
import { api } from '../lib/api'
import { cop } from '../lib/image'
import { PAY_METHOD_LABELS, type Accounting } from '../lib/pay'

const METHODS = ['anticipo', 'transferencia', 'efectivo', 'wompi', 'otro'] as const

export function OrderAccounting({
  productId,
  accounting,
  onSaved,
}: {
  productId: string
  accounting?: Accounting
  onSaved: (product: any) => void
}) {
  const acc = accounting || { totalAmount: 0, paid: 0, pending: 0, balance: 0, payments: [] }
  const [total, setTotal] = useState(acc.totalAmount)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<(typeof METHODS)[number]>('anticipo')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setTotal(acc.totalAmount)
  }, [acc.totalAmount])

  const saveTotal = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api(`/api/products/${productId}/accounting`, {
        method: 'PATCH',
        body: JSON.stringify({ totalAmount: total }),
      })
      onSaved(data.product)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const addPay = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api(`/api/products/${productId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount, method, note }),
      })
      onSaved(data.product)
      setAmount(0)
      setNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removePay = async (id: string) => {
    if (!window.confirm('¿Eliminar este pago?')) return
    setError('')
    try {
      const data = await api(`/api/products/${productId}/payments/${id}`, { method: 'DELETE' })
      onSaved(data.product)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="acct-metrics">
        <article>
          <span>Valor total</span>
          <strong>{cop(acc.totalAmount)}</strong>
        </article>
        <article>
          <span>Pagado</span>
          <strong>{cop(acc.paid)}</strong>
        </article>
        <article>
          <span>Pendiente pasarela</span>
          <strong>{cop(acc.pending)}</strong>
        </article>
        <article className="is-balance">
          <span>Saldo</span>
          <strong>{cop(acc.balance)}</strong>
        </article>
      </div>

      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={saveTotal}>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Valor total del pedido
          <NumberField className="field" value={total} onChange={setTotal} />
        </label>
        <button type="submit" className="btn btn-ghost" disabled={busy}>
          Guardar total
        </button>
      </form>

      <form className="mt-6 grid gap-3" onSubmit={addPay}>
        <h3 className="font-display text-xl font-bold">Añadir pago</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Valor
            <NumberField className="field" value={amount} onChange={setAmount} />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Método
            <select className="field" value={method} onChange={(e) => setMethod(e.target.value as any)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAY_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Nota
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn-red w-fit" disabled={busy}>
          Registrar pago
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-brand">{error}</p>}

      <div className="table-wrap mt-6">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Método</th>
              <th>Origen</th>
              <th>Estado</th>
              <th>Valor</th>
              <th>Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {acc.payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  Aún no hay pagos. Define el total y registra anticipos o abonos.
                </td>
              </tr>
            ) : (
              acc.payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">
                    {p.at ? new Date(p.at).toLocaleString('es-CO') : '—'}
                  </td>
                  <td>{PAY_METHOD_LABELS[p.method] || p.method}</td>
                  <td>{p.source === 'app' ? 'App cliente' : 'Admin'}</td>
                  <td>{p.status}</td>
                  <td>{cop(p.amount)}</td>
                  <td>{p.note || p.reference || '—'}</td>
                  <td>
                    <button type="button" className="text-sm font-semibold text-brand" onClick={() => removePay(p.id)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
