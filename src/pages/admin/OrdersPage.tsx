import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ClientModal, type AdminClient } from '../../components/ClientModal'
import { OrderModal } from '../../components/OrderModal'
import { STAGES } from '../../data/stages'
import { api } from '../../lib/api'
import { ProductTable } from './AdminDashboard'

export function OrdersPage() {
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('')
  const [orderModal, setOrderModal] = useState(false)
  const [clientModal, setClientModal] = useState(false)

  const load = async () => {
    const [p, c] = await Promise.all([api('/api/products'), api('/api/clients')])
    setRows(p.products)
    setClients(c.clients)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter((p: any) => {
        const hay = `${p.name} ${p.tracking} ${p.client?.name || ''}`.toLowerCase()
        if (q && !hay.includes(q.toLowerCase())) return false
        if (stage !== '' && p.stageIndex !== Number(stage)) return false
        return true
      }),
    [rows, q, stage],
  )

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Gestión</p>
          <h1 className="font-display text-4xl font-bold">Pedidos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setClientModal(true)}>
            <Plus size={16} /> Cliente
          </button>
          <button type="button" className="btn btn-red" onClick={() => setOrderModal(true)}>
            <Plus size={16} /> Crear pedido
          </button>
        </div>
      </div>
      <section className="admin-card mt-6">
        <div className="admin-filters">
          <input className="field" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Todas las etapas</option>
            {STAGES.map((s, i) => (
              <option key={s.id} value={i}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>
        <ProductTable rows={filtered} />
      </section>
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
    </div>
  )
}
