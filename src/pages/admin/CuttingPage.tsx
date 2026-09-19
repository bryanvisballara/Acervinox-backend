import { FileDown, Plus, Save, Scissors, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { api, openPrintDocument } from '../../lib/api'
import { cutPlanHtml, groupSheetDesigns, sheetSvg } from '../../lib/cutDrawing'
import {
  formatArea,
  formatMm,
  formatPct,
  optimizeCuts,
  type CutPieceInput,
  type OptimizeResult,
  type StockInput,
} from '../../lib/cutOptimizer'

const STORAGE_KEY = 'acervinox_cut_job'

const PRESETS: { label: string; length: number; width: number }[] = [
  { label: '1220 × 2440', length: 2440, width: 1220 },
  { label: '1000 × 2000', length: 2000, width: 1000 },
  { label: '1250 × 2500', length: 2500, width: 1250 },
  { label: '1500 × 3000', length: 3000, width: 1500 },
]

type Job = {
  jobName: string
  materialName: string
  pieces: CutPieceInput[]
  stocks: StockInput[]
  kerf: number
}

type SavedPlan = {
  _id: string
  number: string
  name: string
  materialName: string
  kerf: number
  pieces: CutPieceInput[]
  stocks: StockInput[]
  sheetsUsed: number
  utilization: number
  scrap: number
  designCount: number
  by?: string
  updatedAt: string
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyPiece(material = 'Acero inoxidable'): CutPieceInput {
  return { id: uid('p'), label: '', length: 0, width: 0, qty: 1, material, allowRotate: true }
}

function emptyStock(material = 'Acero inoxidable'): StockInput {
  return { id: uid('s'), label: 'Lámina', length: 3000, width: 1500, qty: 0, material }
}

function defaultJob(): Job {
  return {
    jobName: '',
    materialName: 'Acero inoxidable',
    pieces: [emptyPiece()],
    stocks: [emptyStock()],
    kerf: 0,
  }
}

function exampleJob(): Job {
  const material = 'Acero inoxidable'
  return {
    jobName: 'Mueble en acero',
    materialName: material,
    kerf: 0,
    pieces: [
      { id: uid('p'), label: 'Panel 1170×930', length: 1170, width: 930, qty: 9, material, allowRotate: true },
      { id: uid('p'), label: 'Filete 690×220', length: 690, width: 220, qty: 18, material, allowRotate: true },
    ],
    stocks: [{ id: uid('s'), label: 'Lámina 3000×1500', length: 3000, width: 1500, qty: 0, material }],
  }
}

function loadJob(): Job {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultJob()
    const parsed = JSON.parse(raw) as Job
    if (!Array.isArray(parsed.pieces) || !Array.isArray(parsed.stocks)) return defaultJob()
    return {
      jobName: parsed.jobName || '',
      materialName: parsed.materialName || parsed.stocks[0]?.material || 'Acero inoxidable',
      pieces: parsed.pieces.length ? parsed.pieces : [emptyPiece()],
      stocks: parsed.stocks.length ? parsed.stocks : [emptyStock()],
      kerf: Number(parsed.kerf) || 0,
    }
  } catch {
    return defaultJob()
  }
}

function applyMaterial(job: Job, materialName: string): Job {
  const prev = job.materialName
  return {
    ...job,
    materialName,
    pieces: job.pieces.map((p) => (p.material === prev || !p.material ? { ...p, material: materialName } : p)),
    stocks: job.stocks.map((s) => (s.material === prev || !s.material ? { ...s, material: materialName } : s)),
  }
}

function compute(job: Job) {
  const pieces = job.pieces.filter((p) => p.length > 0 && p.width > 0 && p.qty > 0)
  const stocks = job.stocks.filter((s) => s.length > 0 && s.width > 0)
  if (!pieces.length) throw new Error('Agrega al menos un corte con largo, ancho y cantidad.')
  if (!stocks.length) throw new Error('Agrega al menos una lámina de stock.')
  return optimizeCuts(pieces, stocks, { kerf: job.kerf })
}

function jobFromPlan(plan: SavedPlan): Job {
  const material = plan.materialName || 'Acero inoxidable'
  return {
    jobName: plan.name || '',
    materialName: material,
    kerf: plan.kerf || 0,
    pieces: plan.pieces?.length
      ? plan.pieces.map((p) => ({ ...p, id: p.id || uid('p'), material: p.material || material }))
      : [emptyPiece(material)],
    stocks: plan.stocks?.length
      ? plan.stocks.map((s) => ({ ...s, id: s.id || uid('s'), material: s.material || material }))
      : [emptyStock(material)],
  }
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function SheetCanvas({ sheet, variant }: { sheet: UsedSheetLike; variant: string }) {
  return <div className="cut-sheet-wrap" dangerouslySetInnerHTML={{ __html: sheetSvg(sheet, variant) }} />
}

type UsedSheetLike = Parameters<typeof sheetSvg>[0]

export function CuttingPage() {
  const [job, setJob] = useState<Job>(loadJob)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [plans, setPlans] = useState<SavedPlan[]>([])
  const [planId, setPlanId] = useState('')
  const [planNumber, setPlanNumber] = useState('')
  const [savedSnap, setSavedSnap] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(job))
  }, [job])

  const designs = useMemo(() => (result ? groupSheetDesigns(result.sheets) : []), [result])
  const dirty = JSON.stringify(job) !== savedSnap && Boolean(planId)

  const loadPlans = async (q = query) => {
    const data = await api(`/api/cuts${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    setPlans(data.plans || [])
  }

  useEffect(() => {
    loadPlans('').catch((err) => setError(err.message))
  }, [])

  const run = (nextJob = job) => {
    setError('')
    setPdfError('')
    try {
      const next = compute(nextJob)
      setResult(next)
      return next
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'No se pudo calcular')
      return null
    }
  }

  const loadExample = () => {
    const next = exampleJob()
    setPlanId('')
    setPlanNumber('')
    setSavedSnap('')
    setJob(next)
    run(next)
  }

  const newPlan = () => {
    setPlanId('')
    setPlanNumber('')
    setSavedSnap('')
    setJob(defaultJob())
    setResult(null)
    setError('')
    setOk('')
  }

  const openPlan = (plan: SavedPlan) => {
    const next = jobFromPlan(plan)
    setPlanId(plan._id)
    setPlanNumber(plan.number)
    setSavedSnap(JSON.stringify(next))
    setJob(next)
    setOk(`Revisando ${plan.number}`)
    run(next)
  }

  const savePlan = async (asNew = false) => {
    setError('')
    setOk('')
    setBusy(true)
    try {
      const next = result || run(job)
      if (!next) return
      const designsNow = groupSheetDesigns(next.sheets)
      const body = {
        name: job.jobName || 'Plan de cortes',
        materialName: job.materialName,
        kerf: job.kerf,
        pieces: job.pieces,
        stocks: job.stocks,
        sheetsUsed: next.sheetsUsed,
        utilization: next.utilization,
        scrap: next.scrap,
        designCount: designsNow.length,
      }
      const data =
        planId && !asNew
          ? await api(`/api/cuts/${planId}`, { method: 'PATCH', body: JSON.stringify(body) })
          : await api('/api/cuts', { method: 'POST', body: JSON.stringify(body) })
      const plan = data.plan as SavedPlan
      setPlanId(plan._id)
      setPlanNumber(plan.number)
      setSavedSnap(JSON.stringify(job))
      setJob((j) => ({ ...j, jobName: plan.name || j.jobName }))
      setOk(asNew || !planId ? `Guardado como ${plan.number}` : `Cambios guardados en ${plan.number}`)
      await loadPlans()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el plan')
    } finally {
      setBusy(false)
    }
  }

  const removePlan = async (plan: SavedPlan) => {
    if (!window.confirm(`¿Borrar el plan ${plan.number}?`)) return
    setBusy(true)
    try {
      await api(`/api/cuts/${plan._id}`, { method: 'DELETE' })
      if (planId === plan._id) newPlan()
      await loadPlans()
      setOk(`Se borró ${plan.number}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar el plan')
    } finally {
      setBusy(false)
    }
  }

  const updatePiece = (id: string, patch: Partial<CutPieceInput>) => {
    setJob((prev) => ({ ...prev, pieces: prev.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }
  const updateStock = (id: string, patch: Partial<StockInput>) => {
    setJob((prev) => ({ ...prev, stocks: prev.stocks.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }

  const generatePdf = () => {
    if (!result || !designs.length) return
    setPdfError('')
    try {
      openPrintDocument(
        cutPlanHtml(result, designs, {
          jobName: job.jobName || planNumber || 'Plan de cortes',
          materialName: job.materialName,
          origin: window.location.origin,
        }),
        'acervinox-cortes',
      )
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'No se pudo generar el PDF')
    }
  }

  return (
    <div className="admin-page cut-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Taller</p>
          <h1 className="font-display text-4xl font-bold">Optimizador de cortes</h1>
          <p className="mt-2 max-w-2xl text-steel">
            Mete las piezas del mueble y el tamaño de la lámina. El sistema acomoda los cortes,
            dibuja el despiece con medidas y te dice cuántas láminas comprar. Los planes se
            guardan para volverlos a abrir o editar.
          </p>
          {planNumber && (
            <p className="cut-editing">
              Editando <strong>{planNumber}</strong>
              {dirty ? ' · hay cambios sin guardar' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={newPlan}>
            Nuevo
          </button>
          <button type="button" className="btn btn-ghost" onClick={loadExample}>
            Ejemplo mueble
          </button>
          <button type="button" className="btn btn-ghost" onClick={generatePdf} disabled={!result?.sheets.length}>
            <FileDown size={15} />
            Generar PDF
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy || !planId} onClick={() => savePlan(true)}>
            Guardar como nuevo
          </button>
          <button type="button" className="btn btn-red" disabled={busy} onClick={() => savePlan(false)}>
            <Save size={15} />
            {planId ? 'Guardar cambios' : 'Guardar plan'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => run()}>
            <Scissors size={15} />
            Calcular cortes
          </button>
        </div>
      </div>

      <section className="admin-card cut-saved">
        <div className="admin-card-head">
          <div>
            <h2>Planes guardados</h2>
            <p>Ábrelos para revisar el despiece, cambiar medidas o guardar otra versión.</p>
          </div>
          <div className="admin-filters">
            <input
              className="field"
              placeholder="Buscar por código, mueble o material"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadPlans().catch((err) => setError(err.message))
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={() => loadPlans().catch((err) => setError(err.message))}>
              Buscar
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Trabajo</th>
                <th>Material</th>
                <th>Láminas</th>
                <th>Diseños</th>
                <th>Actualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Aún no hay planes guardados.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id} className={plan._id === planId ? 'is-current' : ''}>
                    <td>{plan.number}</td>
                    <td>{plan.name || '—'}</td>
                    <td>{plan.materialName || '—'}</td>
                    <td>{plan.sheetsUsed}</td>
                    <td>{plan.designCount}</td>
                    <td>{formatWhen(plan.updatedAt)}</td>
                    <td className="cut-plan-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => openPlan(plan)}>
                        Abrir
                      </button>
                      <button type="button" className="icon-btn" aria-label={`Borrar ${plan.number}`} onClick={() => removePlan(plan)}>
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

      {ok && <p className="cut-ok">{ok}</p>}
      {error && <p className="cut-error">{error}</p>}

      <div className="cut-layout">
        <div>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Trabajo</h2>
                <p>Nombre del mueble o pedido, y el material de la lámina que van a comprar.</p>
              </div>
            </div>
            <div className="cut-job-fields">
              <label>
                Nombre del trabajo
                <input className="field" value={job.jobName} placeholder="Mueble en acero" onChange={(e) => setJob((j) => ({ ...j, jobName: e.target.value }))} />
              </label>
              <label>
                Material de la lámina
                <input
                  className="field"
                  value={job.materialName}
                  placeholder="Acero inoxidable 304"
                  onChange={(e) => setJob((j) => applyMaterial(j, e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Cortes que necesitas</h2>
                <p>Medidas en milímetros. Si la pieza puede girar 90°, deja rotación activa.</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setJob((j) => ({ ...j, pieces: [...j.pieces, emptyPiece(j.materialName)] }))}>
                <Plus size={15} />
                Corte
              </button>
            </div>
            <div className="table-wrap">
              <table className="admin-table cut-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Largo</th>
                    <th>Ancho</th>
                    <th>Cant.</th>
                    <th>Rotar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {job.pieces.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input className="field" value={p.label} placeholder="panel, costado…" onChange={(e) => updatePiece(p.id, { label: e.target.value })} />
                      </td>
                      <td>
                        <NumberField className="field" decimal value={p.length} onChange={(length) => updatePiece(p.id, { length })} />
                      </td>
                      <td>
                        <NumberField className="field" decimal value={p.width} onChange={(width) => updatePiece(p.id, { width })} />
                      </td>
                      <td>
                        <NumberField className="field" value={p.qty} onChange={(qty) => updatePiece(p.id, { qty })} />
                      </td>
                      <td className="cut-check">
                        <input type="checkbox" checked={p.allowRotate} onChange={(e) => updatePiece(p.id, { allowRotate: e.target.checked })} />
                      </td>
                      <td>
                        <button type="button" className="icon-btn" aria-label="Quitar corte" onClick={() => setJob((j) => ({ ...j, pieces: j.pieces.filter((x) => x.id !== p.id || j.pieces.length === 1) }))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Lámina que se compra</h2>
                <p>Cantidad 0 = las que hagan falta. El material se toma del nombre de arriba.</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setJob((j) => ({ ...j, stocks: [...j.stocks, emptyStock(j.materialName)] }))}>
                <Plus size={15} />
                Lámina
              </button>
            </div>
            <div className="cut-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setJob((j) => ({
                      ...j,
                      stocks: [{ ...emptyStock(j.materialName), ...preset, label: `Lámina ${preset.label}` }],
                    }))
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="table-wrap mt-3">
              <table className="admin-table cut-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Largo</th>
                    <th>Ancho</th>
                    <th>Cant.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {job.stocks.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input className="field" value={s.label} onChange={(e) => updateStock(s.id, { label: e.target.value })} />
                      </td>
                      <td>
                        <NumberField className="field" decimal value={s.length} onChange={(length) => updateStock(s.id, { length })} />
                      </td>
                      <td>
                        <NumberField className="field" decimal value={s.width} onChange={(width) => updateStock(s.id, { width })} />
                      </td>
                      <td>
                        <NumberField className="field" value={s.qty} onChange={(qty) => updateStock(s.id, { qty })} />
                      </td>
                      <td>
                        <button type="button" className="icon-btn" aria-label="Quitar lámina" onClick={() => setJob((j) => ({ ...j, stocks: j.stocks.filter((x) => x.id !== s.id || j.stocks.length === 1) }))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="cut-kerf">
              Merma de corte (sierra / plasma)
              <NumberField className="field" decimal value={job.kerf} onChange={(kerf) => setJob((j) => ({ ...j, kerf }))} />
              <span>mm entre piezas</span>
            </label>
          </section>
        </div>

        <div>
          {pdfError && <p className="cut-error">{pdfError}</p>}
          {result && (
            <>
              <section className="admin-metrics cut-metrics">
                <article>
                  <span>Láminas</span>
                  <strong>{result.sheetsUsed}</strong>
                </article>
                <article>
                  <span>Diseños</span>
                  <strong>{designs.length}</strong>
                </article>
                <article>
                  <span>Aprovechamiento</span>
                  <strong>{formatPct(result.utilization)}</strong>
                </article>
                <article>
                  <span>Área usada</span>
                  <strong>{formatArea(result.usedArea)}</strong>
                </article>
              </section>

              {result.unplaced.length > 0 && (
                <section className="admin-card cut-warn">
                  <h2>No cupieron</h2>
                  <ul>
                    {result.unplaced.map((u) => (
                      <li key={u.pieceId}>
                        {u.qty} × {u.label} ({formatMm(u.length)} × {formatMm(u.width)}) — {u.reason}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {designs.map((design) => (
                <section key={design.key} className="admin-card cut-plan">
                  <div className="admin-card-head">
                    <div>
                      <h2>
                        Diseño {design.letter}
                        {design.count > 1 ? ` · ${design.count} láminas iguales` : ' · 1 lámina'}
                      </h2>
                      <p>
                        {design.sheet.material} · {formatMm(design.sheet.length)} × {formatMm(design.sheet.width)} mm · {formatPct(design.sheet.utilization)} útil
                      </p>
                    </div>
                  </div>
                  <SheetCanvas sheet={design.sheet} variant={`preview-${design.letter}`} />
                  {design.sheet.leftovers.some((l) => l.length * l.width > design.sheet.length * design.sheet.width * 0.03) && (
                    <div className="cut-scraps">
                      <p>Retazos aprovechables</p>
                      <ul>
                        {design.sheet.leftovers
                          .filter((l) => l.length * l.width > design.sheet.length * design.sheet.width * 0.03)
                          .slice(0, 3)
                          .map((leftover, i) => (
                            <li key={`${design.key}-l${i}`}>
                              {formatMm(leftover.length)} × {formatMm(leftover.width)} mm
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </section>
              ))}
            </>
          )}
          {!result && !error && (
            <section className="admin-card">
              <p className="text-steel">
                Llena los cortes y la lámina, o pulsa <strong>Ejemplo mueble</strong> para ver el caso
                de 9 paneles y 18 filetes sobre lámina 3000 × 1500.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
