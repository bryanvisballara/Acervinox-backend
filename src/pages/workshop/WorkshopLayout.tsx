import { CalendarClock, Layers, Menu, Shield, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initPush } from '../../lib/pushClient'

const links = [
  { to: '/workshop', label: 'Etapas de fabricación', icon: Layers, end: true },
  { to: '/workshop/mantenimientos', label: 'Mantenimientos', icon: CalendarClock, end: false },
]

export function WorkshopLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) initPush()
  }, [user])

  const initials = (user?.name || 'WS')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const close = () => setOpen(false)
  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="admin-app">
      {open && <button className="admin-backdrop" type="button" aria-label="Cerrar menú" onClick={close} />}
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img src="/logo-acervinox.png" alt="acervinox" />
        </div>
        <nav className="admin-nav">
          <p className="admin-nav-label">Taller</p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => {
                if (l.to === '/workshop') {
                  const path = location.pathname
                  const onFabrication =
                    path === '/workshop' ||
                    path.startsWith('/workshop/etapas') ||
                    /^\/workshop\/pedidos\/[^/]+/.test(path)
                  return `admin-link ${onFabrication ? 'is-active' : ''}`
                }
                return `admin-link ${isActive ? 'is-active' : ''}`
              }}
              onClick={close}
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <>
              <p className="admin-nav-label">Portales</p>
              <NavLink to="/admin" className="admin-link" onClick={close}>
                <Shield size={16} />
                Administrativo
              </NavLink>
            </>
          )}
        </nav>
        <div className="admin-sidebar-foot">
          <button type="button" className="admin-user-card" onClick={signOut} title="Cerrar sesión">
            <b className="admin-avatar">{initials}</b>
            <span className="admin-user-meta">
              <strong>{user?.name || 'Taller'}</strong>
              <span>Cerrar sesión</span>
            </span>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-btn" onClick={() => setOpen(true)} aria-label="Menú">
            {open ? <X size={18} /> : <Menu size={18} />}
            Menú
          </button>
          <button type="button" className="admin-top-user" onClick={signOut} title="Cerrar sesión">
            <b className="admin-avatar">{initials}</b>
            <span className="admin-user-meta">
              <strong>{user?.name}</strong>
              <span>Cerrar sesión</span>
            </span>
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
