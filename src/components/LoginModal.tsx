import { ArrowUpRight, Eye, EyeOff, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Logo } from './Logo'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!open) {
      setShow(false)
      setError('')
      setLoading(false)
      setUserName('')
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      sessionStorage.setItem('acervinox_token', data.token)
      setUserName(data.user?.name || data.user?.email || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-backdrop" onClick={onClose} role="presentation">
      <div
        className="login-card steel-panel p-7 sm:p-9"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          type="button"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center text-steel hover:text-ink"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <Logo className="h-[88px]" />
        <p id="login-title" className="mt-7 font-display text-3xl font-bold leading-none">
          Portal de clientes
        </p>
        <p className="mt-2 text-sm text-steel">
          Pedidos, cotizaciones y seguimiento de fabricación.
        </p>

        {userName ? (
          <div className="mt-8 border border-line bg-white p-5">
            <p className="font-display text-xl font-bold">Sesión iniciada</p>
            <p className="mt-2 text-sm leading-relaxed text-steel">
              Bienvenido, {userName}. El panel de trabajo se construye sobre este acceso.
            </p>
            <button type="button" className="btn btn-red mt-6 w-full" onClick={onClose}>
              Continuar
            </button>
          </div>
        ) : (
          <form className="mt-8 grid gap-4" onSubmit={submit}>
            <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
              Correo
              <input
                className="field"
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
              Contraseña
              <span className="relative">
                <input
                  className="field pr-12"
                  type={show ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red sheen mt-2 w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
              <ArrowUpRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
