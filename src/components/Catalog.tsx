import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { products, type Product } from '../data/products'
import { Reveal } from './Reveal'

export function Catalog() {
  const [active, setActive] = useState<Product | null>(null)
  const featured = products.find((p) => p.featured)!
  const rest = products.filter((p) => !p.featured)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <section id="catalogo" className="relative bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-5 md:px-8">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-brand">
            02 — Catálogo
          </p>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="max-w-xl font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
              Piezas que ya están en cocina.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-steel">
              Equipos reales, fabricados en acero inoxidable. Pasa el cursor: cada foto es del
              taller y del showroom.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Reveal className="lg:col-span-7 lg:row-span-2">
            <button
              type="button"
              className="product-card sheen h-full min-h-[420px] w-full text-left"
              onClick={() => setActive(featured)}
            >
              <img src={featured.image} alt={featured.name} />
              <span className="product-meta">
                <span className="block text-[10px] uppercase tracking-[0.28em] text-white/70">
                  {featured.category}
                </span>
                <span className="font-display text-3xl font-bold">{featured.name}</span>
              </span>
            </button>
          </Reveal>
          {rest.slice(0, 2).map((p, i) => (
            <Reveal key={p.id} delay={i * 80} className="lg:col-span-5">
              <button
                type="button"
                className="product-card sheen h-[240px] w-full text-left md:h-[260px]"
                onClick={() => setActive(p)}
              >
                <img src={p.image} alt={p.name} />
                <span className="product-meta">
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-white/70">
                    {p.category}
                  </span>
                  <span className="font-display text-xl font-bold">{p.name}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rest.slice(2).map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 70}>
              <button
                type="button"
                className="product-card sheen h-[250px] w-full text-left"
                onClick={() => setActive(p)}
              >
                <img src={p.image} alt={p.name} />
                <span className="product-meta">
                  <span className="block text-[10px] uppercase tracking-[0.28em] text-white/70">
                    {p.category}
                  </span>
                  <span className="font-display text-lg font-bold">{p.name}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {active && (
        <div className="login-backdrop" onClick={() => setActive(null)} role="presentation">
          <div
            className="relative w-full max-w-4xl steel-panel p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center bg-white text-ink"
              onClick={() => setActive(null)}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <img src={active.image} alt={active.name} className="max-h-[72vh] w-full object-contain" />
            <div className="flex items-center justify-between px-3 py-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-steel">
                  {active.category}
                </div>
                <div className="font-display text-2xl font-bold">{active.name}</div>
              </div>
              <a href="#contacto" className="btn btn-red" onClick={() => setActive(null)}>
                Cotizar esta pieza
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
