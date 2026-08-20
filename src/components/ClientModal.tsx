import { CheckCircle } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CLIENT_TYPES, DOC_TYPES } from '../data/stages'
import { api } from '../lib/api'
import { Modal } from './Modal'

export type AdminClient = {
  _id: string
  name: string
  email: string
  phone: string
  type: string
  docType?: string
  docNumber?: string
}

export function ClientModal({
  open,
  client,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean
  client?: AdminClient | null
  onClose: () => void
  onCreated?: (client: AdminClient) => void
  onUpdated?: (client: AdminClient) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = Boolean(client?._id)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<AdminClient | null>(null)

  useEffect(() => {
    if (!open) return
    setError('')
    setBusy(false)
    setCreated(null)
  }, [open, client?._id])

  const close = () => {
    if (busy) return
    setCreated(null)
    onClose()
  }

  const goToClients = () => {
    close()
    if (location.pathname !== '/admin/clientes') navigate('/admin/clientes')
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setError('')
    setBusy(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      type: String(form.get('type') || '').trim(),
      docType: String(form.get('docType') || '').trim(),
      docNumber: String(form.get('docNumber') || '').trim(),
    }
    try {
      if (editing && client) {
        const data = await api(`/api/clients/${client._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        onUpdated?.(data.client)
        close()
      } else {
        const data = await api('/api/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        onCreated?.(data.client)
        setCreated(data.client)
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el cliente')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={created ? 'Cliente creado' : editing ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={close}
    >
      {created ? (
        <div className="mt-6 grid gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 shrink-0 text-brand" size={28} />
            <div>
              <p className="font-display text-xl font-bold">{created.name}</p>
              <p className="mt-1 text-sm text-steel">
                Se guardó correctamente. Ya lo puedes ver y usar en la sección{' '}
                <strong>Clientes</strong>.
              </p>
              {created.email && <p className="mt-2 text-sm text-steel">{created.email}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-red" onClick={goToClients}>
              Ver en Clientes
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              Seguir aquí
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-6 grid gap-4" key={client?._id || 'new'} onSubmit={submit}>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Nombre
            <input className="field" name="name" required defaultValue={client?.name || ''} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
              Tipo de documento
              <select className="field" name="docType" defaultValue={client?.docType || ''}>
                <option value="">Sin documento</option>
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
              Número de documento
              <input
                className="field"
                name="docNumber"
                placeholder="900.123.456-7"
                defaultValue={client?.docNumber || ''}
              />
            </label>
          </div>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Correo
            <input
              className="field"
              name="email"
              type="email"
              required
              defaultValue={client?.email || ''}
            />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Teléfono
            <input className="field" name="phone" required defaultValue={client?.phone || ''} />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
            Tipo de cliente
            <select className="field" name="type" required defaultValue={client?.type || 'gastronomico'}>
              {CLIENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" className="btn btn-red" disabled={busy}>
            {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </form>
      )}
    </Modal>
  )
}
