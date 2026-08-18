const items = [
  'AISI 304',
  'Soldadura TIG',
  'Pulido sanitario',
  'Fabricación a medida',
  'Cocinas industriales',
  'Línea caliente',
  'Mesadas y fregaderos',
  'Hornos y vitrinas',
]

export function Marquee({ reverse = false }: { reverse?: boolean }) {
  const row = [...items, ...items]
  return (
    <div className="overflow-hidden border-y border-line bg-ink text-white">
      <div className={`marquee-track py-4 ${reverse ? 'reverse' : ''}`}>
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-8 px-4">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.28em]">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rotate-45 bg-brand" />
          </span>
        ))}
      </div>
    </div>
  )
}
