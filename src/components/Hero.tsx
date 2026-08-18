import { ArrowUpRight } from 'lucide-react'
import { useRef, type MouseEvent } from 'react'

export function Hero({ onLogin }: { onLogin: () => void }) {
  const frame = useRef<HTMLDivElement>(null)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = frame.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1200px) rotateX(${y * -6}deg) rotateY(${x * 8}deg)`
  }

  const onLeave = () => {
    if (frame.current) frame.current.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)'
  }

  return (
    <section
      id="inicio"
      className="relative min-h-svh overflow-hidden hero-grid pt-24"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="pointer-events-none absolute -right-24 top-24 h-[520px] w-[520px] rounded-full bg-brand/5 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100svh-96px)] w-full max-w-[1320px] items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="relative z-10 max-w-[640px]">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.42em] text-steel">
            01 — Manufactura inoxidable
          </p>
          <h1 className="hero-title text-ink">
            <span className="text-[32px] sm:text-[42px] lg:text-[48px]">
              <em>Acero que trabaja</em>
            </span>
            <span className="text-[48px] sm:text-[68px] lg:text-[82px]">
              <em className="text-brand">décadas.</em>
            </span>
          </h1>
          <p className="mt-8 max-w-md text-[17px] leading-relaxed text-steel">
            Fabricamos mesas, cocinas, hornos, freidoras y estaciones a medida para gastronomía e
            industria. Corte, plegado, TIG y pulido — todo en un solo taller.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a href="#catalogo" className="btn btn-red sheen">
              Ver catálogo
              <ArrowUpRight size={16} />
            </a>
            <button type="button" className="btn btn-ghost" onClick={onLogin}>
              Portal clientes
            </button>
          </div>
          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-line pt-6 max-w-lg">
            {[
              ['AISI 304', 'Acero sanitario'],
              ['TIG', 'Soldadura limpia'],
              ['A medida', 'Cada cocina, un plano'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="font-display text-lg font-bold">{k}</div>
                <div className="mt-1 text-xs text-steel">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            ref={frame}
            className="steel-panel relative ml-auto w-full max-w-[640px] overflow-hidden transition-transform duration-300 ease-out"
          >
            <div className="absolute left-4 top-4 z-10 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] backdrop-blur">
              Showroom · Línea caliente
            </div>
            <img
              src="/products/cocina-integral.png"
              alt="Cocina industrial acervinox en acero inoxidable"
              className="slash aspect-[4/5] w-full object-cover object-center sm:aspect-[5/5.2]"
            />
          </div>
          <div className="absolute -bottom-5 -left-4 hidden bg-brand px-5 py-3 text-white md:block">
            <div className="font-display text-sm font-bold">
              Eficiencia forjada en acero
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
