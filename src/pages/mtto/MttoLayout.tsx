import { CalendarClock, ClipboardPen, FileText, Menu, PackagePlus, Shield, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initPush } from '../../lib/pushClient'

const links = [
  { to: '/mtto', label: 'Citas', icon: CalendarClock, end: true },
  { to: '/mtto/actas/nueva', label: 'Nueva acta', icon: ClipboardPen, end: false },
  { to: '/mtto/actas', label: 'Actas', icon: FileText, end: true },
  { to: '/mtto/materiales', label: 'Solicitar materiales', icon: PackagePlus, end: false },
]

export function MttoLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) initPush()
  }, [user])

  const initials = (user?.name || 'MT')
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
          <p className="admin-nav-label">Mantenimientos</p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `admin-link ${isActive ? 'is-active' : ''}`}
              onClick={close}
            >
              <l.icon size={16} />
              {l.label}
            </NavLink>
          ))}
          <p className="admin-nav-label">Portales</p>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="admin-link" onClick={close}>
              <Shield size={16} />
              Administrativo
            </NavLink>
          )}
        </nav>
        <div className="admin-sidebar-foot">
          <button type="button" className="admin-user-card" onClick={signOut} title="Cerrar sesión">
            <b className="admin-avatar">{initials}</b>
            <span className="admin-user-meta">
              <strong>{user?.name || 'Técnico'}</strong>
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
