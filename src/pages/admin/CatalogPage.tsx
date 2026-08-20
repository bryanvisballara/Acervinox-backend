import { Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { NumberField } from '../../components/NumberField'
import { MEASURE_UNITS } from '../../data/stages'
import { api } from '../../lib/api'
import { compressImage, cop, partAmount, unitLabel } from '../../lib/image'

type Part = {
  _id: string
  name: string
  category: string
  price: number
  pricing?: 'estandar' | 'medida'
  unit?: string
  steelType?: string
  gauge?: string
  notes?: string
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

type Tab = 'parts' | 'catalog'
type SelectedPart = { part: Part; qty: number; pricing: 'estandar' | 'medida'; measure: number }

export function CatalogPage() {
  const [tab, setTab] = useState<Tab>('parts')
  const [parts, setParts] = useState<Part[]>([])
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [partsForm, setPartsForm] = useState(0)
  const [catalogForm, setCatalogForm] = useState(0)

  const load = async () => {
    const [p, c] = await Promise.all([api('/api/quotes/parts'), api('/api/quotes/catalog')])
    setParts(p.parts)
    setCatalog(c.products)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  return (
    <div className="admin-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-kicker">Catálogo</p>
          <h1 className="font-display text-4xl font-bold">Productos</h1>
          <p className="mt-2 max-w-2xl text-steel">
            Primero crea las piezas (patas, pocetas, tapas) y luego ármalas en un producto. Ese
            producto es el que usas en el cotizador y en los pedidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setTab('parts')
              setOk('')
              setPartsForm((n) => n + 1)
            }}
          >
            <Plus size={16} /> Crear pieza
          </button>
          <button
            type="button"
            className="btn btn-red"
            onClick={() => {
              setTab('catalog')
              setOk('')
              setCatalogForm((n) => n + 1)
            }}
          >
            <Plus size={16} /> Crear producto
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button type="button" className={tab === 'parts' ? 'is-active' : ''} onClick={() => setTab('parts')}>
          Piezas
        </button>
        <button
          type="button"
          className={tab === 'catalog' ? 'is-active' : ''}
          onClick={() => setTab('catalog')}
        >
          Productos
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-4 text-sm text-emerald-700">{ok}</p>}

      {tab === 'parts' ? (
        <PartsPanel
          key={partsForm}
          parts={parts}
          onChange={load}
          onError={setError}
          onOk={setOk}
        />
      ) : (
        <CatalogPanel
          key={catalogForm}
          parts={parts}
          catalog={catalog}
          onChange={load}
          onError={setError}
          onOk={setOk}
        />
      )}
    </div>
  )
}

function PartsPanel({
  parts,
  onChange,
  onError,
  onOk,
}: {
  parts: Part[]
  onChange: () => Promise<void>
  onError: (msg: string) => void
  onOk: (msg: string) => void
}) {
  const [editing, setEditing] = useState<Part | null>(null)
  const [pricing, setPricing] = useState<'estandar' | 'medida'>('estandar')
  const [removing, setRemoving] = useState<Part | null>(null)
  const [busy, setBusy] = useState(false)

  const startEdit = (part: Part) => {
    setEditing(part)
    setPricing(part.pricing === 'medida' ? 'medida' : 'estandar')
    onOk('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setPricing('estandar')
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const payload = {
      name: data.get('name'),
      category: data.get('category'),
      price: Number(data.get('price')),
      pricing,
      unit: data.get('unit') || 'm',
      steelType: data.get('steelType'),
      gauge: data.get('gauge'),
      notes: data.get('notes'),
    }
    try {
      if (editing) {
        await api(`/api/quotes/parts/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        onOk('Pieza actualizada.')
      } else {
        await api('/api/quotes/parts', { method: 'POST', body: JSON.stringify(payload) })
        onOk('Pieza guardada.')
      }
      form.reset()
      cancelEdit()
      await onChange()
    } catch (err: any) {
      onError(err.message)
    }
  }

  const confirmDelete = async () => {
    if (!removing || busy) return
    setBusy(true)
    try {
      await api(`/api/quotes/parts/${removing._id}`, { method: 'DELETE' })
      if (editing?._id === removing._id) cancelEdit()
      setRemoving(null)
      onOk('Pieza borrada.')
      await onChange()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>{editing ? 'Editar pieza' : 'Crear pieza'}</h2>
          <p>
            Precio fijo (estándar) o precio por medida, por ejemplo cubierta a $420.000 el metro. Al
            cotizar eliges el modo y la medida.
          </p>
        </div>
      </div>
      <form className="quote-grid" key={editing?._id || 'new-part'} onSubmit={submit}>
        <label>
          Nombre
          <input className="field" name="name" required placeholder="Pata 1.00 m" defaultValue={editing?.name || ''} />
        </label>
        <label>
          Categoría
          <input className="field" name="category" placeholder="Patas, pocetas, tapas…" defaultValue={editing?.category || ''} />
        </label>
        <label>
          Tipo de precio
          <select
            className="field"
            value={pricing}
            onChange={(e) => setPricing(e.target.value as 'estandar' | 'medida')}
          >
            <option value="estandar">Estándar (precio fijo)</option>
            <option value="medida">Por medida (opcional)</option>
          </select>
        </label>
        {pricing === 'medida' && (
          <label>
            Unidad
            <select className="field" name="unit" defaultValue={editing?.unit || 'm'}>
              {MEASURE_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {pricing === 'medida' ? 'Precio por unidad (COP, neto)' : 'Precio (COP, neto)'}
          <input
            className="field"
            name="price"
            type="number"
            min={0}
            required
            placeholder={pricing === 'medida' ? '420000' : ''}
            defaultValue={editing?.price ?? ''}
          />
        </label>
        <label>
          Tipo de acero
          <input className="field" name="steelType" placeholder="AISI 304" defaultValue={editing?.steelType || ''} />
        </label>
        <label>
          Calibre
          <input className="field" name="gauge" placeholder="Cal. 18" defaultValue={editing?.gauge || ''} />
        </label>
        <label>
          Notas
          <input className="field" name="notes" defaultValue={editing?.notes || ''} />
        </label>
        <div className="quote-span-2 flex flex-wrap items-end gap-2">
          <button type="submit" className="btn btn-red">
            <Plus size={16} /> {editing ? 'Guardar cambios' : 'Guardar pieza'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="table-wrap mt-6">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Categoría</th>
              <th>Acero</th>
              <th>Calibre</th>
              <th>Precio</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parts.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  Todavía no hay piezas. Usa el botón Crear pieza.
                </td>
              </tr>
            ) : (
              parts.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.category || '—'}</td>
                  <td>{p.steelType || '—'}</td>
                  <td>{p.gauge || '—'}</td>
                  <td>
                    {p.pricing === 'medida' ? `${cop(p.price)} / ${unitLabel(p.unit)}` : cop(p.price)}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={() => startEdit(p)}>
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost !px-3 !py-2 text-brand"
                        onClick={() => setRemoving(p)}
                      >
                        <Trash2 size={14} /> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDelete
        open={Boolean(removing)}
        title="Borrar pieza"
        name={removing?.name || ''}
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function CatalogPanel({
  parts,
  catalog,
  onChange,
  onError,
  onOk,
}: {
  parts: Part[]
  catalog: CatalogProduct[]
  onChange: () => Promise<void>
  onError: (msg: string) => void
  onOk: (msg: string) => void
}) {
  const [editing, setEditing] = useState<CatalogProduct | null>(null)
  const [name, setName] = useState('')
  const [origin, setOrigin] = useState<'nacional' | 'importado'>('nacional')
  const [steelType, setSteelType] = useState('')
  const [gauge, setGauge] = useState('')
  const [image, setImage] = useState('')
  const [selected, setSelected] = useState<SelectedPart[]>([])
  const [removing, setRemoving] = useState<CatalogProduct | null>(null)
  const [busy, setBusy] = useState(false)

  const clearForm = () => {
    setEditing(null)
    setName('')
    setOrigin('nacional')
    setSteelType('')
    setGauge('')
    setImage('')
    setSelected([])
  }

  const startEdit = (product: CatalogProduct) => {
    setEditing(product)
    setName(product.name)
    setOrigin(product.origin)
    setSteelType(product.steelType || '')
    setGauge(product.gauge || '')
    setImage(product.image || '')
    setSelected(
      (product.parts || []).map((row) => {
        const found = parts.find((p) => p._id === String(row.part))
        const part: Part = found || {
          _id: String(row.part || row.name),
          name: row.name,
          category: '',
          price: row.unitPrice,
          pricing: row.pricing,
          unit: row.unit,
        }
        return {
          part,
          qty: row.qty || 1,
          pricing: row.pricing === 'medida' ? 'medida' : 'estandar',
          measure: row.measure || 0,
        }
      }),
    )
    onOk('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const add = (id: string) => {
    const part = parts.find((p) => p._id === id)
    if (!part) return
    const pricing = part.pricing === 'medida' ? 'medida' : 'estandar'
    setSelected((prev) => [...prev, { part, qty: 1, pricing, measure: pricing === 'medida' ? 1 : 0 }])
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      name,
      origin,
      brand: editing?.brand || 'acervinox',
      steelType,
      gauge,
      image,
      parts: selected.map((row) => ({
        part: /^[a-f0-9]{24}$/i.test(row.part._id) ? row.part._id : undefined,
        name: row.part.name,
        qty: row.qty,
        unitPrice: row.part.price,
        pricing: row.pricing,
        unit: row.part.unit || 'm',
        measure: row.measure,
      })),
    }
    try {
      if (editing) {
        await api(`/api/quotes/catalog/${editing._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        onOk('Producto actualizado.')
      } else {
        await api('/api/quotes/catalog', { method: 'POST', body: JSON.stringify(payload) })
        onOk('Producto guardado.')
      }
      clearForm()
      await onChange()
    } catch (err: any) {
      onError(err.message)
    }
  }

  const confirmDelete = async () => {
    if (!removing || busy) return
    setBusy(true)
    try {
      await api(`/api/quotes/catalog/${removing._id}`, { method: 'DELETE' })
      if (editing?._id === removing._id) clearForm()
      setRemoving(null)
      onOk('Producto borrado.')
      await onChange()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>{editing ? 'Editar producto' : 'Crear producto'}</h2>
          <p>Arma el producto con las piezas. Luego lo eliges al cotizar o al crear un pedido.</p>
        </div>
      </div>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="quote-grid">
          <label className="quote-span-2">
            Nombre
            <input
              className="field"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mesa 120 × 60 con poceta"
            />
          </label>
          <label>
            Origen
            <select className="field" value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)}>
              <option value="nacional">Fabricación nacional</option>
              <option value="importado">Importado</option>
            </select>
          </label>
          <label>
            Acero
            <input className="field" value={steelType} onChange={(e) => setSteelType(e.target.value)} />
          </label>
          <label>
            Calibre
            <input className="field" value={gauge} onChange={(e) => setGauge(e.target.value)} />
          </label>
          <label>
            Imagen
            <input
              className="field"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setImage(await compressImage(file))
              }}
            />
          </label>
        </div>
        {image && <img src={image} alt="" className="quote-thumb" />}
        <label>
          Piezas de este producto
          <select
            className="field"
            defaultValue=""
            onChange={(e) => {
              add(e.target.value)
              e.currentTarget.value = ''
            }}
          >
            <option value="">Añadir pieza</option>
            {parts.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} · {p.pricing === 'medida' ? `${cop(p.price)}/${unitLabel(p.unit)}` : cop(p.price)}
              </option>
            ))}
          </select>
        </label>
        {selected.map((row, i) => (
          <div key={`${row.part._id}-${i}`} className="flex flex-wrap items-center gap-3">
            <span className="flex-1">{row.part.name}</span>
            <select
              className="field w-40"
              value={row.pricing}
              onChange={(e) =>
                setSelected((prev) =>
                  prev.map((item, idx) =>
                    idx === i ? { ...item, pricing: e.target.value as 'estandar' | 'medida' } : item,
                  ),
                )
              }
            >
              <option value="estandar">Estándar</option>
              <option value="medida">Por medida</option>
            </select>
            {row.pricing === 'medida' ? (
              <NumberField
                className="field w-28"
                decimal
                value={row.measure}
                onChange={(measure) =>
                  setSelected((prev) => prev.map((item, idx) => (idx === i ? { ...item, measure } : item)))
                }
              />
            ) : (
              <NumberField
                className="field w-20"
                value={row.qty}
                onChange={(qty) =>
                  setSelected((prev) => prev.map((item, idx) => (idx === i ? { ...item, qty } : item)))
                }
              />
            )}
            <span>
              {cop(
                partAmount({
                  pricing: row.pricing,
                  unitPrice: row.part.price,
                  qty: row.qty,
                  measure: row.measure,
                }),
              )}
            </span>
            <button
              type="button"
              className="text-brand"
              onClick={() => setSelected((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-red w-fit">
            {editing ? 'Guardar cambios' : 'Guardar producto'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={clearForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="table-wrap mt-6">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Origen</th>
              <th>Acero</th>
              <th>Piezas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {catalog.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No hay productos. Crea las piezas y luego ármalos aquí.
                </td>
              </tr>
            ) : (
              catalog.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>{p.origin === 'importado' ? 'Importado' : 'Nacional'}</td>
                  <td>{[p.steelType, p.gauge].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{p.parts.length}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-ghost !px-3 !py-2" onClick={() => startEdit(p)}>
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost !px-3 !py-2 text-brand"
                        onClick={() => setRemoving(p)}
                      >
                        <Trash2 size={14} /> Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDelete
        open={Boolean(removing)}
        title="Borrar producto"
        name={removing?.name || ''}
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function ConfirmDelete({
  open,
  title,
  name,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  name: string
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={() => !busy && onClose()}>
      <p className="mt-4 text-sm text-steel">
        ¿Borrar <strong>{name}</strong>? Esta acción no se puede deshacer.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-red" disabled={busy} onClick={onConfirm}>
          {busy ? 'Borrando…' : 'Sí, borrar'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
