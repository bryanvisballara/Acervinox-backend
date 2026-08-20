import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { cop } from '../../lib/image'

export function AccountingPage() {
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const load = async (query = q) => {
    const data = await api(`/api/accounting${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    setRows(data.products || [])
  }

  useEffect(() => {
    load('').catch((err) => setError(err.message))
  }, [])

  return (
    <div className="admin-page">
      <p className="admin-kicker">Gestión</p>
      <h1 className="font-display text-4xl font-bold">Contabilidad</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Totales, anticipos y saldos de cada pedido. Entra al detalle para definir el valor y
        registrar pagos. Los abonos de la app aparecen solos.
      </p>
      <section className="admin-card mt-6">
        <div className="admin-filters">
          <input
            className="field"
            placeholder="Buscar por guía o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load().catch((err) => setError(err.message))
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={() => load().catch((err) => setError(err.message))}>
            Buscar
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-brand">{error}</p>}
        <div className="table-wrap mt-4">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guía</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No hay pedidos para mostrar.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p._id}>
                    <td>{p.tracking}</td>
                    <td>{p.name}</td>
                    <td>{p.client?.name || '—'}</td>
                    <td>{cop(p.accounting?.totalAmount)}</td>
                    <td>{cop(p.accounting?.paid)}</td>
                    <td>{cop(p.accounting?.balance)}</td>
                    <td>
                      <Link className="text-sm font-semibold text-brand" to={`/admin/pedidos/${p._id}#contabilidad`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
