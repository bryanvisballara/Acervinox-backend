import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClientAccountCard } from '../../components/ClientAccountCard'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'

type Photo = { src: string; stageIndex: number; stageName?: string }
type EventRow = { at: string; stageIndex: number; stageName: string; note: string }

export function ClientTrackPage() {
  const { code } = useParams()
  const [product, setProduct] = useState<any>(null)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState(0)

  useEffect(() => {
    setError('')
    setProduct(null)
    setPhoto(0)
    if (!code) return
    api(`/api/portal/track/${encodeURIComponent(code)}`)
      .then((d) => {
        setProduct(d.product)
        if (window.location.hash === '#cuenta') {
          window.setTimeout(() => document.getElementById('cuenta')?.scrollIntoView({ behavior: 'smooth' }), 80)
        }
      })
      .catch((err) => setError(err.message))
  }, [code])

  const photos: Photo[] = product?.photos || []
  const events: EventRow[] = product?.events || []
  const current = STAGES[product?.stageIndex] || product?.stage
  const delivered = product?.status === 'delivered'

  const currentReport = useMemo(
    () => (product?.stageReports || []).find((r: any) => r.stageIndex === product?.stageIndex),
    [product],
  )

  if (error) {
    return (
      <div className="capp-page">
        <Link to="/portal" className="capp-back">
          ← Volver a guías
        </Link>
        <p className="mt-6 text-sm text-brand">{error}</p>
      </div>
    )
  }

  if (!product) {
    return <div className="capp-page text-steel">Buscando guía…</div>
  }

  return (
    <div className="capp-page">
      <Link to="/portal" className="capp-back">
        ← Volver a guías
      </Link>

      <article className="capp-card">
        <h1 className="capp-product">{product.name}</h1>
        <p className="capp-meta">GUÍA {product.tracking}</p>
        <p className="capp-meta">CLIENTE: {product.client?.name || '—'}</p>
        <div className="capp-specs">
          <div>
            <span>Acero</span>
            <strong>{product.steelType || '—'}</strong>
          </div>
          <div>
            <span>Calibre</span>
            <strong>{product.gauge || '—'}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong>
              {current?.code} · {current?.name}
            </strong>
          </div>
          <div>
            <span>Entrega</span>
            <strong>{delivered ? 'Completado' : 'En proceso'}</strong>
          </div>
        </div>
      </article>

      <ClientAccountCard product={product} onPaid={setProduct} />

      {currentReport?.observations && (
        <article className="capp-card">
          <p className="capp-kicker">{current?.code} · En curso</p>
          <p className="text-sm text-steel">{currentReport.observations}</p>
        </article>
      )}

      <section className="capp-card">
        <p className="capp-kicker">Ruta del pedido</p>
        <h2>Etapas del proceso</h2>
        <p className="capp-copy">
          Cada punto muestra si la etapa ya se completó, si está en curso o si sigue pendiente.
        </p>
        <ol className="capp-steps">
          {STAGES.map((item, i) => {
            const done = i < product.stageIndex || delivered
            const currentStep = i === product.stageIndex && !delivered
            const report = (product.stageReports || []).find((r: any) => r.stageIndex === i)
            return (
              <li
                key={item.id}
                className={done ? 'is-done' : currentStep ? 'is-now' : 'is-wait'}
              >
                <span>{item.code}</span>
                <strong>{item.name}</strong>
                <em>{done ? 'Completado' : currentStep ? 'En curso' : 'Pendiente'}</em>
                {report?.observations && <p>{report.observations}</p>}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="capp-card">
        <p className="capp-kicker">Historial</p>
        <h2>Eventos del pedido</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Etapa</th>
                <th>Título</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">
                    Aún no hay eventos publicados.
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => (
                  <tr key={`${ev.at}-${i}`}>
                    <td className="whitespace-nowrap">
                      {new Date(ev.at).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      {STAGES[ev.stageIndex]?.code || ''} · {ev.stageName}
                    </td>
                    <td>{ev.note || 'Actualización de etapa'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="capp-card">
        <p className="capp-kicker">Archivos</p>
        <h2>Fotos y documentos</h2>
        <p className="capp-copy">Fotos del avance subidas desde el portal administrativo.</p>
        {photos.length === 0 ? (
          <p className="mt-3 text-sm text-steel">Todavía no hay fotos para esta guía.</p>
        ) : (
          <div className="capp-gallery">
            <img src={photos[photo]?.src} alt="" />
            <p>
              {STAGES[photos[photo]?.stageIndex]?.code} · {photos[photo]?.stageName}
            </p>
            {photos.length > 1 && (
              <div className="capp-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === photo ? 'is-on' : ''}
                    aria-label={`Foto ${i + 1}`}
                    onClick={() => setPhoto(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
