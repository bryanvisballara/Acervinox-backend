import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { monthLabel } from '../lib/maintenance'
import type { VisitRecord } from './VisitModal'

const WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function cellsFor(year: number, month: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

export function VisitCalendar({
  year,
  month,
  visits,
  selected,
  onMonth,
  onSelect,
  onAdd,
  onRemove,
}: {
  year: number
  month: number
  visits: VisitRecord[]
  selected: Date
  onMonth: (year: number, month: number) => void
  onSelect: (date: Date) => void
  onAdd: (date: Date) => void
  onRemove: (id: string) => void
}) {
  const byDay = new Map<string, VisitRecord[]>()
  for (const visit of visits) {
    const d = new Date(visit.at)
    const key = dayKey(d)
    byDay.set(key, [...(byDay.get(key) || []), visit])
  }
  const selectedVisits = (byDay.get(dayKey(selected)) || []).sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
  const today = new Date()

  return (
    <div className="visit-layout">
      <div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <strong className="font-display text-xl">{monthLabel(year, month)}</strong>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)}
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
            const isToday = dayKey(today) === key
            return (
              <button
                key={key}
                type="button"
                className={`cal-day ${isSel ? 'is-sel' : ''} ${isToday ? 'is-today' : ''} ${count ? 'has-visit' : ''}`}
                onClick={() => onSelect(date)}
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
            <h2>{selected.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <p>{selectedVisits.length ? `${selectedVisits.length} visita(s)` : 'Sin visitas este día.'}</p>
          </div>
          <button type="button" className="btn btn-red" onClick={() => onAdd(selected)}>
            <Plus size={16} /> Añadir visita
          </button>
        </div>
        <ul className="mt-4 grid gap-2">
          {selectedVisits.map((v) => (
            <li key={v._id} className="visit-row">
              <div>
                <strong>
                  {new Date(v.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {v.client?.name || 'Cliente'}
                </strong>
                <em>
                  {v.product?.name || v.title || 'Visita'}
                  {v.source === 'client' ? ' · App cliente' : ''}
                  {v.notes ? ` · ${v.notes}` : ''}
                </em>
              </div>
              <button type="button" className="btn btn-ghost !px-3 !py-2 text-brand" onClick={() => onRemove(v._id)}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
