import { ArrowUpRight } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { api } from '../lib/api'
import { Reveal } from './Reveal'

export function Contact() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/api/leads', {
        method: 'POST',
        body: JSON.stringify({ name, company, email, message }),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contacto" className="relative bg-ink py-24 text-white md:py-32">
      <div className="relative mx-auto grid max-w-[1320px] gap-14 px-5 md:px-8 lg:grid-cols-2">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-brand">
            05 — Contacto
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
            Cuéntanos el plano.
            <span className="block text-brand">Nosotros el acero.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/65">
            Restaurante nuevo, remodelación o línea completa: cotizamos mesadas, cocinas, hornos y
            estaciones a la medida de tu operación.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {sent ? (
            <div className="border border-white/15 bg-white/5 p-8">
              <p className="font-display text-3xl font-bold">Mensaje recibido.</p>
              <p className="mt-3 text-white/70">
                Ya quedó en el taller. Te escribimos para armar la cotización.
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Nombre
                  <input
                    className="field bg-white"
                    required
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                  Empresa
                  <input
                    className="field bg-white"
                    placeholder="Restaurante o planta"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </label>
              </div>
              <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Correo
                <input
                  className="field bg-white"
                  type="email"
                  required
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Qué necesitas
                <textarea
                  className="field min-h-32 bg-white"
                  required
                  placeholder="Cocina lineal, mesadas, freidoras…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <button type="submit" className="btn btn-red sheen mt-2 w-fit" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar cotización'}
                <ArrowUpRight size={16} />
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
