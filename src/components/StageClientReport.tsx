import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { STAGES } from '../data/stages'
import { api } from '../lib/api'
import { compressImage } from '../lib/image'

export type StageReport = {
  stageIndex: number
  observations?: string
  photos?: string[]
  updatedAt?: string
  by?: string
}

export function reportForStage(reports: StageReport[] | undefined, stageIndex: number): StageReport {
  return (
    reports?.find((r) => r.stageIndex === stageIndex) || {
      stageIndex,
      observations: '',
      photos: [],
    }
  )
}

export function StageClientReport({
  productId,
  stageIndex,
  report,
  onSaved,
  editable,
}: {
  productId: string
  stageIndex: number
  report: StageReport
  onSaved?: (product: any) => void
  editable: boolean
}) {
  const stage = STAGES[stageIndex]
  const cameraRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const [observations, setObservations] = useState(report.observations || '')
  const [photos, setPhotos] = useState<string[]>(report.photos || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    setObservations(report.observations || '')
    setPhotos(report.photos || [])
    setError('')
    setOk('')
  }, [productId, stageIndex, report.observations, report.photos?.length])

  const persist = async (nextPhotos = photos, nextNotes = observations) => {
    setBusy(true)
    setError('')
    setOk('')
    try {
      const data = await api(`/api/products/${productId}/report`, {
        method: 'PATCH',
        body: JSON.stringify({
          stageIndex,
          observations: nextNotes,
          photos: nextPhotos,
        }),
      })
      onSaved?.(data.product)
      setOk('Guardado. El cliente ya puede verlo.')
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setError('')
    const room = 10 - photos.length
    if (room <= 0) {
      setError('Máximo 10 fotos por etapa')
      return
    }
    const next = [...photos]
    for (const file of Array.from(list).slice(0, room)) {
      next.push(await compressImage(file, 960, 0.72))
    }
    setPhotos(next)
    await persist(next, observations)
  }

  return (
    <div>
      <div className="admin-card-head">
        <div>
          <h2>Avance para el cliente</h2>
          <p>
            {stage?.code} · {stage?.name}. Estas notas y fotos las ve el cliente en su portal.
          </p>
        </div>
      </div>
      {editable ? (
        <label className="mt-2 grid gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
          Observaciones
          <textarea
            className="field min-h-[110px]"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Qué se hizo en esta etapa, medidas, pendientes, etc."
          />
        </label>
      ) : (
        <div className="tech-notes mt-2">
          <span className="admin-kicker">Observaciones</span>
          <p>{observations || 'Aún no hay observaciones en esta etapa.'}</p>
        </div>
      )}

      <div className="mt-4">
        <span className="admin-kicker">Fotos</span>
        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-steel">Todavía no hay fotos de esta etapa.</p>
        ) : (
          <div className="photo-grid mt-3">
            {photos.map((src, i) => (
              <figure key={`${i}-${src.slice(-12)}`} className="photo-cell">
                <img src={src} alt={`Foto ${i + 1} de ${stage?.name || 'etapa'}`} />
                {editable && (
                  <button
                    type="button"
                    className="photo-del"
                    aria-label="Quitar foto"
                    onClick={async () => {
                      const next = photos.filter((_, idx) => idx !== i)
                      setPhotos(next)
                      await persist(next, observations)
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={cameraRef}
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              await addFiles(e.target.files)
              e.currentTarget.value = ''
            }}
          />
          <input
            ref={filesRef}
            className="hidden"
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              await addFiles(e.target.files)
              e.currentTarget.value = ''
            }}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-red"
              disabled={busy || photos.length >= 10}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={16} /> Tomar foto
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || photos.length >= 10}
              onClick={() => filesRef.current?.click()}
            >
              <ImagePlus size={16} /> Subir fotos
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => persist()}>
              {busy ? 'Guardando…' : 'Guardar observaciones'}
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-3 text-sm text-brand">{error}</p>}
      {ok && <p className="mt-3 text-sm text-emerald-700">{ok}</p>}
    </div>
  )
}
