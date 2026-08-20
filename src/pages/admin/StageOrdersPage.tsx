import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'
import { useStaffBase } from '../../lib/staff'
import { ProductTable } from './AdminDashboard'

export function StageOrdersPage() {
  const { stageId } = useParams()
  const navigate = useNavigate()
  const base = useStaffBase()
  const index = STAGES.findIndex((s) => s.id === stageId)
  const stage = STAGES[index]
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (index < 0) return
    api(`/api/products?stage=${index}`)
      .then((data) => setRows(data.products))
      .catch((err) => setError(err.message))
  }, [index])

  if (!stage) {
    return (
      <div className="admin-page">
        <p>Etapa no encontrada.</p>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => navigate(base)}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Etapas de fabricación</p>
      <h1 className="font-display text-4xl font-bold">
        Pedidos en estado: {stage.name}
      </h1>
      <p className="mt-2 text-steel">Listado filtrado por la etapa actual de tracking.</p>
      <div className="admin-metrics mt-8">
        <article>
          <span>Total en estado</span>
          <strong>{rows.length}</strong>
          <p>Productos en {stage.code}.</p>
        </article>
        <article>
          <span>Estado consultado</span>
          <strong className="!text-2xl">{stage.name}</strong>
          <p>{stage.code}</p>
        </article>
      </div>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Pedidos en este estado</h2>
            <p>{rows.length} pedido(s)</p>
          </div>
          <Link to={base} className="btn btn-ghost">
            Todas las etapas
          </Link>
        </div>
        {error && <p className="text-sm text-brand">{error}</p>}
        <ProductTable rows={rows} />
      </section>
    </div>
  )
}
