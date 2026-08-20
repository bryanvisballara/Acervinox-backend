import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClientModal, type AdminClient } from '../../components/ClientModal'
import { OrderModal } from '../../components/OrderModal'
import { useAuth } from '../../context/AuthContext'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'
import { useStaffBase } from '../../lib/staff'

type Product = {
  _id: string
  tracking: string
  name: string
  steelType: string
  gauge: string
  stageIndex: number
  status: string
  client?: AdminClient
  items?: { name: string }[]
  updatedAt?: string
}

type FabricationEvent = {
  at: string
  tracking: string
  stageCode: string
  title: string
  product: string
  client: string
  productId: string
}

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const base = useStaffBase()
  const workshop = base === '/workshop'
  const first = user?.name?.split(' ')[0] || (workshop ? 'Taller' : 'Admin')
  const [summary, setSummary] = useState<any>(null)
  const [clients, setClients] = useState<AdminClient[]>([])
  const [clientModal, setClientModal] = useState(false)
  const [orderModal, setOrderModal] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const s = await api('/api/dashboard/summary')
    setSummary(s)
    if (!workshop) {
      const c = await api('/api/clients')
      setClients(c.clients)
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [workshop])

  const stats = summary?.stats || {}
  const events: FabricationEvent[] = summary?.events || []

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Fabricación</p>
          <h1 className="font-display text-4xl font-bold">Etapas de fabricación</h1>
          <p className="mt-2 max-w-2xl text-steel">
            {workshop
              ? `Hola, ${first}. Entra a cada etapa, documenta el avance y gestiona los mantenimientos.`
              : `Hola, ${first}. Crea clientes y pedidos, entra a cada etapa y sigue la actividad reciente.`}
          </p>
        </div>
        {!workshop && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setClientModal(true)}>
              <Plus size={16} /> Cliente
            </button>
            <button type="button" className="btn btn-red" onClick={() => setOrderModal(true)}>
              <Plus size={16} /> Crear pedido
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <section className="admin-metrics">
        <article>
          <span>Total pedidos</span>
          <strong>{stats.products || 0}</strong>
          <p>Pedidos en fabricación o ya entregados.</p>
        </article>
        <article>
          <span>En proceso</span>
          <strong>{stats.inProgress || 0}</strong>
          <p>Pedidos que todavía recorren las etapas.</p>
        </article>
        <article>
          <span>Entregados / instalados</span>
          <strong>{stats.delivered || 0}</strong>
          <p>Ciclo cerrado. Pasan a mantenimiento periódico.</p>
        </article>
      </section>

      <section className="admin-card" id="etapas">
        <div className="admin-card-head">
          <div>
            <h2>Etapas de fabricación</h2>
            <p>Cada recuadro abre los pedidos que están en esa etapa.</p>
          </div>
        </div>
        <div className="stage-grid">
          {(summary?.stageCounts || STAGES.map((s, i) => ({ ...s, index: i, count: 0 }))).map(
            (stage: any) => (
              <button
                key={stage.id}
                type="button"
                className="stage-btn"
                onClick={() => navigate(`${base}/etapas/${stage.id}`)}
              >
                <span>{stage.code}</span>
                <strong>{stage.name}</strong>
                <b>{stage.count}</b>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Últimos eventos generales</h2>
            <p>Actividad reciente de fabricación</p>
          </div>
        </div>
        <EventsTable rows={events} />
      </section>

      {!workshop && (
        <>
          <ClientModal
            open={clientModal}
            onClose={() => setClientModal(false)}
            onCreated={() => load()}
          />
          <OrderModal
            open={orderModal}
            clients={clients}
            onClose={() => setOrderModal(false)}
            onCreated={() => load()}
          />
        </>
      )}
    </div>
  )
}

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function EventsTable({ rows }: { rows: FabricationEvent[] }) {
  const navigate = useNavigate()
  const base = useStaffBase()
  return (
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
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                Aún no hay actividad de fabricación.
              </td>
            </tr>
          ) : (
            rows.map((ev, i) => (
              <tr
                key={`${ev.productId}-${ev.at}-${i}`}
                className="row-link"
                onClick={() => navigate(`${base}/pedidos/${ev.productId}`)}
              >
                <td className="whitespace-nowrap">{formatEventDate(ev.at)}</td>
                <td>
                  <span className="track-chip">
                    <span className="track-id">{ev.tracking}</span>
                    <span className="track-badge">ACERO</span>
                  </span>
                </td>
                <td>
                  <strong>{ev.stageCode}</strong>
                </td>
                <td>{ev.title}</td>
                <td>{ev.product}</td>
                <td>{ev.client}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ProductTable({ rows }: { rows: Product[] }) {
  const navigate = useNavigate()
  const base = useStaffBase()
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tracking</th>
            <th>Productos</th>
            <th>Cliente</th>
            <th>Acero</th>
            <th>Calibre</th>
            <th>Etapa</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                No hay pedidos en este listado.
              </td>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p._id} className="row-link" onClick={() => navigate(`${base}/pedidos/${p._id}`)}>
                <td>
                  <Link to={`${base}/pedidos/${p._id}`} className="font-semibold text-brand no-underline">
                    {p.tracking}
                  </Link>
                </td>
                <td>
                  {(p.items || []).length
                    ? p.items!.map((item) => item.name).join(', ')
                    : p.name}
                </td>
                <td>{p.client?.name}</td>
                <td>{p.steelType || '—'}</td>
                <td>{p.gauge || '—'}</td>
                <td>
                  {STAGES[p.stageIndex]?.code} · {STAGES[p.stageIndex]?.name}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
