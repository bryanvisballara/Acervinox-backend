import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, openPrintHtml, openPrintWindow } from '../../lib/api'

type Acta = {
  _id: string
  number: string
  date: string
  clientName: string
  description: string
  technicianName: string
  client?: { name: string }
}

export function MttoActasPage() {
  const [rows, setRows] = useState<Acta[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/mtto/actas')
      .then((d) => setRows(d.actas || []))
      .catch((err) => setError(err.message))
  }, [])

  const list = rows.filter((a) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return `${a.number} ${a.clientName} ${a.client?.name || ''} ${a.description}`.toLowerCase().includes(needle)
  })

  const print = async (id: string) => {
    const preview = openPrintWindow()
    try {
      await openPrintHtml(`/api/mtto/actas/${id}/print`, preview)
    } catch (err: any) {
      preview?.close()
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Portal de mantenimientos</p>
      <h1 className="font-display text-4xl font-bold">Actas</h1>
      <p className="mt-2 max-w-2xl text-steel">Reabre un acta para editarla o generar el PDF.</p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Historial</h2>
          </div>
          <input className="field" placeholder="Buscar acta o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Acta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Aún no hay actas.
                  </td>
                </tr>
              ) : (
                list.map((a) => (
                  <tr key={a._id}>
                    <td>{a.number}</td>
                    <td>{new Date(a.date).toLocaleDateString('es-CO')}</td>
                    <td>{a.clientName || a.client?.name || '—'}</td>
                    <td>{a.description || '—'}</td>
                    <td className="cut-plan-actions">
                      <Link className="btn btn-ghost" to={`/mtto/actas/${a._id}`}>
                        Abrir
                      </Link>
                      <button type="button" className="btn btn-ghost" onClick={() => print(a._id)}>
                        PDF
                      </button>
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
