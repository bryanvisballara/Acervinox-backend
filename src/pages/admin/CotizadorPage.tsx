import { FileDown, Mail, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClientModal, type AdminClient } from '../../components/ClientModal'
import { NumberField } from '../../components/NumberField'
import { CLIENT_TYPES, DOC_TYPES, IVA } from '../../data/stages'
import { api, openPrintHtml, openPrintWindow } from '../../lib/api'
import { cop, partAmount, unitLabel } from '../../lib/image'

type Part = {
  _id: string
  name: string
  price: number
  pricing?: 'estandar' | 'medida'
  unit?: string
  steelType?: string
  gauge?: string
}

type CatalogProduct = {
  _id: string
  name: string
  origin: 'nacional' | 'importado'
  brand: string
  steelType?: string
  gauge?: string
  specs?: string[]
  image?: string
  parts: {
    part?: string
    name: string
    qty: number
    unitPrice: number
    pricing?: 'estandar' | 'medida'
    unit?: string
    measure?: number
  }[]
}

type QuotePart = {
  partId: string
  name: string
  qty: number
  unitPrice: number
  pricing: 'estandar' | 'medida'
  unit: string
  measure: number
  steelType?: string
  gauge?: string
}

type QuoteItem = {
  name: string
  origin: 'nacional' | 'importado'
  brand: string
  image: string
  specs: string[]
  steelType: string
  gauge: string
  parts: QuotePart[]
}

function fromCatalog(product: CatalogProduct): QuoteItem {
  return {
    name: product.name,
    origin: product.origin,
    brand: product.brand || 'acervinox',
    image: product.image || '',
    specs: product.specs || [],
    steelType: product.steelType || '',
    gauge: product.gauge || '',
    parts: (product.parts || []).map((p) => ({
      partId: String(p.part || ''),
      name: p.name,
      qty: p.qty || 1,
      unitPrice: p.unitPrice,
      pricing: p.pricing === 'medida' ? 'medida' : 'estandar',
      unit: p.unit || 'm',
      measure: p.measure || (p.pricing === 'medida' ? 1 : 0),
    })),
  }
}

function fromPart(part: Part): QuotePart {
  const pricing = part.pricing === 'medida' ? 'medida' : 'estandar'
  return {
    partId: part._id,
    name: part.name,
    qty: 1,
    unitPrice: part.price,
    pricing,
    unit: part.unit || 'm',
    measure: pricing === 'medida' ? 1 : 0,
    steelType: part.steelType,
    gauge: part.gauge,
  }
}

function itemNet(item: QuoteItem) {
  return item.parts.reduce((sum, p) => sum + partAmount(p), 0)
}

function AddProductsBar({
  catalog,
  pick,
  onPick,
  onAdd,
  onBlank,
}: {
  catalog: CatalogProduct[]
  pick: string
  onPick: (id: string) => void
  onAdd: () => void
  onBlank: () => void
}) {
  return (
    <div className="quote-add">
      <label className="min-w-0 flex-1">
        Producto del catálogo
        <select className="field" value={pick} onChange={(e) => onPick(e.target.value)}>
          <option value="">Selecciona un producto</option>
          {catalog.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-red" disabled={!pick} onClick={onAdd}>
        <Plus size={16} /> Añadir producto
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBlank}>
        <Plus size={16} /> Producto desde piezas
      </button>
    </div>
  )
}

