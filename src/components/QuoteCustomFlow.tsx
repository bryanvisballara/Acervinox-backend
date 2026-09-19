import { ArrowLeft, ArrowRight, FileDown, ImagePlus, Plus, Scissors, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NumberField } from './NumberField'
import { api, openPrintDocument } from '../lib/api'
import {
  COST_SECTIONS,
  COST_SHEETS,
  COST_UNITS,
  catsOf,
  costLineTotal,
  costTotals,
  firstSheet,
  isOtherTab,
  lineSection,
  newCostKey,
  sheetsOf,
  type CostCatalogItem,
  type CostLine,
  type CostSectionId,
  type CostSheetId,
} from '../lib/costSheets'
import { jobCostHtml } from '../lib/costPrint'
import { cutPlanHtml, groupSheetDesigns, sheetSvg } from '../lib/cutDrawing'
import {
  formatArea,
  formatMm,
  formatPct,
  optimizeCuts,
  type CutPieceInput,
  type OptimizeResult,
  type StockInput,
} from '../lib/cutOptimizer'
import { compressImage, cop } from '../lib/image'

const PRESETS = [
  { label: '1220 × 2440', length: 2440, width: 1220 },
  { label: '1000 × 2000', length: 2000, width: 1000 },
  { label: '1250 × 2500', length: 2500, width: 1250 },
  { label: '1500 × 3000', length: 3000, width: 1500 },
]

export type QuotePriceChoice = 'total' | 'sale50' | 'resale70' | 'custom'

export type QuoteCustomItem = {
  _id?: string
  name: string
  origin: 'nacional' | 'importado'
  brand: string
  image: string
  description?: string
  specs: string[]
  steelType: string
  gauge: string
  kind: 'medida'
  cutPlanId?: string
  jobCostId?: string
  sheetsUsed?: number
  costTotal?: number
  priceChoice?: QuotePriceChoice
  parts: {
    partId: string
    name: string
    qty: number
    unitPrice: number
    pricing: 'estandar' | 'medida'
    unit: string
    measure: number
  }[]
}

type CutJob = {
  jobName: string
  materialName: string
  pieces: CutPieceInput[]
  stocks: StockInput[]
  kerf: number
}

type Category = { id: string; label: string }
type Step = 'cortes' | 'costos' | 'precio'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyPiece(material = 'Acero inoxidable'): CutPieceInput {
  return { id: uid('p'), label: '', length: 0, width: 0, qty: 1, material, allowRotate: true }
}

function emptyStock(material = 'Acero inoxidable'): StockInput {
  return { id: uid('s'), label: 'Lámina', length: 3000, width: 1500, qty: 0, material }
}

function defaultCutJob(name: string): CutJob {
  return {
    jobName: name,
    materialName: 'Acero inoxidable',
    pieces: [emptyPiece()],
    stocks: [emptyStock()],
    kerf: 0,
  }
}

function applyMaterial(job: CutJob, materialName: string): CutJob {
  const prev = job.materialName
  return {
    ...job,
    materialName,
    pieces: job.pieces.map((p) => (p.material === prev || !p.material ? { ...p, material: materialName } : p)),
    stocks: job.stocks.map((s) => (s.material === prev || !s.material ? { ...s, material: materialName } : s)),
  }
}

function salePrice(choice: QuotePriceChoice, totals: ReturnType<typeof costTotals>, custom: number) {
  if (choice === 'total') return totals.total
  if (choice === 'resale70') return totals.resale70
  if (choice === 'custom') return Math.round(custom || 0)
  return totals.sale50
}

function pricedParts(name: string, price: number): QuoteCustomItem['parts'] {
  return [
    {
      partId: '',
      name: name.trim() || 'Producto a la medida',
      qty: 1,
      unitPrice: price,
      pricing: 'estandar',
      unit: 'und',
      measure: 0,
    },
  ]
}

