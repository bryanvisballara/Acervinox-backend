import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function PlaceholderPortal({
  title,
  copy,
}: {
  title: string
  copy: string
}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="auth-page">
      <div className="auth-card steel-panel p-8 text-center">
        <p className="admin-kicker">Próximamente</p>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-steel">{copy}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn btn-ghost">
            Inicio
          </Link>
          <button
            type="button"
            className="btn btn-red"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
