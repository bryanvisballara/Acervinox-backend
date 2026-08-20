import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { VisitCalendar } from '../../components/VisitCalendar'
import { VisitModal, type VisitRecord } from '../../components/VisitModal'
import type { AdminClient } from '../../components/ClientModal'
import { api } from '../../lib/api'
import { monthLabel, occurrenceInMonth } from '../../lib/maintenance'

function statusLabel(status: string) {
  if (status === 'done') return 'Hecho'
  if (status === 'cancelled') return 'Cancelado'
  return 'Programado'
}

function followLabel(followUp?: string) {
  if (followUp === 'contacted') return 'Cliente contactado'
  if (followUp === 'visit') return 'Visita agendada'
  if (followUp === 'rescheduled') return 'Reagendado'
  return ''
}

function clientOf(m: any): AdminClient | Record<string, string> {
  return m.client || m.product?.client || {}
}

export function MaintenancesPage() {
  const now = new Date()
  const [rows, setRows] = useState<any[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [scope, setScope] = useState<'month' | 'all'>('month')
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const [visitOpen, setVisitOpen] = useState(false)
  const [visitPreset, setVisitPreset] = useState<Parameters<typeof VisitModal>[0]['preset']>()
  const [reschedule, setReschedule] = useState<any>(null)
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const loadMaint = () => api('/api/maintenances').then((d) => setRows(d.maintenances || []))
  const loadVisits = () => {
    const from = new Date(calYear, calMonth, 1)
    const to = new Date(calYear, calMonth + 1, 0, 23, 59, 59)
    return api(`/api/visits?from=${from.toISOString()}&to=${to.toISOString()}`).then((d) =>
      setVisits(d.visits || []),
    )
  }

  useEffect(() => {
    loadMaint().catch((err) => setError(err.message))
    api('/api/clients')
      .then((d) => setClients(d.clients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadVisits().catch((err) => setError(err.message))
  }, [calYear, calMonth])

  const thisMonth = () => {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setScope('month')
  }

  const nextMonth = () => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setScope('month')
  }

  const visitsRows = useMemo(() => {
    const list = rows.flatMap((m) => {
      if (scope === 'all') {
        return [{ key: m._id, date: new Date(m.scheduledAt), maintenance: m }]
      }
      if (m.status === 'cancelled') return []
      const date = occurrenceInMonth(m.scheduledAt, m.intervalMonths, year, month)
      if (!date) return []
      return [{ key: `${m._id}-${date.toISOString()}`, date, maintenance: m }]
    })
    return list.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [rows, scope, year, month])

  const filtered = useMemo(
    () =>
      visitsRows.filter((row) => {
        const m = row.maintenance
        const c = clientOf(m)
        const hay = `${m.product?.name || ''} ${c.name || ''} ${c.email || ''} ${c.phone || ''} ${m.product?.tracking || ''}`.toLowerCase()
        if (q && !hay.includes(q.toLowerCase())) return false
        if (status && m.status !== status) return false
        return true
      }),
    [visitsRows, q, status],
  )

  const byInterval = useMemo(() => {
    const map = new Map<number, number>()
    for (const row of filtered) {
      const n = Number(row.maintenance.intervalMonths) || 0
      map.set(n, (map.get(n) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [filtered])

  const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`
  const title = scope === 'month' ? monthLabel(year, month) : 'Todos los programados'
  const uniqueClients = new Set(filtered.map((row) => clientOf(row.maintenance)._id || clientOf(row.maintenance).name)).size

  const upsertMaint = (next: any) => {
    setRows((prev) => prev.map((m) => (m._id === next._id ? next : m)))
  }

  const patchFollow = async (id: string, followUp: string, extra: Record<string, unknown> = {}) => {
    setError('')
    setOk('')
    const data = await api(`/api/maintenances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ followUp, ...extra }),
    })
    upsertMaint(data.maintenance)
  }

  const onAction = async (row: { date: Date; maintenance: any }, action: string) => {
    const m = row.maintenance
    const c = clientOf(m)
    try {
      if (action === 'visit') {
        setVisitPreset({
          clientId: c._id,
          productId: m.product?._id,
          maintenanceId: m._id,
          title: `Mantenimiento · ${m.product?.name || c.name || ''}`.trim(),
          at: new Date(row.date.getFullYear(), row.date.getMonth(), row.date.getDate(), 9, 0),
        })
        setVisitOpen(true)
        return
      }
      if (action === 'contacted') {
        await patchFollow(m._id, 'contacted')
        setOk(`Marcado: cliente contactado (${c.name || 'cliente'}).`)
        return
      }
      if (action === 'reschedule') {
        setReschedule(m)
        setRescheduleAt(row.date.toISOString().slice(0, 10))
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const saveReschedule = async () => {
    if (!reschedule || busy) return
    setBusy(true)
    setError('')
    try {
      await patchFollow(reschedule._id, 'rescheduled', { scheduledAt: rescheduleAt })
      setOk('Mantenimiento reagendado.')
      setReschedule(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Gestión</p>
      <h1 className="font-display text-4xl font-bold">Mantenimientos programados</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Elige un mes y el sistema calcula las visitas según cada intervalo. Desde la tabla haces
        seguimiento o agendás una visita al cliente.
      </p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      <div className="admin-metrics mt-6">
        <article>
          <span>{scope === 'month' ? `A realizar en ${title}` : 'Registros'}</span>
          <strong>{filtered.length}</strong>
          <p>
            {scope === 'month'
              ? 'Visitas que caen en este mes según el intervalo.'
              : 'Fechas ancla de cada contrato.'}
          </p>
        </article>
        <article>
          <span>Clientes</span>
          <strong>{uniqueClients}</strong>
          <p>Con mantenimiento en este filtro.</p>
        </article>
        <article>
          <span>Por intervalo</span>
          <strong className="!text-2xl">
            {byInterval.length === 0 ? '—' : byInterval.map(([n, count]) => `${count}×${n}m`).join(' · ')}
          </strong>
          <p>Cantidad de visitas por cada X meses.</p>
        </article>
      </div>

      <section className="admin-card">
        <div className="admin-filters">
          <input className="field" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="scheduled">Programado</option>
            <option value="done">Hecho</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <input
            className="field"
            type="month"
            value={monthValue}
            onChange={(e) => {
              const [y, mo] = e.target.value.split('-').map(Number)
              if (!y || !mo) return
              setYear(y)
              setMonth(mo - 1)
              setScope('month')
            }}
          />
          <button
            type="button"
            className={`btn ${scope === 'month' && year === now.getFullYear() && month === now.getMonth() ? 'btn-red' : 'btn-ghost'}`}
            onClick={thisMonth}
          >
            Este mes
          </button>
          <button
            type="button"
            className={`btn ${scope === 'month' && year === (now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()) && month === (now.getMonth() + 1) % 12 ? 'btn-red' : 'btn-ghost'}`}
            onClick={nextMonth}
          >
            Próximo mes
          </button>
          <button
            type="button"
            className={`btn ${scope === 'all' ? 'btn-red' : 'btn-ghost'}`}
            onClick={() => setScope('all')}
          >
            Todos
          </button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Intervalo</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    {scope === 'month'
                      ? `No hay mantenimientos para ${title}.`
                      : 'No hay mantenimientos con ese filtro.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const m = row.maintenance
                  const c = clientOf(m)
                  return (
                    <tr key={row.key}>
                      <td className="whitespace-nowrap">{row.date.toLocaleDateString('es-CO')}</td>
                      <td>{m.product?.name || '—'}</td>
                      <td>
                        {c.name || '—'}
                        {followLabel(m.followUp) && (
                          <div className="text-xs text-steel">{followLabel(m.followUp)}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{c.phone || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>cada {m.intervalMonths} meses</td>
                      <td>{statusLabel(m.status)}</td>
                      <td>
                        <select
                          className="field min-w-[170px]"
                          defaultValue=""
                          onChange={(e) => {
                            const action = e.target.value
                            e.currentTarget.value = ''
                            if (action) onAction(row, action)
                          }}
                        >
                          <option value="">Seguimiento</option>
                          <option value="visit">Agendar visita</option>
                          <option value="contacted">Cliente contactado</option>
                          <option value="reschedule">Reagendar mantenimiento</option>
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Visitas</h2>
            <p>
              Calendario de visitas agendadas. Puedes añadir una visita directa, sin pasar por un
              mantenimiento.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-red"
            onClick={() => {
              setVisitPreset({ at: selectedDay })
              setVisitOpen(true)
            }}
          >
            Añadir visita
          </button>
        </div>
        <VisitCalendar
          year={calYear}
          month={calMonth}
          visits={visits}
          selected={selectedDay}
          onMonth={(y, m) => {
            setCalYear(y)
            setCalMonth(m)
            setSelectedDay(new Date(y, m, 1))
          }}
          onSelect={setSelectedDay}
          onAdd={(date) => {
            setVisitPreset({ at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0) })
            setVisitOpen(true)
          }}
          onRemove={async (id) => {
            try {
              await api(`/api/visits/${id}`, { method: 'DELETE' })
              setVisits((prev) => prev.filter((v) => v._id !== id))
            } catch (err: any) {
              setError(err.message)
            }
          }}
        />
      </section>

      <VisitModal
        open={visitOpen}
        clients={clients}
        preset={visitPreset}
        onClose={() => setVisitOpen(false)}
        onSaved={(visit) => {
          const at = new Date(visit.at)
          if (at.getFullYear() === calYear && at.getMonth() === calMonth) {
            setVisits((prev) => [...prev.filter((v) => v._id !== visit._id), visit])
          }
          if (visitPreset?.maintenanceId) {
            patchFollow(visitPreset.maintenanceId, 'visit').catch((err) => setError(err.message))
          }
          setOk('Visita agendada.')
          setSelectedDay(new Date(at.getFullYear(), at.getMonth(), at.getDate()))
        }}
      />

      <Modal open={Boolean(reschedule)} title="Reagendar mantenimiento" onClose={() => setReschedule(null)}>
        <p className="mt-4 text-sm text-steel">
          Nueva fecha para {reschedule?.product?.name || 'este mantenimiento'}.
        </p>
        <label className="mt-4 grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Fecha
          <input
            className="field"
            type="date"
            value={rescheduleAt}
            onChange={(e) => setRescheduleAt(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-red mt-5" disabled={busy} onClick={saveReschedule}>
          {busy ? 'Guardando…' : 'Guardar fecha'}
        </button>
      </Modal>
    </div>
  )
}
