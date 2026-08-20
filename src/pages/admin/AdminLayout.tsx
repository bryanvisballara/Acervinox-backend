import {
  Boxes,
  Calculator,
  CalendarClock,
  ClipboardList,
  Filter,
  Layers,
  Menu,
  Package,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { initPush } from '../../lib/pushClient'
import { appHomePath } from '../../lib/native'

const links = [
  { to: '/admin', label: 'Etapas de fabricación', icon: Layers, end: true },
  { to: '/admin/productos', label: 'Catálogo', icon: Boxes, end: true },
  { to: '/admin/cotizador', label: 'Cotizador', icon: Calculator, end: false },
  { to: '/admin/embudo', label: 'Embudo de ventas', icon: Filter, end: false },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/admin/contabilidad', label: 'Contabilidad', icon: Wallet, end: false },
  { to: '/admin/mantenimientos', label: 'Mantenimientos', icon: CalendarClock, end: false },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) initPush()
  }, [user])
  const initials = (user?.name || 'AD')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const close = () => setOpen(false)
  const signOut = () => {
    logout()
    navigate(appHomePath())
  }

  return (
    <div className="admin-app">
      {open && <button className="admin-backdrop" type="button" aria-label="Cerrar menú" onClick={close} />}
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <img src="/logo-acervinox.png" alt="acervinox" />
        </div>
        <nav className="admin-nav">
          <p className="admin-nav-label">Gestión</p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => {
                if (l.to === '/admin') {
                  const path = location.pathname
                  const onFabrication =
                    path === '/admin' ||
                    path.startsWith('/admin/etapas') ||
                    /^\/admin\/pedidos\/[^/]+/.test(path)
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
          <p className="admin-nav-label">Portales</p>
          <NavLink to="/workshop" className="admin-link" onClick={close}>
            <Wrench size={16} />
            Workshop
          </NavLink>
          <NavLink to="/portal" className="admin-link" onClick={close}>
            <Package size={16} />
            Clientes
          </NavLink>
        </nav>
        <div className="admin-sidebar-foot">
          <button type="button" className="admin-user-card" onClick={signOut} title="Cerrar sesión">
            <b className="admin-avatar">{initials}</b>
            <span className="admin-user-meta">
              <strong>{user?.name || 'Administrador'}</strong>
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
