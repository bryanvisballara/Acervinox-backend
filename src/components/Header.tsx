import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'

const links = [
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#oficio', label: 'Oficio' },
  { href: '#showroom', label: 'Showroom' },
  { href: '#contacto', label: 'Contacto' },
]

export function Header({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className={`header ${scrolled || open ? 'scrolled' : ''}`}>
        <div className="mx-auto flex h-full w-full max-w-[1320px] items-center justify-between px-5 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-9 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-red sheen" onClick={onLogin}>
              Iniciar sesión
            </button>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center border border-line lg:hidden"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-panel top-[88px] lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="border-b border-line py-4 font-display text-3xl font-bold"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            className="btn btn-red mt-6 w-full"
            onClick={() => {
              setOpen(false)
              onLogin()
            }}
          >
            Iniciar sesión
          </button>
        </div>
      )}
    </>
  )
}
