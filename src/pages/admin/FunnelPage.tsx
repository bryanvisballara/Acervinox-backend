import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { CLIENT_TYPES, FUNNEL_LOST, FUNNEL_STAGES, STAGES } from '../../data/stages'
import { api, openPrintHtml } from '../../lib/api'

type Quotation = {
  _id: string
  number: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientType: string
  clientId?: string
  funnelStage: string
  total: number
  createdAt: string
  orderId?: string
  items: { name: string; origin: string }[]
}

function cop(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function FunnelPage() {
  const navigate = useNavigate()
  const [type, setType] = useState('')
  const [stage, setStage] = useState('')
  const [showLost, setShowLost] = useState(false)
  const [rows, setRows] = useState<Quotation[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pending, setPending] = useState<Quotation | null>(null)
  const [busy, setBusy] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ _id: string; tracking?: string } | null>(null)

  const load = async () => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (showLost) {
      params.set('lost', '1')
      params.set('stage', FUNNEL_LOST.id)
    } else if (stage) {
      params.set('stage', stage)
    }
    const data = await api(`/api/quotes/quotations?${params}`)
    setRows(data.quotations)
    setCounts(data.counts || {})
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [type, stage, showLost])

  const move = async (id: string, next: string, createOrder = false) => {
    setError('')
    setOk('')
    const data = await api(`/api/quotes/quotations/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: next, createOrder }),
    })
    await load()
    return data
  }

  const requestMove = (quote: Quotation, next: string) => {
    setError('')
    setOk('')
    setCreatedOrder(null)
    if (next === 'pedido') {
      setPending(quote)
      return
    }
    move(quote._id, next).catch((err) => setError(err.message))
  }

  const confirmE3 = async (createOrder: boolean) => {
    if (!pending || busy) return
    setBusy(true)
    try {
      const data = await move(pending._id, 'pedido', createOrder)
      setPending(null)
      if (createOrder && data.order?._id) {
        setCreatedOrder(data.order)
        setOk(
          data.order.tracking
            ? `Pedido ${data.order.tracking} añadido a ${STAGES[0].code} ${STAGES[0].name}.`
            : 'El pedido ya estaba en fabricación.',
        )
      } else {
        setOk('Cotización pasada a pedido confirmado.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Ventas</p>
      <h1 className="font-display text-4xl font-bold">Embudo de ventas</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Cotizaciones guardadas para seguimiento. Filtra por industria, gastronómico o sanitario y
        mueve cada cliente de etapa.
      </p>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && (
        <p className="mt-4 text-sm text-emerald-700">
          {ok}{' '}
          {createdOrder?._id && (
            <Link className="font-semibold text-brand" to={`/admin/pedidos/${createdOrder._id}`}>
              Ver en etapas de fabricación
            </Link>
          )}
        </p>
      )}

      <div className="admin-filters mt-6">
        <select
          className="field"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos los segmentos</option>
          {CLIENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`btn ${showLost ? 'btn-red' : 'btn-ghost'}`}
          onClick={() => {
            setShowLost((v) => !v)
            setStage('')
          }}
        >
          {FUNNEL_LOST.code} · Desistidos ({counts[FUNNEL_LOST.id] || 0})
        </button>
      </div>

      {!showLost && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Etapas del embudo</h2>
              <p>Tres pasos comerciales. El desistido vive en su propio apartado.</p>
            </div>
          </div>
          <div className="stage-grid">
            {FUNNEL_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`stage-btn ${stage === s.id ? 'is-now' : ''}`}
                onClick={() => setStage((cur) => (cur === s.id ? '' : s.id))}
              >
                <span>{s.code}</span>
                <strong>{s.name}</strong>
                <b>{counts[s.id] || 0}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>{showLost ? 'Clientes desistidos' : 'Actividad del embudo'}</h2>
            <p>
              {showLost
                ? 'Quienes no quisieron continuar. Quedan acá para historial.'
                : 'Haz clic en una fila para ver el PDF. Cambia la etapa o marca desistido.'}
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tracking</th>
                <th>Estado</th>
                <th>Título</th>
                <th>Producto</th>
                <th>Cliente</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    No hay cotizaciones en este filtro.
                  </td>
                </tr>
              ) : (
                rows.map((q) => {
                  const current =
                    [...FUNNEL_STAGES, FUNNEL_LOST].find((s) => s.id === q.funnelStage) || FUNNEL_STAGES[0]
                  const product = q.items?.[0]?.name || 'Cotización'
                  return (
                    <tr key={q._id}>
                      <td className="whitespace-nowrap">{formatDate(q.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="track-chip"
                          onClick={() => openPrintHtml(`/api/quotes/quotations/${q._id}/print`)}
                        >
                          <span className="track-id">{q.number}</span>
                          <span className="track-badge">
                            {q.clientType ? q.clientType.toUpperCase() : 'COTIZACIÓN'}
                          </span>
                        </button>
                      </td>
                      <td>
                        <strong>{current.code}</strong>
                      </td>
                      <td>{current.name}</td>
                      <td>{product}</td>
                      <td>
                        <div>{q.clientName || '—'}</div>
                        <div className="text-xs text-steel">{q.clientEmail || q.clientPhone}</div>
                      </td>
                      <td>{cop(q.total)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {FUNNEL_STAGES.filter((s) => s.id !== q.funnelStage).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="stage-mini"
                              onClick={() => requestMove(q, s.id)}
                            >
                              {s.code}
                            </button>
                          ))}
                          {q.funnelStage !== FUNNEL_LOST.id && (
                            <button
                              type="button"
                              className="stage-mini is-lost"
                              onClick={() => requestMove(q, FUNNEL_LOST.id)}
                            >
                              Desistido
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => navigate('/admin/cotizador')}>
          Ir al cotizador
        </button>
      </section>

      <Modal
        open={Boolean(pending)}
        title="Pedido confirmado"
        onClose={() => {
          if (!busy) setPending(null)
        }}
      >
        <p className="mt-4 text-sm text-steel">
          ¿Deseas añadir este pedido
          {pending?.items?.[0]?.name ? (
            <>
              {' '}
              (<strong>{pending.items[0].name}</strong>
              {(pending.items.length || 0) > 1 ? ' y más' : ''})
            </>
          ) : null}{' '}
          a la primera etapa de fabricación ({STAGES[0].code} {STAGES[0].name})?
        </p>
        {pending?.orderId && (
          <p className="mt-3 text-sm text-steel">Este pedido ya tiene un seguimiento en fabricación.</p>
        )}
        {!pending?.clientId && !pending?.clientEmail && (
          <p className="mt-3 text-sm text-brand">
            Para enviarlo a fabricación necesita un cliente. Puedes confirmar E3 ahora y asociar el
            cliente después en el cotizador.
          </p>
        )}
        {error && pending && <p className="mt-3 text-sm text-brand">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-red" disabled={busy} onClick={() => confirmE3(true)}>
            {busy ? 'Guardando…' : 'Sí, añadir a fabricación'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => confirmE3(false)}>
            No, solo confirmar E3
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setPending(null)}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
