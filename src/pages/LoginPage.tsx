import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { afterLoginPath } from '../data/stages'
import { ClientAuth } from './client/ClientAuth'

const SPLASH_MS = 2550

export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const from = location.state as { from?: { pathname?: string; search?: string } } | null
  const [splash, setSplash] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('capp_splash') !== '1'
  })

  useEffect(() => {
    if (!splash) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(
      () => {
        sessionStorage.setItem('capp_splash', '1')
        setSplash(false)
      },
      reduce ? 200 : SPLASH_MS,
    )
    return () => window.clearTimeout(t)
  }, [splash])

  if (loading || splash) {
    return (
      <div className="capp capp-splash">
        <Loader />
      </div>
    )
  }

  if (user) {
    return <Navigate to={afterLoginPath(user.role, from?.from)} replace />
  }

  return <ClientAuth redirectFrom={from?.from} />
}
