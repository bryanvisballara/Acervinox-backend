import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { api } from '../../lib/api'

type RequestRow = {
  _id: string
  number: string
  forLabel: string
  notes: string
  status: string
  items: { name: string; qty: number }[]
  createdAt: string
  adminNotes?: string
}

const STATUS: Record<string, string> = {
  pending: 'Pendiente',
  seen: 'Vista en admin',
  approved: 'Aprobada',
  delivered: 'Entregada',
  rejected: 'Rechazada',
}

export function MttoMaterialsPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [actas, setActas] = useState<{ _id: string; number: string; clientName: string; description: string }[]>([])
  const [maints, setMaints] = useState<{ _id: string; product?: { name: string; tracking: string }; client?: { name: string } }[]>([])
  const [acta, setActa] = useState('')
  const [maintenance, setMaintenance] = useState('')
  const [forLabel, setForLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ name: '', qty: 1 }])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    Promise.all([api('/api/mtto/materials'), api('/api/mtto/actas'), api('/api/maintenances')]).then(([m, a, c]) => {
      setRows(m.requests || [])
      setActas(a.actas || [])
      setMaints(c.maintenances || [])
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const send = async () => {
    const clean = items.filter((it) => it.name.trim())
    if (!clean.length) {
      setError('Escribe qué materiales necesitas')
      return
    }
    setError('')
    setBusy(true)
    try {
      await api('/api/mtto/materials', {
        method: 'POST',
        body: JSON.stringify({
          acta: acta || null,
          maintenance: maintenance || null,
          forLabel,
          notes,
          items: clean,
        }),
      })
      setItems([{ name: '', qty: 1 }])
      setNotes('')
      setForLabel('')
      setActa('')
      setMaintenance('')
      setOk('Solicitud enviada. Ya la ve el administrativo.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Portal de mantenimientos</p>
      <h1 className="font-display text-4xl font-bold">Solicitar materiales</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Indica qué necesitas y para qué mantenimiento. Llega al portal admin y queda en el historial.
      </p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      <section className="admin-card">
        <h2>Nueva solicitud</h2>
        <div className="quote-grid mt-4">
          <label>
            Acta
            <select className="field" value={acta} onChange={(e) => setActa(e.target.value)}>
              <option value="">Sin acta</option>
              {actas.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.number} · {a.clientName || a.description}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cita / mantenimiento
            <select className="field" value={maintenance} onChange={(e) => setMaintenance(e.target.value)}>
              <option value="">Sin cita</option>
              {maints.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.client?.name || 'Cliente'} · {m.product?.tracking || m.product?.name || 'equipo'}
                </option>
              ))}
            </select>
          </label>
          <label className="quote-span-2">
            ¿Para qué mantenimiento?
            <input
              className="field"
              value={forLabel}
              placeholder="Cambio de válvulas DH Crynsen…"
              onChange={(e) => setForLabel(e.target.value)}
            />
          </label>
        </div>
        <div className="admin-card-head mt-4">
          <div>
            <h2>Materiales</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setItems((p) => [...p, { name: '', qty: 1 }])}>
            <Plus size={15} /> Material
          </button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="mtto-part-row">
            <input
              className="field"
              value={it.name}
              placeholder="Monitor de llama, válvula, cable…"
              onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <NumberField
              className="field w-24"
              value={it.qty}
              onChange={(qty) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, qty } : x)))}
            />
            <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i || prev.length === 1))}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <label className="quote-desc">
          Notas
          <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="button" className="btn btn-red mt-4" disabled={busy} onClick={send}>
          Enviar al admin
        </button>
      </section>

      <section className="admin-card">
        <h2>Historial de solicitudes</h2>
        <div className="table-wrap mt-4">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Para</th>
                <th>Materiales</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    Aún no hay solicitudes.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.number}</td>
                    <td>
                      {r.forLabel || '—'}
                      {r.adminNotes ? <div className="text-xs text-steel">Admin: {r.adminNotes}</div> : null}
                    </td>
                    <td>{r.items.map((it) => `${it.qty} × ${it.name}`).join(', ')}</td>
                    <td>{STATUS[r.status] || r.status}</td>
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
