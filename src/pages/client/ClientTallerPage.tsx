import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { toLocalInput } from '../../components/VisitModal'

type TallerData = {
  products: any[]
  maintenances: any[]
  visits: any[]
  busyDays: string[]
}

export function ClientTallerPage() {
  const [data, setData] = useState<TallerData>({
    products: [],
    maintenances: [],
    visits: [],
    busyDays: [],
  })
  const [productId, setProductId] = useState('')
  const [at, setAt] = useState(toLocalInput(new Date(Date.now() + 36 * 3600 * 1000)))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    api('/api/portal/taller').then((d) => {
      setData({
        products: d.products || [],
        maintenances: d.maintenances || [],
        visits: d.visits || [],
        busyDays: d.busyDays || [],
      })
    })

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const scheduled = data.maintenances

  const dayOfInput = at.slice(0, 10)
  const dayBlocked = data.busyDays.includes(dayOfInput)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (dayBlocked) {
      setError('Ese día ya está lleno en el calendario de visitas. Elige otra fecha.')
      return
    }
    setBusy(true)
    setError('')
    setOk('')
    try {
      await api('/api/portal/taller', {
        method: 'POST',
        body: JSON.stringify({ productId: productId || undefined, at, notes }),
      })
      setNotes('')
      setOk('Solicitud enviada. Ya aparece en el calendario del equipo acervinox.')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="capp-page">
      <p className="capp-kicker">Taller</p>
      <h1 className="capp-title">Mantenimiento</h1>
      <p className="capp-copy">
        Si tu pedido ya se entregó, verás el mantenimiento que agendó acervinox. También puedes
        pedir una visita; las fechas ocupadas del calendario administrativo quedan bloqueadas.
      </p>

      <section className="capp-card">
        <h2>Programados por acervinox</h2>
        {scheduled.length === 0 ? (
          <p className="mt-2 text-sm text-steel">
            Aún no hay un mantenimiento administrativo. Cuando el pedido llegue a instalación /
            entrega, aparecerá aquí.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {scheduled.map((m) => (
              <li key={m._id} className="capp-order">
                <span>{m.product?.tracking || 'Mantenimiento'}</span>
                <strong>{m.product?.name || 'Equipo'}</strong>
                <em>
                  {new Date(m.scheduledAt).toLocaleString('es-CO')} · cada {m.intervalMonths} meses
                </em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="capp-card">
        <h2>Solicitar visita</h2>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <label className="capp-label">
            Equipo / pedido
            <select className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Sin pedido específico</option>
              {data.products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.tracking} · {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="capp-label">
            Fecha y hora
            <input
              className="field"
              type="datetime-local"
              required
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </label>
          {dayBlocked && (
            <p className="text-sm text-brand">Ese día no tiene cupo. Prueba con otra fecha.</p>
          )}
          {data.busyDays.length > 0 && (
            <p className="text-xs text-steel">
              Días sin cupo:{' '}
              {data.busyDays
                .map((d) => new Date(`${d}T12:00:00`).toLocaleDateString('es-CO'))
                .join(', ')}
            </p>
          )}
          <label className="capp-label">
            ¿Qué necesita el equipo?
            <textarea className="field min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          {ok && <p className="text-sm text-emerald-700">{ok}</p>}
          <button type="submit" className="btn btn-red capp-cta" disabled={busy || dayBlocked}>
            {busy ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </form>
      </section>

      <section className="capp-card">
        <h2>Tus visitas</h2>
        {data.visits.length === 0 ? (
          <p className="mt-2 text-sm text-steel">No tienes visitas agendadas.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {data.visits.map((v) => (
              <li key={v._id} className="capp-order">
                <span>{v.source === 'client' ? 'Tu solicitud' : 'Agendada por acervinox'}</span>
                <strong>{v.product?.name || v.title || 'Visita'}</strong>
                <em>{new Date(v.at).toLocaleString('es-CO')}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 text-center text-sm text-steel">
        <Link to="/portal" className="font-semibold text-brand no-underline">
          Ir a guías
        </Link>
      </p>
    </div>
  )
}
