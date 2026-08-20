import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="auth-page">
      <div className="auth-card steel-panel p-7 sm:p-9">
        <Logo className="h-[88px]" />
        <p className="mt-7 font-display text-3xl font-bold leading-none">{title}</p>
        <p className="mt-2 text-sm text-steel">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-steel">
          <Link to="/" className="font-semibold text-brand no-underline hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  )
}
