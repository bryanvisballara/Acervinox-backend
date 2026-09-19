import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { monthLabel } from '../../lib/maintenance'

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type Row = {
  _id: string
  scheduledAt: string
  status: string
  intervalMonths: number
  notes?: string
  client?: { _id: string; name: string; phone?: string }
  product?: { _id: string; name: string; tracking: string; client?: { name: string } }
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function cellsFor(year: number, month: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

function clientName(m: Row) {
  return m.client?.name || m.product?.client?.name || 'Cliente'
}

export function MttoAppointmentsPage() {
  const now = new Date()
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()))

  useEffect(() => {
    api('/api/maintenances')
      .then((d) => {
        const next = (d.maintenances || []) as Row[]
        setRows(next)
        const upcoming = next
          .filter((m) => m.status === 'scheduled')
          .map((m) => new Date(m.scheduledAt))
          .filter((dt) => !Number.isNaN(dt.getTime()) && dt.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
          .sort((a, b) => a.getTime() - b.getTime())[0]
        if (upcoming) {
          setYear(upcoming.getFullYear())
          setMonth(upcoming.getMonth())
          setSelected(new Date(upcoming.getFullYear(), upcoming.getMonth(), upcoming.getDate()))
        }
      })
      .catch((err) => setError(err.message))
  }, [])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows
      .filter((m) => m.status === 'scheduled')
      .filter((m) => {
        if (!needle) return true
        return `${m.product?.name || ''} ${m.product?.tracking || ''} ${clientName(m)}`.toLowerCase().includes(needle)
      })
  }, [q, rows])

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const m of list) {
      const d = new Date(m.scheduledAt)
      const key = dayKey(d)
      map.set(key, [...(map.get(key) || []), m])
    }
    return map
  }, [list])

  const dayRows = (byDay.get(dayKey(selected)) || []).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )

  const goMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelected(new Date(nextYear, nextMonth, 1))
  }

  const monthCount = list.filter((m) => {
    const d = new Date(m.scheduledAt)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  return (
    <div className="admin-page">
      <p className="admin-kicker">Portal de mantenimientos</p>
      <h1 className="font-display text-4xl font-bold">Citas</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Elige el día en el calendario. Ahí ves las visitas y llenas el acta.
      </p>
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Calendario de visitas</h2>
            <p>
              {monthCount} en {monthLabel(year, month)}
              {list.length !== monthCount ? ` · ${list.length} en total` : ''}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="field" placeholder="Buscar cliente o equipo" value={q} onChange={(e) => setQ(e.target.value)} />
            <Link className="btn btn-ghost" to="/mtto/actas/nueva">
              Acta sin cita
            </Link>
          </div>
        </div>

        <div className="visit-layout">
          <div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => goMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong className="font-display text-xl">{monthLabel(year, month)}</strong>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => goMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="cal-week">
              {WEEK.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {cellsFor(year, month).map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const date = new Date(year, month, day)
                const key = dayKey(date)
                const count = byDay.get(key)?.length || 0
                const isSel = dayKey(selected) === key
                const isToday = dayKey(now) === key
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cal-day ${isSel ? 'is-sel' : ''} ${isToday ? 'is-today' : ''} ${count ? 'has-visit' : ''}`}
                    onClick={() => setSelected(date)}
                  >
                    <b>{day}</b>
                    {count > 0 && <i>{count}</i>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="admin-card-head">
              <div>
                <h2>
                  {selected.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <p>{dayRows.length ? `${dayRows.length} visita(s)` : 'Sin visitas este día.'}</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2">
              {dayRows.map((m) => (
                <li key={m._id} className="visit-row">
                  <div>
                    <strong>
                      {new Date(m.scheduledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {clientName(m)}
                    </strong>
                    <em>
                      {m.product?.name || 'Equipo'}
                      {m.product?.tracking ? ` · ${m.product.tracking}` : ''}
                    </em>
                  </div>
                  <Link className="btn btn-red" to={`/mtto/actas/nueva?maintenance=${m._id}`}>
                    Llenar acta
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
