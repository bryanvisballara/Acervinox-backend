import { FileDown, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SignaturePad } from '../../components/SignaturePad'
import { useAuth } from '../../context/AuthContext'
import { api, openPrintHtml, openPrintWindow } from '../../lib/api'
import { compressImage } from '../../lib/image'

const RATINGS = [
  { n: 1, label: 'Deficiente' },
  { n: 2, label: 'Regular' },
  { n: 3, label: 'Bien' },
  { n: 4, label: 'Muy bien' },
  { n: 5, label: 'Excelente' },
]

type ClientRow = { _id: string; name: string }
type OrderRow = { _id: string; name: string; tracking: string; client?: { _id: string } | string }

function idOf(ref: { _id: string } | string | undefined) {
  if (!ref) return ''
  return typeof ref === 'string' ? ref : ref._id
}

function todayInput() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return todayInput()
  d.setMonth(d.getMonth() + months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MttoActaPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [number, setNumber] = useState('')
  const [client, setClient] = useState('')
  const [clientName, setClientName] = useState('')
  const [product, setProduct] = useState('')
  const [maintenance, setMaintenance] = useState(params.get('maintenance') || '')
  const [date, setDate] = useState(todayInput())
  const [description, setDescription] = useState('')
  const [technicianName, setTechnicianName] = useState(user?.name || '')
  const [situationFound, setSituationFound] = useState('')
  const [worksPerformed, setWorksPerformed] = useState('')
  const [parts, setParts] = useState<string[]>([''])
  const [technicianNotes, setTechnicianNotes] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  const [serviceRating, setServiceRating] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])
  const [clientSignature, setClientSignature] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(!id)
  const [nextMonths, setNextMonths] = useState(3)
  const [nextDate, setNextDate] = useState(() => addMonths(todayInput(), 3))
  const [nextCustom, setNextCustom] = useState('')
  const [nextSaved, setNextSaved] = useState('')

  useEffect(() => {
    Promise.all([api('/api/clients'), api('/api/products')])
      .then(([c, p]) => {
        setClients(c.clients || [])
        setOrders(p.products || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!id) return
    api(`/api/mtto/actas/${id}`)
      .then((d) => {
        const a = d.acta
        setNumber(a.number)
        setClient(idOf(a.client))
        setClientName(a.clientName || a.client?.name || '')
        setProduct(idOf(a.product))
        setMaintenance(idOf(a.maintenance))
        setDate(String(a.date || '').slice(0, 10) || todayInput())
        setDescription(a.description || '')
        setTechnicianName(a.technicianName || '')
        setSituationFound(a.situationFound || '')
        setWorksPerformed(a.worksPerformed || '')
        setParts(a.parts?.length ? a.parts : [''])
        setTechnicianNotes(a.technicianNotes || '')
        setClientNotes(a.clientNotes || '')
        setServiceRating(a.serviceRating || 0)
        setPhotos(a.photos || [])
        setClientSignature(a.clientSignature || '')
        setReady(true)
        const base = String(a.date || '').slice(0, 10) || todayInput()
        setNextDate(addMonths(base, 3))
      })
      .catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    const mid = params.get('maintenance')
    if (!mid || id) return
    api('/api/maintenances')
      .then((d) => {
        const m = (d.maintenances || []).find((row: { _id: string }) => row._id === mid)
        if (!m) return
        setMaintenance(m._id)
        setClient(idOf(m.client) || idOf(m.product?.client))
        setClientName(m.client?.name || m.product?.client?.name || '')
        setProduct(idOf(m.product))
        setDescription(m.product?.name || '')
        if (m.scheduledAt) setDate(String(m.scheduledAt).slice(0, 10))
      })
      .catch(() => {})
  }, [params, id])

  const ordersForClient = client ? orders.filter((o) => idOf(o.client) === client) : orders

  const payload = () => ({
    client: client || null,
    product: product || null,
    maintenance: maintenance || null,
    clientName: clientName.trim() || clients.find((c) => c._id === client)?.name || '',
    date,
    description,
    technicianName,
    situationFound,
    worksPerformed,
    parts: parts.map((p) => p.trim()).filter(Boolean),
    technicianNotes,
    clientNotes,
    serviceRating,
    photos,
    clientSignature,
  })

  const save = async () => {
    if (!clientName.trim() && !client) {
      setError('Indica el cliente')
      return null
    }
    setError('')
    setBusy(true)
    try {
      const body = JSON.stringify(payload())
      const data = id
        ? await api(`/api/mtto/actas/${id}`, { method: 'PATCH', body })
        : await api('/api/mtto/actas', { method: 'POST', body })
      setNumber(data.acta.number)
      setOk(`Acta ${data.acta.number} guardada`)
      if (!id) navigate(`/mtto/actas/${data.acta._id}`, { replace: true })
      return data.acta
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const print = async () => {
    const acta = number && id ? { _id: id } : await save()
    if (!acta?._id) return
    const preview = openPrintWindow()
    try {
      await openPrintHtml(`/api/mtto/actas/${acta._id}/print`, preview)
    } catch (err: any) {
      preview?.close()
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Portal de mantenimientos</p>
      <h1 className="font-display text-4xl font-bold">{number || 'Nueva acta'}</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Llena los mismos datos del acta de visita: situación, trabajos, repuestos, fotos, observaciones
        y firma conforme del cliente.
      </p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      <section className="admin-card">
        <div className="quote-grid">
          <label>
            Cliente
            <select
              className="field"
              value={client}
              onChange={(e) => {
                const id = e.target.value
                setClient(id)
                const c = clients.find((row) => row._id === id)
                if (c) setClientName(c.name)
                setProduct('')
              }}
            >
              <option value="">Sin ficha / escribir nombre</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre del cliente
            <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <label>
            Equipo / pedido
            <select className="field" value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="">Sin pedido</option>
              {ordersForClient.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.tracking} · {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="quote-span-2">
            Descripción
            <input
              className="field"
              value={description}
              placeholder="Normalización de sistema de arranque…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="quote-span-2">
            Nombre del técnico
            <input className="field" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="admin-card">
        <label className="quote-desc">
          Situación encontrada
          <textarea className="field" rows={5} value={situationFound} onChange={(e) => setSituationFound(e.target.value)} />
        </label>
        <label className="quote-desc">
          Trabajos realizados
          <textarea className="field" rows={6} value={worksPerformed} onChange={(e) => setWorksPerformed(e.target.value)} />
        </label>
        <div className="mt-5">
          <div className="admin-card-head">
            <div>
              <h2>Repuestos</h2>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setParts((p) => [...p, ''])}>
              <Plus size={15} /> Repuesto
            </button>
          </div>
          {parts.map((part, i) => (
            <div key={i} className="mtto-part-row">
              <input
                className="field"
                value={part}
                placeholder="Válvula de gas, monitor de llama…"
                onChange={(e) => setParts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => setParts((prev) => prev.filter((_, j) => j !== i || prev.length === 1))}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <label className="quote-desc">
          Observaciones del técnico
          <textarea className="field" rows={4} value={technicianNotes} onChange={(e) => setTechnicianNotes(e.target.value)} />
        </label>
        <label className="quote-desc">
          Observaciones del cliente
          <textarea className="field" rows={3} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
        </label>
      </section>

      <section className="admin-card">
        <h2>Registro fotográfico</h2>
        <label className="btn btn-ghost mt-3">
          Subir fotos
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files || [])]
              const next = await Promise.all(files.slice(0, 8 - photos.length).map((f) => compressImage(f, 960, 0.72)))
              setPhotos((prev) => [...prev, ...next].slice(0, 8))
              e.currentTarget.value = ''
            }}
          />
        </label>
        <div className="mtto-photos">
          {photos.map((src, i) => (
            <div key={i} className="mtto-photo">
              <img src={src} alt="" />
              <button type="button" className="btn btn-ghost" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>Calificación del servicio</h2>
        <div className="mtto-rate">
          {RATINGS.map((r) => (
            <button key={r.n} type="button" className={`mtto-rate-btn ${serviceRating === r.n ? 'is-on' : ''}`} onClick={() => setServiceRating(r.n)}>
              {r.n}
              <span>{r.label}</span>
            </button>
          ))}
        </div>
        <h2 className="mt-6">Firma conforme del cliente</h2>
        {ready ? <SignaturePad key={id || 'new'} value={clientSignature} onChange={setClientSignature} /> : null}
      </section>

      <section className="admin-card">
        <h2>Próximo mantenimiento</h2>
        <p className="mt-2 text-sm text-steel">
          Programa la siguiente visita de este mismo cliente y equipo. Queda en Citas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[3, 6, 10].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ${nextMonths === n && !nextCustom ? 'btn-red' : 'btn-ghost'}`}
              onClick={() => {
                setNextMonths(n)
                setNextCustom('')
                setNextDate(addMonths(date || todayInput(), n))
              }}
            >
              {n} meses
            </button>
          ))}
        </div>
        <div className="quote-grid mt-4">
          <label>
            Otro intervalo (meses)
            <input
              className="field"
              type="number"
              min={1}
              value={nextCustom}
              onChange={(e) => {
                const v = e.target.value
                setNextCustom(v)
                const n = Number(v)
                if (n >= 1) {
                  setNextMonths(n)
                  setNextDate(addMonths(date || todayInput(), n))
                }
              }}
            />
          </label>
          <label>
            Fecha de la próxima visita
            <input className="field" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </label>
        </div>
        {nextSaved && <p className="mt-3 text-sm text-emerald-700">Próxima cita: {nextSaved}</p>}
        <button
          type="button"
          className="btn btn-red mt-4"
          disabled={busy}
          onClick={async () => {
            if (!client) {
              setError('Elige el cliente de la ficha para programar la próxima visita')
              return
            }
            setError('')
            setBusy(true)
            try {
              const data = await api('/api/maintenances', {
                method: 'POST',
                body: JSON.stringify({
                  client,
                  product: product || null,
                  intervalMonths: nextMonths,
                  scheduledAt: `${nextDate}T09:00:00`,
                  notes: number ? `Siguiente visita después de ${number}` : 'Siguiente visita de mantenimiento',
                }),
              })
              const when = new Date(data.maintenance.scheduledAt).toLocaleDateString('es-CO')
              setNextSaved(`${when} · cada ${data.maintenance.intervalMonths} meses`)
              setOk(`Próximo mantenimiento programado para ${when}`)
            } catch (err: any) {
              setError(err.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          Programar próxima visita
        </button>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-red" disabled={busy} onClick={() => save()}>
          <Save size={16} /> Guardar acta
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={print}>
          <FileDown size={16} /> Generar PDF
        </button>
      </div>
    </div>
  )
}
