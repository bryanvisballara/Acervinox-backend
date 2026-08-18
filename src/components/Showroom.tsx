import { products } from '../data/products'
import { Reveal } from './Reveal'

export function Showroom() {
  const row = [...products, ...products]
  return (
    <section id="showroom" className="overflow-hidden bg-white py-24 md:py-28">
      <div className="mx-auto max-w-[1320px] px-5 md:px-8">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-brand">
            04 — Showroom
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
            Un pasillo de acero. Sin filtros.
          </h2>
        </Reveal>
      </div>
      <div className="mt-12 overflow-hidden">
        <div className="marquee-track gap-4 pr-4">
          {row.map((p, i) => (
            <figure
              key={`${p.id}-${i}`}
              className="product-card relative h-[280px] w-[340px] shrink-0"
            >
              <img src={p.image} alt={p.name} />
              <figcaption className="product-meta">
                <span className="font-display text-lg font-bold">{p.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-hidden">
        <div className="marquee-track reverse gap-4 pr-4">
          {[...row].reverse().map((p, i) => (
            <figure
              key={`${p.id}-b-${i}`}
              className="product-card relative h-[220px] w-[280px] shrink-0"
            >
              <img src={p.image} alt={p.name} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
