import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Modal } from './Modal'
import type { AdminClient } from './ClientModal'

export type VisitRecord = {
  _id: string
  at: string
  title?: string
  notes?: string
  status?: string
  source?: string
  client?: AdminClient
  product?: { _id: string; name: string }
  maintenance?: { _id: string }
}

export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function VisitModal({
  open,
  clients,
  preset,
  onClose,
  onSaved,
}: {
  open: boolean
  clients: AdminClient[]
  preset?: {
    clientId?: string
    productId?: string
    maintenanceId?: string
    title?: string
    at?: Date
  }
  onClose: () => void
  onSaved: (visit: VisitRecord) => void
}) {
  const [clientId, setClientId] = useState('')
  const [at, setAt] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setNotes('')
    setClientId(preset?.clientId || '')
    setAt(toLocalInput(preset?.at || new Date()))
  }, [open, preset?.clientId, preset?.at?.getTime()])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/visits', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          productId: preset?.productId,
          maintenanceId: preset?.maintenanceId,
          title: preset?.title || '',
          notes,
          at,
        }),
      })
      onSaved(data.visit)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Agendar visita" onClose={() => !busy && onClose()}>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Cliente
          <select className="field" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecciona</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Fecha y hora
          <input className="field" type="datetime-local" required value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        {preset?.title && <p className="text-sm text-steel">{preset.title}</p>}
        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Notas
          <textarea className="field min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="text-sm text-brand">{error}</p>}
        <button type="submit" className="btn btn-red" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar visita'}
        </button>
      </form>
    </Modal>
  )
}
