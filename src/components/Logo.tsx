import { Link } from 'react-router-dom'

export function Logo({
  className = 'h-[58px] sm:h-[64px]',
  to = '/',
}: {
  className?: string
  to?: string
}) {
  return (
    <Link to={to} className="block shrink-0 no-underline" aria-label="acervinox, ir al inicio">
      <img
        src="/logo-acervinox.png"
        alt="acervinox — Eficiencia forjada en acero"
        className={`${className} w-auto object-contain object-left`}
      />
    </Link>
  )
}
