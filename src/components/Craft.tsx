import { processSteps } from '../data/products'
import { Reveal } from './Reveal'

export function Craft() {
  return (
    <section id="oficio" className="relative overflow-hidden bg-mist py-24 md:py-32">
      <div className="relative mx-auto max-w-[1320px] px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-brand">
              03 — Oficio
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
              De la lámina a la línea de fuego.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-steel">
              No ensamblamos catálogo genérico. Cortamos, plegamos y soldamos cada equipo para el
              ritmo de tu negocio: restaurante, hotel, planta o comedor industrial.
            </p>
            <div className="mt-10 overflow-hidden border border-line bg-white">
              <img
                src="/products/pulidoras.png"
                alt="Mesas de pulido en acero inoxidable"
                className="h-64 w-full object-cover"
              />
            </div>
          </Reveal>

          <div>
            {processSteps.map((step, i) => (
              <Reveal key={step.n} delay={i * 70}>
                <article className="group grid grid-cols-[88px_1fr] gap-4 border-b border-line py-7">
                  <div className="font-display text-3xl font-bold text-brand/80 transition-colors group-hover:text-brand">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold">{step.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-steel">{step.copy}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
