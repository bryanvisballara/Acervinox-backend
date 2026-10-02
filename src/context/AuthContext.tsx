import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'

export type AuthUser = {
  id: string
  email: string
  name: string
  phone?: string
  role: 'admin' | 'workshop' | 'maintenance' | 'client'
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
  setSession: (token: string, user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const USER_KEY = 'acervinox_user'

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function writeCachedUser(next: AuthUser | null) {
  if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
  else localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      writeCachedUser(null)
      setLoading(false)
      return
    }
    setToken(token)
    const cached = readCachedUser()
    if (cached) setUser(cached)
    api('/api/auth/me')
      .then((data) => {
        setUser(data.user)
        writeCachedUser(data.user)
      })
      .catch((err: { status?: number }) => {
        if (err?.status === 401) {
          clearToken()
          writeCachedUser(null)
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(data.token)
        setUser(data.user)
        writeCachedUser(data.user)
        return data.user as AuthUser
      },
      logout() {
        clearToken()
        writeCachedUser(null)
        setUser(null)
      },
      setSession(token, nextUser) {
        setToken(token)
        setUser(nextUser)
        writeCachedUser(nextUser)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
