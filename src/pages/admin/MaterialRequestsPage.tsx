import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

type RequestRow = {
  _id: string
  number: string
  forLabel: string
  notes: string
  status: string
  items: { name: string; qty: number }[]
  createdAt: string
  by?: string
  adminNotes?: string
  client?: { name: string }
  acta?: { number: string }
}

const STATUS = [
  { id: '', label: 'Todas' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'seen', label: 'Vista' },
  { id: 'approved', label: 'Aprobada' },
  { id: 'delivered', label: 'Entregada' },
  { id: 'rejected', label: 'Rechazada' },
]

export function MaterialRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const load = () =>
    api(`/api/mtto/materials${status ? `?status=${status}` : ''}`).then((d) => setRows(d.requests || []))

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [status])

  const patch = async (id: string, body: Record<string, unknown>) => {
    setError('')
    try {
      await api(`/api/mtto/materials/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      setOk('Solicitud actualizada')
      await load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Mantenimientos</p>
      <h1 className="font-display text-4xl font-bold">Solicitudes de materiales</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Lo que piden los técnicos desde el portal de mantenimientos. Queda el historial de cada pedido.
      </p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Historial</h2>
            <p>{rows.length} solicitudes.</p>
          </div>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => (
              <option key={s.id || 'all'} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Técnico</th>
                <th>Para</th>
                <th>Materiales</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No hay solicitudes.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.number}</td>
                    <td>{new Date(r.createdAt).toLocaleString('es-CO')}</td>
                    <td>{r.by || '—'}</td>
                    <td>
                      {r.forLabel || r.acta?.number || r.client?.name || '—'}
                      {r.notes ? <div className="text-xs text-steel">{r.notes}</div> : null}
                    </td>
                    <td>{r.items.map((it) => `${it.qty} × ${it.name}`).join(', ')}</td>
                    <td>
                      <select className="field" value={r.status} onChange={(e) => patch(r._id, { status: e.target.value })}>
                        {STATUS.filter((s) => s.id).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
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
