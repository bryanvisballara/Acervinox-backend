import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'

type PortalOrder = {
  _id: string
  tracking: string
  name: string
  stageIndex: number
  status: string
}

export function ClientPortal() {
  const { first } = useOutletContext<{ first: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'search' | 'orders'>('search')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<PortalOrder[]>([])

  useEffect(() => {
    api('/api/portal/orders')
      .then((d) => setOrders(d.products || []))
      .catch(() => {})
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const tracking = code.trim()
    if (!tracking) {
      setError('Escribe tu número de guía')
      return
    }
    navigate(`/portal/guia/${encodeURIComponent(tracking)}`)
  }

  return (
    <div className="capp-page">
      <p className="capp-hi">Hola, {first}</p>
      <p className="capp-sub">Eficiencia forjada en acero.</p>

      <h1 className="capp-title">Rastrea tu pedido</h1>
      <p className="capp-copy">
        Escribe el número de guía que te dimos en el portal y te mostramos la etapa, los eventos y
        las fotos del avance.
      </p>
      <a className="capp-link" href="/#contacto">
        ¿Aún no tienes guía? escríbenos
      </a>

      <div className="capp-tabs">
        <button type="button" className={tab === 'search' ? 'is-on' : ''} onClick={() => setTab('search')}>
          Buscar guía
        </button>
        <button type="button" className={tab === 'orders' ? 'is-on' : ''} onClick={() => setTab('orders')}>
          Mis pedidos
        </button>
      </div>

      {tab === 'search' ? (
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          <label className="capp-label">
            Número de guía
            <input
              className="field"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej. AX-95526370"
            />
          </label>
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" className="btn btn-red capp-cta">
            Rastrear
          </button>
        </form>
      ) : (
        <ul className="mt-5 grid gap-2">
          {orders.length === 0 ? (
            <p className="text-sm text-steel">
              Aún no hay pedidos. Busca una guía y quedará guardada aquí.
            </p>
          ) : (
            orders.map((p) => (
              <li key={p._id}>
                <Link to={`/portal/guia/${p.tracking}`} className="capp-order">
                  <span>{p.tracking}</span>
                  <strong>{p.name}</strong>
                  <em>
                    {STAGES[p.stageIndex]?.code} · {STAGES[p.stageIndex]?.name}
                    {p.status === 'delivered' ? ' · Entregado' : ''}
                  </em>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
