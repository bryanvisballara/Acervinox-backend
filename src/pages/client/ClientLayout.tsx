import { CalendarClock, LogOut, Search } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initPush } from '../../lib/pushClient'

export function ClientLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (user) initPush()
  }, [user])

  if (loading) {
    return <div className="capp grid min-h-svh place-items-center text-steel">Cargando…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role !== 'client' && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const first = user.name?.split(' ')[0] || 'Cliente'
  const onGuias =
    location.pathname === '/portal' ||
    location.pathname.startsWith('/portal/guia') ||
    location.pathname.startsWith('/portal/pedidos')

  return (
    <div className="capp">
      <header className="capp-top">
        <img src="/logo-acervinox.png" alt="acervinox" />
        <button
          type="button"
          className="capp-icon-btn"
          onClick={() => {
            logout()
          }}
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>
      <div className="capp-body">
        <Outlet context={{ first, user }} />
      </div>
      <nav className="capp-nav">
        <NavLink to="/portal" end className={onGuias ? 'is-on' : ''}>
          <Search size={18} />
          Guías
        </NavLink>
        <NavLink to="/portal/taller" className={({ isActive }) => (isActive ? 'is-on' : '')}>
          <CalendarClock size={18} />
          Mantenimiento
        </NavLink>
      </nav>
    </div>
  )
}
