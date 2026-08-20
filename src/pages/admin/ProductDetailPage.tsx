import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { OrderAccounting } from '../../components/OrderAccounting'
import { reportForStage, StageClientReport } from '../../components/StageClientReport'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'
import { cop } from '../../lib/image'
import { useStaffBase } from '../../lib/staff'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const base = useStaffBase()
  const workshop = base === '/workshop'
  const [product, setProduct] = useState<any>(null)
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [error, setError] = useState('')
  const [askMaint, setAskMaint] = useState(false)
  const [months, setMonths] = useState(6)
  const [custom, setCustom] = useState('')
  const [reportStage, setReportStage] = useState(0)

  const load = async (syncStage = false) => {
    const data = await api(`/api/products/${id}`)
    setProduct(data.product)
    setMaintenances(data.maintenances || [])
    if (syncStage) setReportStage(data.product.stageIndex || 0)
  }

  useEffect(() => {
    load(true).catch((err) => setError(err.message))
  }, [id])

  useEffect(() => {
    if (workshop || !product?._id) return
    if (window.location.hash === '#contabilidad') {
      window.setTimeout(() => document.getElementById('contabilidad')?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [product?._id, workshop])

  const move = async (direction: 'next' | 'back', intervalMonths?: number) => {
    setError('')
    try {
      const data = await api(`/api/products/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ direction, intervalMonths }),
      })
      setProduct(data.product)
      setAskMaint(false)
      setReportStage(data.product.stageIndex || 0)
      await load()
    } catch (err: any) {
      if (err.payload?.needsMaintenance) {
        setAskMaint(true)
        return
      }
      setError(err.message)
    }
  }

  if (!product) {
    return <div className="admin-page text-steel">{error || 'Cargando…'}</div>
  }

  const stage = STAGES[product.stageIndex]
  const client = product.client || {}

  return (
    <div className="admin-page">
      <button type="button" className="text-sm font-semibold text-steel" onClick={() => navigate(-1)}>
        ← Volver
      </button>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="admin-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="admin-kicker">{product.tracking}</p>
            {!workshop && (
              <a href="#contabilidad" className="btn btn-ghost tracking-accounting-button">
                Contabilidad
              </a>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{product.name}</h1>
          <p className="mt-2 text-steel">Cliente: {client.name}</p>
          {(client.docType || client.docNumber) && (
            <p className="text-sm text-steel">
              {(client.docType || '').toUpperCase()} {client.docNumber}
            </p>
          )}
          {product.technicianNotes && (
            <div className="tech-notes mt-4">
              <span className="admin-kicker">Observaciones para técnicos</span>
              <p>{product.technicianNotes}</p>
            </div>
          )}
          {(product.items || []).length > 0 && (
            <div className="mt-6">
              <span className="admin-kicker">Productos del pedido</span>
              <ul className="mt-2 grid gap-2">
                {product.items.map((item: any) => (
                  <li key={item._id || item.name} className="pick-row">
                    <span>
                      <strong>{item.name}</strong>
                      <em>
                        {item.origin === 'importado' ? 'Importado' : 'Nacional'}
                        {item.steelType ? ` · ${item.steelType}` : ''}
                        {item.gauge ? ` · ${item.gauge}` : ''}
                      </em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <span className="admin-kicker">Acero</span>
              <strong className="block">{product.steelType}</strong>
            </div>
            <div>
              <span className="admin-kicker">Calibre</span>
              <strong className="block">{product.gauge}</strong>
            </div>
            <div>
              <span className="admin-kicker">Tipo de cliente</span>
              <strong className="block capitalize">{client.type}</strong>
            </div>
          </div>
          <p className="mt-4 text-sm text-steel">
            {client.email} · {client.phone}
          </p>
        </section>

        <section className="admin-card">
          <h2>Transición de etapa</h2>
          <p className="mt-1 text-sm text-steel">
            Puedes avanzar o retroceder. La etapa actual queda en proceso. En la última se agenda el
            mantenimiento.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={() => move('back')}>
              ← Anterior
            </button>
            <button type="button" className="btn btn-red flex-1" onClick={() => move('next')}>
              Siguiente →
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold">
            Actual: {stage?.code} · {stage?.name}
          </p>
          {error && <p className="mt-3 text-sm text-brand">{error}</p>}
          {!workshop && product.accounting && (
            <p className="mt-4 text-sm text-steel">
              Saldo {cop(product.accounting.balance)} de {cop(product.accounting.totalAmount)}
            </p>
          )}
        </section>
      </div>

      {!workshop && (
        <section className="admin-card" id="contabilidad">
          <div className="admin-card-head">
            <div>
              <p className="admin-kicker">Pedido</p>
              <h2>Contabilidad</h2>
            </div>
          </div>
          <p className="mt-1 text-sm text-steel">
            Define el valor total y registra pagos. Si el cliente abona desde la app, el movimiento
            aparece aquí automáticamente.
          </p>
          <div className="mt-5">
            <OrderAccounting
              productId={product._id}
              accounting={product.accounting}
              onSaved={setProduct}
            />
          </div>
        </section>
      )}

      <section className="admin-card">
        <StageClientReport
          productId={product._id}
          stageIndex={reportStage}
          report={reportForStage(product.stageReports, reportStage)}
          editable
          onSaved={(next) => setProduct(next)}
        />
      </section>

      <section className="admin-card">
        <h2>Timeline de etapas</h2>
        <div className="timeline-grid">
          {STAGES.map((item, i) => {
            const done = i < product.stageIndex || product.status === 'delivered'
            const current = i === product.stageIndex && product.status !== 'delivered'
            const delivered = product.status === 'delivered' && i === STAGES.length - 1
            const reached = i <= product.stageIndex
            const selected = i === reportStage
            const hasClientUpdate = (product.stageReports || []).some(
              (r: any) => r.stageIndex === i && (r.observations || r.photos?.length),
            )
            return (
              <button
                key={item.id}
                type="button"
                className={`timeline-item ${done || delivered ? 'is-done' : ''} ${current || selected ? 'is-now' : ''}`}
                onClick={() => {
                  if (reached) setReportStage(i)
                  else navigate(`${base}/etapas/${item.id}`)
                }}
              >
                <span>{item.code}</span>
                <strong>{item.name}</strong>
                <em>
                  {delivered || (done && i < product.stageIndex)
                    ? 'Completada'
                    : current
                      ? 'En proceso'
                      : 'Pendiente'}
                  {hasClientUpdate ? ' · Con avance' : ''}
                </em>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-steel">
          Pulsa una etapa ya alcanzada para cargar sus observaciones y fotos de cliente.
        </p>
      </section>

      <section className="admin-card">
        <h2>Eventos</h2>
        <ul className="mt-4 grid gap-2">
          {[...(product.events || [])].reverse().map((ev: any, i: number) => (
            <li key={i} className="border-b border-line py-3 text-sm">
              <strong>{ev.stageName}</strong>
              <span className="ml-2 text-steel">{ev.note}</span>
              <div className="text-xs text-steel">
                {new Date(ev.at).toLocaleString('es-CO')} · {ev.by}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {maintenances.length > 0 && (
        <section className="admin-card">
          <h2>Mantenimientos</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {maintenances.map((m) => (
              <li key={m._id}>
                {new Date(m.scheduledAt).toLocaleDateString('es-CO')} · cada {m.intervalMonths} meses ·{' '}
                {m.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal open={askMaint} title="Agendar mantenimiento periódico" onClose={() => setAskMaint(false)}>
        <p className="mt-3 text-sm text-steel">
          El producto llega a instalación / entrega. ¿En cuántos meses se agenda el mantenimiento?
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {[3, 6, 10].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ${months === n ? 'btn-red' : 'btn-ghost'}`}
              onClick={() => {
                setMonths(n)
                setCustom('')
              }}
            >
              {n} meses
            </button>
          ))}
        </div>
        <label className="mt-4 grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Otro intervalo (meses)
          <input
            className="field"
            type="number"
            min={1}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-red mt-5 w-full"
          onClick={() => move('next', Number(custom || months))}
        >
          Entregar e agendar
        </button>
      </Modal>
    </div>
  )
}
