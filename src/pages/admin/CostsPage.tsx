import { FileDown, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { NumberField } from '../../components/NumberField'
import { api, openPrintDocument } from '../../lib/api'
import { jobCostHtml } from '../../lib/costPrint'
import { cop } from '../../lib/image'

type Category = { id: string; label: string }
type CostItem = {
  _id: string
  category: string
  name: string
  variant: string
  unit: string
  price: number
  notes?: string
}
type CostLine = {
  key: string
  item?: string
  category: string
  name: string
  variant: string
  unit: string
  qty: number
  price: number
}
type JobCost = {
  _id: string
  number: string
  name: string
  client?: { _id: string; name: string } | string | null
  product?: { _id: string; name: string; tracking: string } | string | null
  lines: { item?: string; category: string; name: string; variant: string; unit: string; qty: number; price: number; total: number }[]
  notes?: string
  materialTotal: number
  laborTotal: number
  total: number
  sale50: number
  resale70: number
  updatedAt: string
}
type ClientRow = { _id: string; name: string }
type OrderRow = { _id: string; name: string; tracking: string; client?: { _id: string } | string }

const UNITS: Record<string, string> = { und: 'und', m: 'm', m2: 'm²', dia: 'día' }

const SECTIONS = [
  { id: 'mp', label: 'Materia prima' },
  { id: 'inst', label: 'Costo instalación' },
] as const

const SHEETS = [
  { section: 'mp', id: 'acero', label: 'Acero', categories: ['acero_304', 'acero_430', 'tubos'] },
  { section: 'mp', id: 'fabricacion', label: 'Tiempo de fabricación', categories: ['fabricacion'] },
  { section: 'mp', id: 'abrasivos', label: 'Abrasivos', categories: ['abrasivos'] },
  { section: 'mp', id: 'accesorios', label: 'Accesorios', categories: ['accesorios', 'quemadores'] },
  { section: 'mp', id: 'otros', label: 'Otros', categories: ['otros'] },
  { section: 'inst', id: 'inst_fab', label: 'Tiempo de fabricación', categories: ['inst_fabricacion'] },
  { section: 'inst', id: 'inst_abr', label: 'Abrasivos', categories: ['inst_abrasivos'] },
  { section: 'inst', id: 'inst_otros', label: 'Otros', categories: ['inst_otros'] },
] as const

const LABOR_CATS = ['fabricacion', 'inst_fabricacion']

type SectionId = (typeof SECTIONS)[number]['id']
type SheetId = (typeof SHEETS)[number]['id']
type JobTab = SheetId | 'total' | 'saved'

function sheetsOf(section: SectionId) {
  return SHEETS.filter((s) => s.section === section)
}

function firstSheet(section: SectionId): SheetId {
  return sheetsOf(section)[0].id
}

function catsOf(id: string) {
  return [...(SHEETS.find((s) => s.id === id)?.categories || [])]
}

function sheetOf(id: string) {
  return SHEETS.find((s) => s.id === id)
}

function lineSection(category: string): SectionId {
  return SHEETS.find((s) => (s.categories as readonly string[]).includes(category))?.section || (String(category).startsWith('inst_') ? 'inst' : 'mp')
}

function isOtherTab(id: string) {
  return id === 'otros' || id === 'inst_otros'
}

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

function lineTotal(line: CostLine) {
  return Math.round((Number(line.qty) || 0) * (Number(line.price) || 0))
}

function idOf(ref: { _id: string } | string | null | undefined) {
  if (!ref) return ''
  return typeof ref === 'string' ? ref : ref._id
}

function SheetTabs({
  sheets,
  value,
  onChange,
  counts,
  label,
}: {
  sheets: readonly { id: SheetId; label: string }[]
  value: SheetId
  onChange: (id: SheetId) => void
  counts?: Partial<Record<SheetId, number>>
  label: string
}) {
  return (
    <div className="cost-tabs" role="tablist" aria-label={label}>
      {sheets.map((sheet) => {
        const n = counts?.[sheet.id] || 0
        return (
          <button
            key={sheet.id}
            type="button"
            role="tab"
            aria-selected={value === sheet.id}
            className={`cost-tab ${value === sheet.id ? 'is-on' : ''}`}
            onClick={() => onChange(sheet.id)}
          >
            {sheet.label}
            {n > 0 ? <span>{n}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function CostsPage() {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'prices' | 'jobs'>('prices')
  const [section, setSection] = useState<SectionId>('mp')
  const [items, setItems] = useState<CostItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [q, setQ] = useState('')
  const [priceSheet, setPriceSheet] = useState<SheetId>('acero')
  const [jobTab, setJobTab] = useState<JobTab>('acero')
  const [pickQuery, setPickQuery] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherPrice, setOtherPrice] = useState(0)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [jobs, setJobs] = useState<JobCost[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [editing, setEditing] = useState<JobCost | null>(null)
  const [draft, setDraft] = useState({ name: '', client: '', product: '', notes: '' })
  const [lines, setLines] = useState<CostLine[]>([])
  const [busy, setBusy] = useState(false)
  const [jobStarted, setJobStarted] = useState(false)

  const loadItems = async () => {
    const data = await api('/api/costs/items')
    setItems(data.items || [])
    setCategories(data.categories || [])
  }

  const loadJobs = async () => {
    const data = await api('/api/costs/jobs')
    setJobs(data.jobs || [])
  }

  useEffect(() => {
    Promise.all([loadItems(), loadJobs(), api('/api/clients'), api('/api/products')])
      .then(([, , c, p]) => {
        setClients(c.clients || [])
        setOrders(p.products || [])
        const productId = params.get('product')
        if (productId && !params.get('job')) {
          const order = (p.products || []).find((o: OrderRow) => o._id === productId)
          setDraft({
            name: order?.name || '',
            client: order ? idOf(order.client) : '',
            product: productId,
            notes: '',
          })
          setTab('jobs')
          setJobStarted(true)
        }
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const jobId = params.get('job')
    const productId = params.get('product')
    if (jobId || productId) setTab('jobs')
    if (jobId) {
      api(`/api/costs/jobs/${jobId}`)
        .then((data) => openJob(data.job))
        .catch((err) => setError(err.message))
    }
  }, [params])

  const grouped = useMemo(() => {
    const cats = catsOf(priceSheet).length ? catsOf(priceSheet) : categories.map((c) => c.id)
    const needle = q.trim().toLowerCase()
    const map = new Map<string, CostItem[]>()
    for (const item of items) {
      if (!cats.includes(item.category)) continue
      if (needle && !`${item.name} ${item.variant}`.toLowerCase().includes(needle)) continue
      const list = map.get(item.category) || []
      list.push(item)
      map.set(item.category, list)
    }
    return cats
      .filter((id) => map.has(id) || !needle)
      .map((id) => ({ id, label: categories.find((c) => c.id === id)?.label || id, items: map.get(id) || [] }))
      .filter((group) => group.items.length > 0 || !needle)
  }, [items, categories, priceSheet, q])

  const currentSheets = useMemo(() => sheetsOf(section), [section])
  const jobTabs = useMemo(
    () => [...currentSheets, { id: 'total' as const, label: 'Costo total' }],
    [currentSheets],
  )
  const scopedLines = useMemo(() => lines.filter((l) => lineSection(l.category) === section), [lines, section])

  const totals = useMemo(() => {
    const materialTotal = scopedLines.filter((l) => !LABOR_CATS.includes(l.category)).reduce((s, l) => s + lineTotal(l), 0)
    const laborTotal = scopedLines.filter((l) => LABOR_CATS.includes(l.category)).reduce((s, l) => s + lineTotal(l), 0)
    const total = materialTotal + laborTotal
    return { materialTotal, laborTotal, total, sale50: Math.round(total * 1.5), resale70: Math.round(total * 1.7) }
  }, [scopedLines])

  const goSection = (next: SectionId) => {
    setSection(next)
    const first = firstSheet(next)
    setPriceSheet(first)
    if (jobTab === 'total' || sheetOf(jobTab)?.section !== next) {
      setJobTab(first)
    }
    setPickQuery('')
    setPickOpen(false)
  }

  const patchItem = async (id: string, patch: Partial<CostItem>) => {
    setError('')
    try {
      const data = await api(`/api/costs/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      setItems((prev) => prev.map((it) => (it._id === id ? data.item : it)))
      setOk('Precio guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const addItem = async (cat: string) => {
    setError('')
    try {
      const data = await api('/api/costs/items', {
        method: 'POST',
        body: JSON.stringify({ category: cat, name: 'Nuevo ítem', variant: '', unit: 'und', price: 0 }),
      })
      setItems((prev) => [...prev, data.item])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  const removeItem = async (item: CostItem) => {
    if (!window.confirm(`¿Quitar ${item.name} ${item.variant}?`)) return
    await api(`/api/costs/items/${item._id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((it) => it._id !== item._id))
  }

  const openJob = (job: JobCost, nextSection: SectionId = 'mp') => {
    setEditing(job)
    setDraft({
      name: job.name || '',
      client: idOf(job.client),
      product: idOf(job.product),
      notes: job.notes || '',
    })
    setLines(
      (job.lines || []).map((l) => ({
        key: uid(),
        item: l.item ? String(l.item) : undefined,
        category: l.category,
        name: l.name,
        variant: l.variant,
        unit: l.unit,
        qty: l.qty,
        price: l.price,
      })),
    )
    setSection(nextSection)
    setJobTab('total')
    setJobStarted(true)
    setTab('jobs')
  }

  const newJob = () => {
    const productId = params.get('product') || ''
    const order = orders.find((o) => o._id === productId)
    setEditing(null)
    setDraft({
      name: order?.name || '',
      client: order ? idOf(order.client) : '',
      product: productId,
      notes: '',
    })
    setLines([])
    setSection('mp')
    setJobTab('acero')
    setJobStarted(false)
    setTab('jobs')
  }

  const startJob = async () => {
    if (!draft.client) {
      setError('Elige el cliente')
      return
    }
    const name = draft.name.trim()
    if (!name) {
      setError('Escribe el nombre del trabajo')
      return
    }
    setError('')
    setBusy(true)
    try {
      let productId = draft.product
      if (!productId) {
        const data = await api('/api/products', {
          method: 'POST',
          body: JSON.stringify({ clientId: draft.client, name }),
        })
        const created = data.product
        productId = created._id
        setOrders((prev) => [created, ...prev])
        setDraft((d) => ({ ...d, name, product: created._id }))
      } else {
        setDraft((d) => ({ ...d, name }))
      }
      setSection('mp')
      setJobTab('acero')
      setJobStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido')
    } finally {
      setBusy(false)
    }
  }

  const addLine = (item: CostItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.item === item._id)
      if (existing) return prev.map((l) => (l.item === item._id ? { ...l, qty: (l.qty || 0) + 1 } : l))
      return [
        ...prev,
        {
          key: uid(),
          item: item._id,
          category: item.category,
          name: item.name,
          variant: item.variant,
          unit: item.unit,
          qty: 1,
          price: item.price,
        },
      ]
    })
    setPickQuery('')
    setPickOpen(false)
    setError('')
  }

  const addOther = async () => {
    const name = otherName.trim()
    if (!name) {
      setError('Escribe el nombre del ítem')
      return
    }
    setError('')
    const category = section === 'inst' ? 'inst_otros' : 'otros'
    const line: CostLine = { key: uid(), category, name, variant: '', unit: 'und', qty: 1, price: otherPrice }
    try {
      const data = await api('/api/costs/items', {
        method: 'POST',
        body: JSON.stringify({ category, name, variant: '', unit: 'und', price: otherPrice }),
      })
      setItems((prev) => [...prev, data.item])
      setLines((prev) => [...prev, { ...line, item: data.item._id }])
    } catch {
      setLines((prev) => [...prev, line])
    }
    setOtherName('')
    setOtherPrice(0)
  }

  const linesOnTab = useMemo(() => {
    const cats = catsOf(jobTab)
    return lines.filter((l) => {
      if (cats.includes(l.category)) return true
      if (!isOtherTab(jobTab) || lineSection(l.category) !== section) return false
      return !currentSheets.some((s) => !isOtherTab(s.id) && catsOf(s.id).includes(l.category))
    })
  }, [currentSheets, jobTab, lines, section])

  const pickMatches = useMemo(() => {
    const cats = catsOf(jobTab)
    const needle = pickQuery.trim().toLowerCase()
    const label = (id: string) => categories.find((c) => c.id === id)?.label || id
    return items.filter((it) => {
      if (!cats.includes(it.category)) return false
      if (!needle) return true
      return `${it.name} ${it.variant} ${it.unit} ${label(it.category)} ${it.price}`.toLowerCase().includes(needle)
    })
  }, [categories, items, jobTab, pickQuery])

  const sheetCount = (id: SheetId) => {
    const cats = catsOf(id)
    return lines.filter((l) => cats.includes(l.category) && l.qty > 0).length
  }

  const sheetSubtotal = useMemo(() => linesOnTab.reduce((sum, line) => sum + lineTotal(line), 0), [linesOnTab])

  const linesBySheet = useMemo(
    () => currentSheets.map((s) => ({ ...s, lines: lines.filter((l) => catsOf(s.id).includes(l.category)) })).filter((s) => s.lines.length > 0),
    [currentSheets, lines],
  )

  const saveJob = async () => {
    setBusy(true)
    setError('')
    setOk('')
    try {
      const body = {
        name: draft.name,
        client: draft.client || null,
        product: draft.product || null,
        notes: draft.notes,
        lines: lines.map((l) => ({ ...l, total: lineTotal(l) })),
      }
      const data = editing
        ? await api(`/api/costs/jobs/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await api('/api/costs/jobs', { method: 'POST', body: JSON.stringify(body) })
      openJob(data.job, section)
      await loadJobs()
      setOk(`Guardado ${data.job.number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el costo')
    } finally {
      setBusy(false)
    }
  }

  const generatePdf = () => {
    setError('')
    try {
      const clientName = clients.find((c) => c._id === draft.client)?.name || ''
      const order = orders.find((o) => o._id === draft.product)
      openPrintDocument(
        jobCostHtml({
          number: editing?.number,
          name: draft.name || editing?.name || (section === 'inst' ? 'Costo de instalación' : 'Costo de trabajo'),
          clientName,
          orderLabel: order ? `${order.tracking} · ${order.name}` : '',
          groups: linesBySheet,
          totals,
          kind: section,
          origin: window.location.origin,
        }),
        'acervinox-costo',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    }
  }

  const removeJob = async (job: JobCost) => {
    if (!window.confirm(`¿Borrar ${job.number}?`)) return
    await api(`/api/costs/jobs/${job._id}`, { method: 'DELETE' })
    if (editing?._id === job._id) {
      setEditing(null)
      setLines([])
    }
    await loadJobs()
  }

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Costos</p>
          <h1 className="font-display text-4xl font-bold">{section === 'inst' ? 'Costo de instalación' : 'Materia prima'}</h1>
          <p className="mt-2 max-w-2xl text-steel">
            {section === 'inst'
              ? 'Tiempo de fabricación y gastos del Excel de instalación. Agrega ítems por pestaña y mira el total.'
              : 'Estos son los precios del Excel, en listas claras. Se editan acá cuando cambien. Con esos precios armas el costo de un mueble y lo cuelgas en el cliente o el pedido.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`btn ${tab === 'prices' ? 'btn-red' : 'btn-ghost'}`} onClick={() => setTab('prices')}>
            Lista de precios
          </button>
          <button type="button" className={`btn ${tab === 'jobs' ? 'btn-red' : 'btn-ghost'}`} onClick={() => setTab('jobs')}>
            Costo de un trabajo
          </button>
        </div>
      </div>

      {(tab === 'prices' || jobStarted) && (
        <div className="cost-section-tabs" role="tablist" aria-label="Tipo de costo">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              className={`cost-section-tab ${section === item.id ? 'is-on' : ''}`}
              onClick={() => goSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {ok && <p className="cut-ok">{ok}</p>}
      {error && <p className="cut-error">{error}</p>}

      {tab === 'prices' && (
        <>
          <section className="admin-card">
            <SheetTabs sheets={currentSheets} value={priceSheet} onChange={setPriceSheet} label="Listas de precios" />
            <div className="admin-filters">
              <input className="field" placeholder="Buscar en esta lista…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </section>

          {grouped.map((group) => (
            <section key={group.id} className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.items.length} ítems · cambia el precio y pulsa guardar</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => addItem(group.id)}>
                  <Plus size={15} />
                  Ítem
                </button>
              </div>
              <div className="table-wrap">
                <table className="admin-table cut-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Formato / calibre</th>
                      <th>Unidad</th>
                      <th>Precio</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <input className="field" value={item.name} onChange={(e) => setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, name: e.target.value } : it)))} onBlur={(e) => patchItem(item._id, { name: e.target.value })} />
                        </td>
                        <td>
                          <input className="field" value={item.variant} onChange={(e) => setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, variant: e.target.value } : it)))} onBlur={(e) => patchItem(item._id, { variant: e.target.value })} />
                        </td>
                        <td>
                          <select className="field" value={item.unit} onChange={(e) => {
                            const unit = e.target.value
                            setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, unit } : it)))
                            patchItem(item._id, { unit })
                          }}>
                            {Object.entries(UNITS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <NumberField
                            className="field"
                            value={item.price}
                            onChange={(price) => setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, price } : it)))}
                          />
                        </td>
                        <td>
                          <button type="button" className="icon-btn" aria-label="Quitar ítem" onClick={() => removeItem(item)}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="cost-save-hint">
                <button type="button" className="btn btn-ghost" onClick={() => Promise.all(group.items.map((it) => patchItem(it._id, { name: it.name, variant: it.variant, unit: it.unit, price: it.price }))).then(() => setOk('Lista guardada'))}>
                  Guardar esta lista
                </button>
              </p>
            </section>
          ))}

          {grouped.length === 0 && (
            <section className="admin-card">
              <div className="admin-card-head">
                <div>
                  <h2>{SHEETS.find((s) => s.id === priceSheet)?.label}</h2>
                  <p>{q ? 'Nada coincide con esa búsqueda.' : 'Todavía no hay ítems en esta lista.'}</p>
                </div>
                {isOtherTab(priceSheet) && !q && (
                  <button type="button" className="btn btn-ghost" onClick={() => addItem(priceSheet === 'inst_otros' ? 'inst_otros' : 'otros')}>
                    <Plus size={15} />
                    Ítem
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {tab === 'jobs' && !jobStarted && (
        <>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Nuevo costo</h2>
                <p>Elige el cliente y ponle nombre al trabajo. Se abre un pedido nuevo y después sí se agregan los costos.</p>
              </div>
            </div>
            <div className="cut-job-fields">
              <label>
                Cliente
                <select className="field" value={draft.client} onChange={(e) => setDraft((d) => ({ ...d, client: e.target.value, product: '' }))}>
                  <option value="">Elige el cliente</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre del trabajo
                <input className="field" value={draft.name} placeholder="Mueble en acero, estufa 4 puestos…" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </label>
            </div>
            <div className="mt-4">
              <button type="button" className="btn btn-red" disabled={busy} onClick={startJob}>
                Empezar a costear
              </button>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Costos guardados</h2>
                <p>Ábrelos si ya existe el costo de ese trabajo.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Trabajo</th>
                    <th>Pedido</th>
                    <th>Total MP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">
                        Todavía no hay un costo de trabajo.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job._id} className={editing?._id === job._id ? 'is-current' : ''}>
                        <td>{job.number}</td>
                        <td>
                          {job.name || '—'}
                          <div className="text-xs text-steel">{typeof job.client === 'object' ? job.client?.name : ''}</div>
                        </td>
                        <td>{typeof job.product === 'object' ? job.product?.tracking : '—'}</td>
                        <td>{cop(job.total)}</td>
                        <td className="cut-plan-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => openJob(job)}>
                            Abrir
                          </button>
                          <button type="button" className="icon-btn" aria-label={`Borrar ${job.number}`} onClick={() => removeJob(job)}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'jobs' && jobStarted && (
        <section className="admin-card">
          <div className="cost-job-context">
            <div>
              <span>Cliente</span>
              <strong>{clients.find((c) => c._id === draft.client)?.name || '—'}</strong>
            </div>
            <div>
              <span>Pedido</span>
              <strong>{orders.find((o) => o._id === draft.product)?.tracking || '—'} · {draft.name || orders.find((o) => o._id === draft.product)?.name || '—'}</strong>
            </div>
            <div className="cost-job-context-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setJobStarted(false)}>
                Cambiar
              </button>
              <button type="button" className="btn btn-ghost" onClick={newJob}>
                Nuevo
              </button>
            </div>
          </div>
          <div className="cost-tabs" role="tablist" aria-label="Tablas del costo">
            {jobTabs.map((item) => {
              const n = item.id === 'total' ? scopedLines.length : sheetCount(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={jobTab === item.id}
                  className={`cost-tab ${item.id === 'total' ? 'is-end' : ''} ${jobTab === item.id ? 'is-on' : ''}`}
                  onClick={() => setJobTab(item.id)}
                >
                  {item.label}
                  {n > 0 ? <span>{n}</span> : null}
                </button>
              )
            })}
          </div>

          {jobTab !== 'total' && (
            <>
              <div className="admin-card-head">
                <div>
                  <h2>{SHEETS.find((s) => s.id === jobTab)?.label}</h2>
                  <p>Agrega solo lo que entra en este trabajo y pon la cantidad.</p>
                </div>
              </div>

              {isOtherTab(jobTab) ? (
                <div className="cost-other-add">
                  <label>
                    Nombre
                    <input className="field" value={otherName} placeholder="Traslado, pintura, tornillería…" onChange={(e) => setOtherName(e.target.value)} />
                  </label>
                  <label>
                    Costo
                    <NumberField className="field" value={otherPrice} onChange={setOtherPrice} />
                  </label>
                  <button type="button" className="btn btn-ghost" onClick={addOther}>
                    <Plus size={15} />
                    Agregar
                  </button>
                </div>
              ) : (
                <label className="cost-pick">
                  Agregar ítem
                  <input
                    className="field"
                    placeholder="Escribe para buscar y agregar…"
                    value={pickQuery}
                    onChange={(e) => {
                      setPickQuery(e.target.value)
                      setPickOpen(true)
                    }}
                    onFocus={() => setPickOpen(true)}
                    onBlur={() => window.setTimeout(() => setPickOpen(false), 180)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pickMatches[0]) {
                        e.preventDefault()
                        addLine(pickMatches[0])
                      }
                      if (e.key === 'Escape') setPickOpen(false)
                    }}
                  />
                  {pickOpen && (
                    <ul className="cost-pick-list">
                      {pickMatches.length === 0 ? (
                        <li className="is-empty">{pickQuery ? `No hay ítem con “${pickQuery}”` : 'Escribe para filtrar la lista.'}</li>
                      ) : (
                        pickMatches.slice(0, 40).map((it, i) => (
                          <li key={it._id}>
                            <button type="button" className={i === 0 ? 'is-first' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => addLine(it)}>
                              <strong>
                                {it.name}
                                {it.variant ? ` · ${it.variant}` : ''}
                              </strong>
                              <span>
                                {categories.find((c) => c.id === it.category)?.label} · {cop(it.price)}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </label>
              )}

              <div className="table-wrap mt-4">
                <table className="admin-table cut-table">
                  <thead>
                    <tr>
                      <th>Ítem</th>
                      <th>Cant.</th>
                      <th>Precio</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linesOnTab.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty">
                          {isOtherTab(jobTab) ? 'Agrega un nombre y un costo.' : 'Todavía no agregaste ítems en esta pestaña.'}
                        </td>
                      </tr>
                    ) : (
                      linesOnTab.map((line) => (
                        <tr key={line.key}>
                          <td>
                            <strong>{line.name}</strong>
                            <div className="text-xs text-steel">{[line.variant, UNITS[line.unit] || line.unit].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td>
                            <NumberField className="field" decimal value={line.qty} onChange={(n) => setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, qty: n } : l)))} />
                          </td>
                          <td>
                            <NumberField className="field" value={line.price} onChange={(n) => setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, price: n } : l)))} />
                          </td>
                          <td>{cop(lineTotal(line))}</td>
                          <td>
                            <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="cost-sheet-subtotal">
                Subtotal {SHEETS.find((s) => s.id === jobTab)?.label.toLowerCase()}: <strong>{cop(sheetSubtotal)}</strong>
              </p>
            </>
          )}

          {jobTab === 'total' && (
            <>
              <div className="admin-card-head">
                <div>
                  <h2>{editing ? editing.number : 'Costo total'}</h2>
                  <p>Esto suma lo que fuiste agregando en cada pestaña.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost" disabled={lines.length === 0} onClick={generatePdf}>
                    <FileDown size={15} />
                    Generar PDF
                  </button>
                  <button type="button" className="btn btn-red" disabled={busy} onClick={saveJob}>
                    <Save size={15} />
                    Guardar
                  </button>
                </div>
              </div>
              {linesBySheet.length === 0 ? (
                <p className="empty mt-4">
                  {section === 'inst'
                    ? 'Todavía no hay ítems. Agrégalos en tiempo de fabricación, abrasivos u otros.'
                    : 'Todavía no hay ítems. Agrégalos en Acero, fabricación, abrasivos, accesorios u otros.'}
                </p>
              ) : (
                linesBySheet.map((group) => (
                  <div key={group.id} className="mt-4">
                    <p className="cost-sheet-subtotal">
                      {group.label} · {group.lines.length} ítems · <strong>{cop(group.lines.reduce((s, l) => s + lineTotal(l), 0))}</strong>
                    </p>
                    <div className="table-wrap">
                      <table className="admin-table cut-table">
                        <thead>
                          <tr>
                            <th>Ítem</th>
                            <th>Cant.</th>
                            <th>Precio</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.lines.map((line) => (
                            <tr key={line.key}>
                              <td>
                                <strong>{line.name}</strong>
                                <div className="text-xs text-steel">{[line.variant, UNITS[line.unit] || line.unit].filter(Boolean).join(' · ')}</div>
                              </td>
                              <td>{line.qty}</td>
                              <td>{cop(line.price)}</td>
                              <td>{cop(lineTotal(line))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}

              <div className="cost-totals">
                <div>
                  <span>{section === 'inst' ? 'Gastos' : 'Materia prima'}</span>
                  <strong>{cop(totals.materialTotal)}</strong>
                </div>
                <div>
                  <span>Tiempo de fabricación</span>
                  <strong>{cop(totals.laborTotal)}</strong>
                </div>
                <div className="is-total">
                  <span>{section === 'inst' ? 'Costo de instalación' : 'Costo de MP'}</span>
                  <strong>{cop(totals.total)}</strong>
                </div>
                <div>
                  <span>{section === 'inst' ? 'Margen +50%' : 'Venta +50%'}</span>
                  <strong>{cop(totals.sale50)}</strong>
                </div>
                {section === 'mp' && (
                  <div>
                    <span>Reventa +70%</span>
                    <strong>{cop(totals.resale70)}</strong>
                  </div>
                )}
              </div>
              {draft.product && (
                <p className="mt-3 text-sm text-steel">
                  Este costo queda en el pedido.{' '}
                  <Link className="font-semibold text-brand" to={`/admin/pedidos/${draft.product}`}>
                    Abrir pedido
                  </Link>
                </p>
              )}
            </>
          )}

        </section>
      )}
    </div>
  )
}
