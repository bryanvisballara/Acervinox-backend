import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ClientModal, type AdminClient } from '../../components/ClientModal'
import { Modal } from '../../components/Modal'
import { CLIENT_TYPES, DOC_TYPES } from '../../data/stages'
import { api } from '../../lib/api'

export function ClientsPage() {
  const [rows, setRows] = useState<AdminClient[]>([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminClient | null>(null)
  const [removing, setRemoving] = useState<AdminClient | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/clients').then((d) => setRows(d.clients))

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter((c) => {
        const hay = `${c.name} ${c.email} ${c.phone} ${c.docNumber || ''}`.toLowerCase()
        if (q && !hay.includes(q.toLowerCase())) return false
        if (type && c.type !== type) return false
        return true
      }),
    [rows, q, type],
  )

  const docLabel = (id?: string) => DOC_TYPES.find((d) => d.id === id)?.label || id || '—'

  const upsert = (client: AdminClient) => {
    setRows((prev) => {
      const rest = prev.filter((c) => c._id !== client._id)
      return [client, ...rest]
    })
  }

  const confirmDelete = async () => {
    if (!removing || busy) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/clients/${removing._id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((c) => c._id !== removing._id))
      setRemoving(null)
    } catch (err: any) {
      setError(err.message || 'No se pudo borrar el cliente')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Gestión</p>
          <h1 className="font-display text-4xl font-bold">Clientes</h1>
        </div>
        <button type="button" className="btn btn-red" onClick={() => setCreating(true)}>
          <Plus size={16} /> Crear cliente
        </button>
      </div>
      <section className="admin-card mt-6">
        <div className="admin-filters">
          <input className="field" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {CLIENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Tipo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No hay clientes con ese filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>
                      {c.docType || c.docNumber
                        ? `${docLabel(c.docType)}${c.docNumber ? ` ${c.docNumber}` : ''}`
                        : '—'}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td className="capitalize">{c.type}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={() => setEditing(c)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost !px-3 !py-2 text-brand"
                          onClick={() => {
                            setError('')
                            setRemoving(c)
                          }}
                        >
                          <Trash2 size={14} /> Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ClientModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={upsert}
      />
      <ClientModal
        open={Boolean(editing)}
        client={editing}
        onClose={() => setEditing(null)}
        onUpdated={upsert}
      />
      <Modal
        open={Boolean(removing)}
        title="Borrar cliente"
        onClose={() => {
          if (!busy) setRemoving(null)
        }}
      >
        <p className="mt-4 text-sm text-steel">
          ¿Borrar a <strong>{removing?.name}</strong>? Esta acción no se puede deshacer.
        </p>
        {error && <p className="mt-3 text-sm text-brand">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-red" disabled={busy} onClick={confirmDelete}>
            {busy ? 'Borrando…' : 'Sí, borrar'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setRemoving(null)}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