export function emptyMedidaItem(name: string): QuoteCustomItem {
  return {
    name,
    origin: 'nacional',
    brand: 'acervinox',
    image: '',
    description: '',
    specs: [],
    steelType: '',
    gauge: '',
    kind: 'medida',
    sheetsUsed: 0,
    costTotal: 0,
    priceChoice: 'sale50',
    parts: pricedParts(name, 0),
  }
}

export function QuoteCustomFlow({
  item,
  clientId,
  clientName,
  quoteId,
  productId,
  onChange,
  onDone,
}: {
  item: QuoteCustomItem
  clientId: string
  clientName: string
  quoteId: string
  productId?: string
  onChange: (item: QuoteCustomItem) => void
  onDone: (item?: QuoteCustomItem) => void
}) {
  const [step, setStep] = useState<Step>(item.jobCostId ? 'precio' : item.cutPlanId ? 'costos' : 'cortes')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [cutJob, setCutJob] = useState<CutJob>(() => defaultCutJob(item.name))
  const [cutResult, setCutResult] = useState<OptimizeResult | null>(null)
  const [cutPlanId, setCutPlanId] = useState(item.cutPlanId || '')

  const [costItems, setCostItems] = useState<CostCatalogItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [lines, setLines] = useState<CostLine[]>([])
  const [jobCostId, setJobCostId] = useState(item.jobCostId || '')
  const [section, setSection] = useState<CostSectionId>('mp')
  const [jobTab, setJobTab] = useState<CostSheetId | 'total'>('acero')
  const [pickQuery, setPickQuery] = useState('')
  const [pickOpen, setPickOpen] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherPrice, setOtherPrice] = useState(0)

  const [choice, setChoice] = useState<QuotePriceChoice>(item.priceChoice || 'sale50')
  const [customPrice, setCustomPrice] = useState(item.parts[0]?.unitPrice || 0)

  useEffect(() => {
    api('/api/costs/items')
      .then((data) => {
        setCostItems(data.items || [])
        setCategories(data.categories || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!item.cutPlanId) return
    api(`/api/cuts/${item.cutPlanId}`)
      .then((data) => {
        const plan = data.plan
        const material = plan.materialName || 'Acero inoxidable'
        const next: CutJob = {
          jobName: plan.name || item.name,
          materialName: material,
          kerf: plan.kerf || 0,
          pieces: plan.pieces?.length
            ? plan.pieces.map((p: CutPieceInput) => ({ ...p, id: p.id || uid('p'), material: p.material || material }))
            : [emptyPiece(material)],
          stocks: plan.stocks?.length
            ? plan.stocks.map((s: StockInput) => ({ ...s, id: s.id || uid('s'), material: s.material || material }))
            : [emptyStock(material)],
        }
        setCutJob(next)
        setCutPlanId(plan._id)
        try {
          setCutResult(optimizeCuts(next.pieces.filter((p) => p.length && p.width && p.qty), next.stocks.filter((s) => s.length && s.width), { kerf: next.kerf }))
        } catch {
          setCutResult(null)
        }
      })
      .catch((err) => setError(err.message))
  }, [item.cutPlanId])

  useEffect(() => {
    if (!item.jobCostId) return
    api(`/api/costs/jobs/${item.jobCostId}`)
      .then((data) => {
        const job = data.job
        setJobCostId(job._id)
        setLines(
          (job.lines || []).map((l: { item?: string; category: string; name: string; variant: string; unit: string; qty: number; price: number }) => ({
            key: newCostKey(),
            item: l.item ? String(l.item) : undefined,
            category: l.category,
            name: l.name,
            variant: l.variant,
            unit: l.unit,
            qty: l.qty,
            price: l.price,
          })),
        )
      })
      .catch((err) => setError(err.message))
  }, [item.jobCostId])

  const designs = useMemo(() => (cutResult ? groupSheetDesigns(cutResult.sheets) : []), [cutResult])
  const totals = useMemo(() => costTotals(lines), [lines])
  const currentSheets = useMemo(() => sheetsOf(section), [section])
  const linesOnTab = useMemo(() => {
    if (jobTab === 'total') return []
    const cats = catsOf(jobTab)
    return lines.filter((l) => {
      if (cats.includes(l.category)) return true
      if (!isOtherTab(jobTab) || lineSection(l.category) !== section) return false
      return !currentSheets.some((s) => !isOtherTab(s.id) && catsOf(s.id).includes(l.category))
    })
  }, [currentSheets, jobTab, lines, section])
  const pickMatches = useMemo(() => {
    if (jobTab === 'total') return []
    const cats = catsOf(jobTab)
    const needle = pickQuery.trim().toLowerCase()
    const label = (id: string) => categories.find((c) => c.id === id)?.label || id
    return costItems.filter((it) => {
      if (!cats.includes(it.category)) return false
      if (!needle) return true
      return `${it.name} ${it.variant} ${it.unit} ${label(it.category)} ${it.price}`.toLowerCase().includes(needle)
    })
  }, [categories, costItems, jobTab, pickQuery])
  const price = salePrice(choice, totals, customPrice)

  const updateItem = (patch: Partial<QuoteCustomItem>) => {
    const next = { ...item, ...patch }
    if (patch.parts || patch.name || patch.priceChoice || patch.costTotal != null) {
      const name = next.name
      const nextPrice = patch.parts ? (patch.parts[0]?.unitPrice ?? price) : salePrice(next.priceChoice || choice, totals, customPrice)
      next.parts = pricedParts(name, nextPrice)
    }
    onChange(next)
  }

  const runCuts = (nextJob = cutJob) => {
    setError('')
    try {
      const pieces = nextJob.pieces.filter((p) => p.length > 0 && p.width > 0 && p.qty > 0)
      const stocks = nextJob.stocks.filter((s) => s.length > 0 && s.width > 0)
      if (!pieces.length) throw new Error('Agrega al menos un corte con largo, ancho y cantidad.')
      if (!stocks.length) throw new Error('Agrega al menos una lámina de stock.')
      const next = optimizeCuts(pieces, stocks, { kerf: nextJob.kerf })
      setCutResult(next)
      return next
    } catch (err) {
      setCutResult(null)
      setError(err instanceof Error ? err.message : 'No se pudo calcular')
      return null
    }
  }

  const saveCuts = async (nextJob = cutJob, nextResult = cutResult) => {
    const computed = nextResult || runCuts(nextJob)
    if (!computed) return ''
    const designsNow = groupSheetDesigns(computed.sheets)
    const body = {
      name: item.name || nextJob.jobName || 'Producto a la medida',
      materialName: nextJob.materialName,
      kerf: nextJob.kerf,
      pieces: nextJob.pieces,
      stocks: nextJob.stocks,
      sheetsUsed: computed.sheetsUsed,
      utilization: computed.utilization,
      scrap: computed.scrap,
      designCount: designsNow.length,
      quotation: quoteId || undefined,
      quoteItemId: item._id || undefined,
    }
    const data =
      cutPlanId
        ? await api(`/api/cuts/${cutPlanId}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await api('/api/cuts', { method: 'POST', body: JSON.stringify(body) })
    setCutPlanId(data.plan._id)
    updateItem({ cutPlanId: data.plan._id, sheetsUsed: computed.sheetsUsed })
    return data.plan._id as string
  }

  const saveCosts = async () => {
    const body = {
      name: item.name,
      client: clientId || null,
      product: productId || null,
      quotation: quoteId || null,
      quoteItemId: item._id || null,
      notes: cutResult ? `${cutResult.sheetsUsed} láminas · ${cutJob.materialName}` : '',
      lines: lines.map((l) => ({ ...l, total: costLineTotal(l) })),
    }
    const data = jobCostId
      ? await api(`/api/costs/jobs/${jobCostId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('/api/costs/jobs', { method: 'POST', body: JSON.stringify(body) })
    setJobCostId(data.job._id)
    updateItem({
      jobCostId: data.job._id,
      costTotal: totals.total,
      priceChoice: choice,
      parts: pricedParts(item.name, price),
    })
    return data.job._id as string
  }

  const goCostos = async () => {
    setError('')
    setBusy(true)
    try {
      if (cutJob.pieces.some((p) => p.length > 0 && p.width > 0 && p.qty > 0)) {
        await saveCuts()
      }
      setStep('costos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el corte')
    } finally {
      setBusy(false)
    }
  }

  const goPrecio = async () => {
    setError('')
    if (!lines.length) {
      setError('Agrega al menos un ítem de costo, o pon un precio a mano en el siguiente paso.')
    }
    setBusy(true)
    try {
      if (lines.length) await saveCosts()
      setStep('precio')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el costo')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    if (choice === 'custom' && !price) {
      setError('Escribe el precio de este producto')
      return
    }
    if (choice !== 'custom' && !totals.total) {
      setError('Primero arma el costo, o elige un precio a mano')
      return
    }
    setError('')
    setBusy(true)
    try {
      if (lines.length) await saveCosts()
      const next: QuoteCustomItem = {
        ...item,
        costTotal: totals.total,
        priceChoice: choice,
        sheetsUsed: cutResult?.sheetsUsed ?? item.sheetsUsed ?? 0,
        parts: pricedParts(item.name, price),
      }
      onChange(next)
      onDone(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dejar el precio')
    } finally {
      setBusy(false)
    }
  }

  const addLine = (catalog: CostCatalogItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.item === catalog._id)
      if (existing) return prev.map((l) => (l.item === catalog._id ? { ...l, qty: (l.qty || 0) + 1 } : l))
      return [
        ...prev,
        {
          key: newCostKey(),
          item: catalog._id,
          category: catalog.category,
          name: catalog.name,
          variant: catalog.variant,
          unit: catalog.unit,
          qty: 1,
          price: catalog.price,
        },
      ]
    })
    setPickQuery('')
    setPickOpen(false)
  }

  const addOther = () => {
    const name = otherName.trim()
    if (!name) {
      setError('Escribe el nombre del ítem')
      return
    }
    const category = section === 'inst' ? 'inst_otros' : 'otros'
    setLines((prev) => [...prev, { key: newCostKey(), category, name, variant: '', unit: 'und', qty: 1, price: otherPrice }])
    setOtherName('')
    setOtherPrice(0)
  }

  const sheetCount = (id: CostSheetId) => lines.filter((l) => catsOf(id).includes(l.category) && l.qty > 0).length

  return (
    <section className="admin-card quote-custom">
      <div className="quote-custom-bar">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          <ArrowLeft size={16} /> Volver a la cotización
        </button>
        <div className="quote-custom-steps" role="tablist" aria-label="Pasos del producto a la medida">
          {(
            [
              ['cortes', '1. Cortes'],
              ['costos', '2. Costos'],
              ['precio', '3. Precio'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={step === id}
              className={`quote-custom-step ${step === id ? 'is-on' : ''}`}
              onClick={() => setStep(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="quote-custom-name">
        Nombre de este producto
        <input
          className="field"
          value={item.name}
          placeholder="Mueble para cafetería, campana a medida…"
          onChange={(e) => {
            const name = e.target.value
            setCutJob((j) => ({ ...j, jobName: name }))
            updateItem({ name, parts: pricedParts(name, price) })
          }}
        />
      </label>
      <div className="quote-photo mt-4">
        {item.image ? <img src={item.image} alt="" className="quote-thumb" /> : <div className="quote-thumb is-empty">Sin foto</div>}
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-ghost">
            <ImagePlus size={16} />
            {item.image ? 'Cambiar foto' : 'Agregar foto'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) updateItem({ image: await compressImage(file) })
                e.currentTarget.value = ''
              }}
            />
          </label>
          {item.image ? (
            <button type="button" className="btn btn-ghost" onClick={() => updateItem({ image: '' })}>
              Quitar
            </button>
          ) : null}
        </div>
      </div>
      <label className="quote-desc mt-4">
        Descripción
        <textarea
          className="field"
          rows={5}
          value={item.description || ''}
          placeholder="Servicio, materiales, medidas, acabados… lo que debe verse en la cotización."
          onChange={(e) => updateItem({ description: e.target.value })}
        />
      </label>
      {clientName && <p className="quote-custom-meta">Cliente: {clientName}</p>}
      {error && <p className="mt-3 text-sm text-brand">{error}</p>}

      {step === 'cortes' && (
        <div className="quote-custom-body">
          <p className="text-sm text-steel">
            Si este producto lleva lámina, arma el despiece. Si no (solo tubo, accesorios o instalación), sáltalo.
          </p>
          <div className="cut-job-fields mt-4">
            <label>
              Material de la lámina
              <input
                className="field"
                value={cutJob.materialName}
                placeholder="Acero inoxidable 304"
                onChange={(e) => setCutJob((j) => applyMaterial(j, e.target.value))}
              />
            </label>
          </div>

          <div className="admin-card-head mt-6">
            <div>
              <h2>Cortes que necesitas</h2>
              <p>Medidas en milímetros.</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setCutJob((j) => ({ ...j, pieces: [...j.pieces, emptyPiece(j.materialName)] }))}>
              <Plus size={15} /> Corte
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
                {cutJob.pieces.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input className="field" value={p.label} placeholder="panel, costado…" onChange={(e) => setCutJob((j) => ({ ...j, pieces: j.pieces.map((x) => (x.id === p.id ? { ...x, label: e.target.value } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" decimal value={p.length} onChange={(length) => setCutJob((j) => ({ ...j, pieces: j.pieces.map((x) => (x.id === p.id ? { ...x, length } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" decimal value={p.width} onChange={(width) => setCutJob((j) => ({ ...j, pieces: j.pieces.map((x) => (x.id === p.id ? { ...x, width } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" value={p.qty} onChange={(qty) => setCutJob((j) => ({ ...j, pieces: j.pieces.map((x) => (x.id === p.id ? { ...x, qty } : x)) }))} />
                    </td>
                    <td className="cut-check">
                      <input type="checkbox" checked={p.allowRotate} onChange={(e) => setCutJob((j) => ({ ...j, pieces: j.pieces.map((x) => (x.id === p.id ? { ...x, allowRotate: e.target.checked } : x)) }))} />
                    </td>
                    <td>
                      <button type="button" className="icon-btn" aria-label="Quitar corte" onClick={() => setCutJob((j) => ({ ...j, pieces: j.pieces.filter((x) => x.id !== p.id || j.pieces.length === 1) }))}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-card-head mt-6">
            <div>
              <h2>Lámina que se compra</h2>
              <p>Cantidad 0 = las que hagan falta.</p>
            </div>
          </div>
          <div className="cut-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="btn btn-ghost"
                onClick={() => setCutJob((j) => ({ ...j, stocks: [{ ...emptyStock(j.materialName), ...preset, label: `Lámina ${preset.label}` }] }))}
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
                </tr>
              </thead>
              <tbody>
                {cutJob.stocks.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input className="field" value={s.label} onChange={(e) => setCutJob((j) => ({ ...j, stocks: j.stocks.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" decimal value={s.length} onChange={(length) => setCutJob((j) => ({ ...j, stocks: j.stocks.map((x) => (x.id === s.id ? { ...x, length } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" decimal value={s.width} onChange={(width) => setCutJob((j) => ({ ...j, stocks: j.stocks.map((x) => (x.id === s.id ? { ...x, width } : x)) }))} />
                    </td>
                    <td>
                      <NumberField className="field" value={s.qty} onChange={(qty) => setCutJob((j) => ({ ...j, stocks: j.stocks.map((x) => (x.id === s.id ? { ...x, qty } : x)) }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => runCuts()}>
              <Scissors size={15} /> Calcular cortes
            </button>
            <button type="button" className="btn btn-ghost" disabled={!cutResult?.sheets.length} onClick={() => openPrintDocument(cutPlanHtml(cutResult!, designs, { jobName: item.name, materialName: cutJob.materialName, origin: window.location.origin }), 'acervinox-cortes')}>
              <FileDown size={15} /> PDF del despiece
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setCutResult(null); setStep('costos') }}>
              Saltar cortes
            </button>
            <button type="button" className="btn btn-red" disabled={busy} onClick={goCostos}>
              Continuar a costos <ArrowRight size={15} />
            </button>
          </div>

          {cutResult && (
            <section className="admin-metrics cut-metrics mt-6">
              <article>
                <span>Láminas</span>
                <strong>{cutResult.sheetsUsed}</strong>
              </article>
              <article>
                <span>Diseños</span>
                <strong>{designs.length}</strong>
              </article>
              <article>
                <span>Aprovechamiento</span>
                <strong>{formatPct(cutResult.utilization)}</strong>
              </article>
              <article>
                <span>Área usada</span>
                <strong>{formatArea(cutResult.usedArea)}</strong>
              </article>
            </section>
          )}
          {designs.map((design) => (
            <section key={design.key} className="admin-card cut-plan mt-4">
              <h2>
                Diseño {design.letter}
                {design.count > 1 ? ` · ${design.count} láminas iguales` : ' · 1 lámina'}
              </h2>
              <p className="text-sm text-steel">
                {design.sheet.material} · {formatMm(design.sheet.length)} × {formatMm(design.sheet.width)} mm
              </p>
              <div className="cut-sheet-wrap" dangerouslySetInnerHTML={{ __html: sheetSvg(design.sheet, `quote-${design.letter}`) }} />
            </section>
          ))}
        </div>
      )}

      {step === 'costos' && (
        <div className="quote-custom-body">
          <p className="text-sm text-steel">
            {cutResult
              ? `Este despiece usa ${cutResult.sheetsUsed} lámina${cutResult.sheetsUsed === 1 ? '' : 's'} de ${cutJob.materialName}. Agrégalas en Acero y suma fabricación, abrasivos e instalación.`
              : 'Suma materia prima e instalación de este producto. El total se vuelve el precio de la cotización.'}
          </p>

          <div className="cost-section-tabs mt-4" role="tablist" aria-label="Tipo de costo">
            {COST_SECTIONS.map((itemSection) => (
              <button
                key={itemSection.id}
                type="button"
                role="tab"
                aria-selected={section === itemSection.id}
                className={`cost-section-tab ${section === itemSection.id ? 'is-on' : ''}`}
                onClick={() => {
                  setSection(itemSection.id)
                  setJobTab(firstSheet(itemSection.id))
                  setPickQuery('')
                }}
              >
                {itemSection.label}
              </button>
            ))}
          </div>

          <div className="cost-tabs" role="tablist" aria-label="Tablas del costo">
            {[...currentSheets, { id: 'total' as const, label: 'Costo total' }].map((tab) => {
              const n = tab.id === 'total' ? lines.filter((l) => lineSection(l.category) === section).length : sheetCount(tab.id)
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={jobTab === tab.id}
                  className={`cost-tab ${tab.id === 'total' ? 'is-end' : ''} ${jobTab === tab.id ? 'is-on' : ''}`}
                  onClick={() => setJobTab(tab.id)}
                >
                  {tab.label}
                  {n > 0 ? <span>{n}</span> : null}
                </button>
              )
            })}
          </div>

          {jobTab !== 'total' && (
            <>
              {isOtherTab(jobTab) ? (
                <div className="cost-other-add">
                  <label>
                    Nombre
                    <input className="field" value={otherName} placeholder="Traslado, pintura…" onChange={(e) => setOtherName(e.target.value)} />
                  </label>
                  <label>
                    Costo
                    <NumberField className="field" value={otherPrice} onChange={setOtherPrice} />
                  </label>
                  <button type="button" className="btn btn-ghost" onClick={addOther}>
                    <Plus size={15} /> Agregar
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
                    }}
                  />
                  {pickOpen && (
                    <ul className="cost-pick-list">
                      {pickMatches.length === 0 ? (
                        <li className="is-empty">{pickQuery ? `No hay ítem con “${pickQuery}”` : 'Escribe para filtrar.'}</li>
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
                          Todavía no agregaste ítems en esta pestaña.
                        </td>
                      </tr>
                    ) : (
                      linesOnTab.map((line) => (
                        <tr key={line.key}>
                          <td>
                            <strong>{line.name}</strong>
                            <div className="text-xs text-steel">{[line.variant, COST_UNITS[line.unit] || line.unit].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td>
                            <NumberField className="field" decimal value={line.qty} onChange={(n) => setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, qty: n } : l)))} />
                          </td>
                          <td>
                            <NumberField className="field" value={line.price} onChange={(n) => setLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, price: n } : l)))} />
                          </td>
                          <td>{cop(costLineTotal(line))}</td>
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
            </>
          )}

          {jobTab === 'total' && (
            <div className="cost-totals mt-4">
              <div>
                <span>Costo</span>
                <strong>{cop(totals.total)}</strong>
              </div>
              <div>
                <span>Venta +50%</span>
                <strong>{cop(totals.sale50)}</strong>
              </div>
              <div>
                <span>Reventa +70%</span>
                <strong>{cop(totals.resale70)}</strong>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('cortes')}>
              <ArrowLeft size={15} /> Cortes
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!lines.length}
              onClick={() =>
                openPrintDocument(
                  jobCostHtml({
                    name: item.name,
                    clientName,
                    orderLabel: '',
                    groups: COST_SHEETS.map((s) => ({ ...s, lines: lines.filter((l) => catsOf(s.id).includes(l.category)) })).filter((s) => s.lines.length),
                    totals,
                    kind: section,
                    origin: window.location.origin,
                  }),
                  'acervinox-costo',
                )
              }
            >
              <FileDown size={15} /> PDF del costo
            </button>
            <button type="button" className="btn btn-red" disabled={busy} onClick={goPrecio}>
              Continuar al precio <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 'precio' && (
        <div className="quote-custom-body">
          <p className="text-sm text-steel">Elige con qué precio entra este producto a la cotización. El IVA se suma después, igual que en el catálogo.</p>
          <div className="quote-price-picks">
            <button type="button" className={`quote-price-pick ${choice === 'total' ? 'is-on' : ''}`} onClick={() => setChoice('total')}>
              <span>Costo</span>
              <strong>{cop(totals.total)}</strong>
            </button>
            <button type="button" className={`quote-price-pick ${choice === 'sale50' ? 'is-on' : ''}`} onClick={() => setChoice('sale50')}>
              <span>Venta +50%</span>
              <strong>{cop(totals.sale50)}</strong>
            </button>
            <button type="button" className={`quote-price-pick ${choice === 'resale70' ? 'is-on' : ''}`} onClick={() => setChoice('resale70')}>
              <span>Reventa +70%</span>
              <strong>{cop(totals.resale70)}</strong>
            </button>
            <label className={`quote-price-pick ${choice === 'custom' ? 'is-on' : ''}`}>
              <span>Otro precio</span>
              <NumberField
                className="field"
                value={customPrice}
                onChange={(n) => {
                  setCustomPrice(n)
                  setChoice('custom')
                }}
              />
            </label>
          </div>
          <p className="mt-4 text-sm text-steel">
            {cutResult ? `${cutResult.sheetsUsed} láminas · ` : ''}
            Costo {cop(totals.total)} · <strong className="text-brand">A cotizar {cop(price)}</strong>
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button type="button" className="btn btn-ghost" onClick={() => setStep('costos')}>
              <ArrowLeft size={15} /> Costos
            </button>
            <button type="button" className="btn btn-red" disabled={busy} onClick={finish}>
              Listo, sumar a la cotización
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