export function CotizadorPage() {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [partsLib, setPartsLib] = useState<Part[]>([])
  const [clients, setClients] = useState<AdminClient[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedId, setSavedId] = useState('')
  const [savedNumber, setSavedNumber] = useState('')
  const [clientModal, setClientModal] = useState(false)

  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientType, setClientType] = useState('')
  const [clientDocType, setClientDocType] = useState('')
  const [clientDocNumber, setClientDocNumber] = useState('')
  const [catalogPick, setCatalogPick] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])

  const addCatalog = (id: string) => {
    const product = catalog.find((p) => p._id === id)
    if (!product) return
    setItems((prev) => [...prev, fromCatalog(product)])
    setCatalogPick('')
    setOk('')
    setError('')
  }

  const addBlank = () => {
    setItems((prev) => [
      ...prev,
      {
        name: `Producto ${prev.length + 1}`,
        origin: 'nacional',
        brand: 'acervinox',
        image: '',
        specs: [],
        steelType: '',
        gauge: '',
        parts: [],
      },
    ])
    setOk('')
    setError('')
  }

  const load = async () => {
    const [c, cl, p] = await Promise.all([
      api('/api/quotes/catalog'),
      api('/api/clients'),
      api('/api/quotes/parts'),
    ])
    setCatalog(c.products)
    setClients(cl.clients)
    setPartsLib(p.parts)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, item) => s + itemNet(item), 0)
    const iva = Math.round(subtotal * IVA)
    return { subtotal, iva, total: subtotal + iva }
  }, [items])

  const fillClient = (client: AdminClient) => {
    setClientId(client._id)
    setClientName(client.name)
    setClientEmail(client.email)
    setClientPhone(client.phone)
    setClientType(client.type)
    setClientDocType(client.docType || '')
    setClientDocNumber(client.docNumber || '')
  }

  const applyClient = (id: string) => {
    setClientId(id)
    const client = clients.find((c) => c._id === id)
    if (client) fillClient(client)
  }

  const payload = () => ({
    clientId: clientId || undefined,
    clientName,
    clientEmail,
    clientPhone,
    clientType,
    clientDocType,
    clientDocNumber,
    items: items.map((item) => ({
      ...item,
      name: item.name.trim() || 'Producto',
    })),
  })

  const persist = async () => {
    if (!items.length) throw new Error('Añade al menos un producto del catálogo')
    const body = JSON.stringify(payload())
    if (savedId) {
      const data = await api(`/api/quotes/quotations/${savedId}`, { method: 'PUT', body })
      setSavedNumber(data.quotation.number)
      return data.quotation
    }
    const data = await api('/api/quotes/quotations', { method: 'POST', body })
    setSavedId(data.quotation._id)
    setSavedNumber(data.quotation.number)
    return data.quotation
  }

  const saveQuote = async () => {
    setError('')
    setOk('')
    setBusy(true)
    try {
      const quote = await persist()
      setOk(`Cotización ${quote.number} guardada. Ya aparece en el embudo de ventas.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const printQuote = async () => {
    setError('')
    setOk('')
    setBusy(true)
    const preview = openPrintWindow()
    try {
      const quote = await persist()
      await openPrintHtml(`/api/quotes/quotations/${quote._id}/print`, preview)
      setOk(`PDF de ${quote.number} listo. En el diálogo elige Guardar como PDF.`)
    } catch (err: any) {
      preview?.close()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const sendQuote = async () => {
    if (!clientEmail.trim()) {
      setError('Coloca el correo del cliente para enviar la cotización.')
      return
    }
    setError('')
    setOk('')
    setBusy(true)
    try {
      const quote = await persist()
      await api(`/api/quotes/quotations/${quote._id}/send`, { method: 'POST' })
      setOk(`Cotización ${quote.number} enviada a ${clientEmail}.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="admin-kicker">Ventas</p>
      <h1 className="font-display text-4xl font-bold">Cotizador</h1>
      <p className="mt-2 max-w-2xl text-steel">
        Elige un cliente, suma productos ya creados y genera el PDF o el correo. Las piezas se
        arman en{' '}
        <Link to="/admin/productos" className="font-semibold text-brand">
          Productos
        </Link>
        .
      </p>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Cliente</h2>
            <p>Puedes usar uno ya creado o registrar uno nuevo. Nombre, correo y teléfono son opcionales al cotizar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savedNumber && <span className="quote-number">{savedNumber}</span>}
            <button type="button" className="btn btn-ghost" onClick={() => setClientModal(true)}>
              <Plus size={16} /> Crear cliente
            </button>
          </div>
        </div>
        <div className="quote-grid">
          <label className="quote-span-2">
            Cliente existente
            <select className="field" value={clientId} onChange={(e) => applyClient(e.target.value)}>
              <option value="">Nuevo / sin ficha</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.docNumber ? ` · ${c.docNumber}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre
            <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <label>
            Tipo de documento
            <select className="field" value={clientDocType} onChange={(e) => setClientDocType(e.target.value)}>
              <option value="">Sin documento</option>
              {DOC_TYPES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Número de documento
            <input
              className="field"
              value={clientDocNumber}
              onChange={(e) => setClientDocNumber(e.target.value)}
            />
          </label>
          <label>
            Correo
            <input
              className="field"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </label>
          <label>
            Teléfono
            <input className="field" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </label>
          <label>
            Segmento
            <select className="field" value={clientType} onChange={(e) => setClientType(e.target.value)}>
              <option value="">Sin clasificar</option>
              {CLIENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Productos de la cotización</h2>
            <p>
              Puedes sumar varios productos. En cada uno elige si las piezas van estándar o por
              medida. Ejemplo: cubierta a $420.000/m × 1.35 m.
            </p>
          </div>
          <Link to="/admin/productos" className="btn btn-ghost">
            <Plus size={16} /> Crear pieza o producto
          </Link>
        </div>

        <AddProductsBar
          catalog={catalog}
          pick={catalogPick}
          onPick={setCatalogPick}
          onAdd={() => addCatalog(catalogPick)}
          onBlank={addBlank}
        />

        {items.length === 0 && (
          <p className="mt-4 text-sm text-steel">Aún no hay productos en esta cotización.</p>
        )}

        {items.map((item, index) => (
          <article key={index} className="quote-item">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[200px] flex-1">
                <input
                  className="field"
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                    )
                  }
                />
                <p className="mt-1 text-sm text-steel">
                  {item.origin === 'importado' ? 'Importado' : 'Fabricación nacional'}
                  {item.steelType ? ` · ${item.steelType}` : ''}
                  {item.gauge ? ` · ${item.gauge}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} /> Quitar
              </button>
            </div>
            {item.image && <img src={item.image} alt="" className="quote-thumb" />}
            <div className="table-wrap mt-4">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pieza</th>
                    <th>Cobro</th>
                    <th>Cant. / medida</th>
                    <th>Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {item.parts.map((part, pi) => (
                    <tr key={`${part.partId}-${pi}`}>
                      <td>{part.name}</td>
                      <td>
                        <select
                          className="field"
                          value={part.pricing}
                          onChange={(e) => {
                            const pricing = e.target.value as QuotePart['pricing']
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      parts: row.parts.map((p, j) =>
                                        j === pi
                                          ? {
                                              ...p,
                                              pricing,
                                              measure: pricing === 'medida' ? p.measure || 1 : p.measure,
                                            }
                                          : p,
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }}
                        >
                          <option value="estandar">Estándar</option>
                          <option value="medida">Por medida</option>
                        </select>
                      </td>
                      <td>
                        {part.pricing === 'medida' ? (
                          <label className="flex items-center gap-2 normal-case tracking-normal">
                            <NumberField
                              className="field w-24"
                              decimal
                              value={part.measure}
                              onChange={(measure) =>
                                setItems((prev) =>
                                  prev.map((row, i) =>
                                    i === index
                                      ? {
                                          ...row,
                                          parts: row.parts.map((p, j) =>
                                            j === pi ? { ...p, measure } : p,
                                          ),
                                        }
                                      : row,
                                  ),
                                )
                              }
                            />
                            <span className="text-xs text-steel">{unitLabel(part.unit)}</span>
                          </label>
                        ) : (
                          <NumberField
                            className="field w-20"
                            value={part.qty}
                            onChange={(qty) =>
                              setItems((prev) =>
                                prev.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        parts: row.parts.map((p, j) =>
                                          j === pi ? { ...p, qty } : p,
                                        ),
                                      }
                                    : row,
                                ),
                              )
                            }
                          />
                        )}
                      </td>
                      <td>
                        {part.pricing === 'medida'
                          ? `${cop(part.unitPrice)} / ${unitLabel(part.unit)}`
                          : cop(part.unitPrice)}
                      </td>
                      <td>{cop(partAmount(part))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-4 block">
              Añadir pieza a este producto
              <select
                className="field"
                defaultValue=""
                onChange={(e) => {
                  const part = partsLib.find((p) => p._id === e.target.value)
                  e.currentTarget.value = ''
                  if (!part) return
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, parts: [...row.parts, fromPart(part)] } : row,
                    ),
                  )
                }}
              >
                <option value="">Selecciona una pieza</option>
                {partsLib.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ·{' '}
                    {p.pricing === 'medida' ? `${cop(p.price)}/${unitLabel(p.unit)}` : cop(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-right text-sm text-steel">
              Neto {cop(itemNet(item))} · IVA 19% {cop(Math.round(itemNet(item) * IVA))} ·{' '}
              <strong className="text-brand">
                {cop(itemNet(item) + Math.round(itemNet(item) * IVA))}
              </strong>
            </p>
          </article>
        ))}

        {items.length > 0 && (
          <div className="mt-6 border-t border-[var(--color-line)] pt-5">
            <AddProductsBar
              catalog={catalog}
              pick={catalogPick}
              onPick={setCatalogPick}
              onAdd={() => addCatalog(catalogPick)}
              onBlank={addBlank}
            />
          </div>
        )}
      </section>

      <section className="admin-card quote-actions">
        <div>
          <p className="text-sm text-steel">
            Subtotal {cop(totals.subtotal)} · IVA 19% {cop(totals.iva)}
          </p>
          <strong className="font-display text-3xl text-brand">{cop(totals.total)}</strong>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={saveQuote}>
            <Save size={16} /> Guardar cliente / cotización
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={printQuote}>
            <FileDown size={16} /> Generar PDF
          </button>
          <button type="button" className="btn btn-red" disabled={busy} onClick={sendQuote}>
            <Mail size={16} /> Enviar al correo
          </button>
        </div>
      </section>

      <ClientModal
        open={clientModal}
        onClose={() => setClientModal(false)}
        onCreated={(client) => {
          setClients((prev) => [client, ...prev.filter((c) => c._id !== client._id)])
          fillClient(client)
        }}
      />
    </div>
  )
}
