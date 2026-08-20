import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { api } from '../lib/api'
import type { AdminClient } from './ClientModal'

type CatalogProduct = {
  _id: string
  name: string
  origin: string
  steelType?: string
  gauge?: string
}

export function OrderModal({
  open,
  clients,
  onClose,
  onCreated,
}: {
  open: boolean
  clients: AdminClient[]
  onClose: () => void
  onCreated?: () => void
}) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSelected([])
    setError('')
    api('/api/quotes/catalog')
      .then((d) => setCatalog(d.products || []))
      .catch((err) => setError(err.message))
  }, [open])

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          clientId: form.get('clientId'),
          productIds: selected,
          technicianNotes: form.get('technicianNotes'),
        }),
      })
      onCreated?.()
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <Modal open={open} title="Crear pedido" onClose={onClose}>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Cliente
          <select className="field" name="clientId" required defaultValue="">
            <option value="">Selecciona</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Productos
          </p>
          <p className="mt-1 text-sm text-steel">
            Un pedido puede llevar varios. Créalos antes en{' '}
            <Link to="/admin/productos" className="font-semibold text-brand" onClick={onClose}>
              Productos
            </Link>
            .
          </p>
          <div className="pick-list mt-3">
            {catalog.length === 0 ? (
              <p className="empty">Todavía no hay productos en el catálogo.</p>
            ) : (
              catalog.map((p) => (
                <label key={p._id} className={`pick-row ${selected.includes(p._id) ? 'is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(p._id)}
                    onChange={() => toggle(p._id)}
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <em>
                      {p.origin === 'importado' ? 'Importado' : 'Nacional'}
                      {p.steelType ? ` · ${p.steelType}` : ''}
                      {p.gauge ? ` · ${p.gauge}` : ''}
                    </em>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Observaciones para los técnicos
          <textarea
            className="field min-h-[110px]"
            name="technicianNotes"
            placeholder="Medidas especiales, soldadura, instalación, etc."
          />
        </label>
        {error && <p className="text-sm text-brand">{error}</p>}
        <button type="submit" className="btn btn-red">
          Crear pedido
        </button>
      </form>
    </Modal>
  )
}
