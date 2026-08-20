import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth({
  roles,
  children,
}: {
  roles: Array<'admin' | 'workshop' | 'client'>
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-svh place-items-center text-steel">Cargando…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
