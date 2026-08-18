import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-8 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <Logo className="h-[72px] sm:h-20" />
        <div className="text-sm text-steel">
          <div className="font-display text-base font-bold text-ink">Todo para tu negocio</div>
          <p className="mt-1">Equipos de acero inoxidable para cocinas y empresas.</p>
        </div>
        <nav className="flex flex-wrap gap-6 text-[12px] font-semibold uppercase tracking-[0.18em]">
          <a href="#catalogo" className="hover:text-brand">
            Catálogo
          </a>
          <a href="#oficio" className="hover:text-brand">
            Oficio
          </a>
          <a href="#contacto" className="hover:text-brand">
            Contacto
          </a>
        </nav>
      </div>
      <div className="border-t border-line py-4 text-center text-[11px] uppercase tracking-[0.22em] text-steel">
        © {new Date().getFullYear()} acervinox · Eficiencia forjada en acero
      </div>
    </footer>
  )
}
