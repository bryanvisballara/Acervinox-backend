import { ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CodeInput } from '../../components/CodeInput'
import { useAuth } from '../../context/AuthContext'
import { portalPath } from '../../data/stages'
import { api } from '../../lib/api'

type Screen = 'login' | 'register' | 'verify' | 'forgot' | 'reset'

export function ClientAuth() {
  const { login, setSession } = useAuth()
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)

  const go = (next: Screen) => {
    setError('')
    setHint('')
    setScreen(next)
  }

  const submitLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(portalPath(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email, password }),
      })
      setHint(
        data.devCode
          ? `Código de prueba: ${data.devCode}`
          : 'Te enviaremos un código de 6 dígitos al correo.',
      )
      setScreen('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const submitVerify = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      setSession(data.token, data.user)
      navigate(portalPath(data.user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar')
    } finally {
      setLoading(false)
    }
  }

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) })
      setHint(data.devCode ? `Código de prueba: ${data.devCode}` : 'Si el correo existe, enviaremos un código.')
      setScreen('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setLoading(false)
    }
  }

  const submitReset = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      })
      setPassword('')
      setCode('')
      go('login')
      setHint('Contraseña actualizada. Ya puedes entrar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar')
    } finally {
      setLoading(false)
    }
  }

  const title =
    screen === 'register'
      ? 'Crea tu cuenta'
      : screen === 'verify'
        ? 'Verifica tu correo'
        : screen === 'forgot' || screen === 'reset'
          ? 'Recuperar contraseña'
          : 'Inicia sesión'

  const subtitle =
    screen === 'register'
      ? 'Así ves el tracking de tus equipos y pides mantenimiento.'
      : screen === 'verify'
        ? 'Ingresa el código de 6 dígitos.'
        : screen === 'forgot'
          ? 'Te enviaremos un código para crear una nueva clave.'
          : screen === 'reset'
            ? 'Escribe el código y tu nueva contraseña.'
            : 'Entra con el correo de tu cuenta acervinox.'

  return (
    <div className="capp capp-auth">
      <div className="capp-page">
        <p className="capp-kicker">App clientes</p>
        <h1 className="capp-title">{title}</h1>
        <p className="capp-copy">{subtitle}</p>
        {hint && <p className="mt-3 text-sm font-semibold">{hint}</p>}

        {screen === 'login' && (
          <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
            <label className="capp-label">
              Correo
              <input
                className="field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="capp-label">
              Contraseña
              <span className="relative">
                <input
                  className="field pr-12"
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <button type="button" className="text-left text-sm font-semibold text-brand" onClick={() => go('forgot')}>
              ¿Olvidaste tu contraseña?
            </button>
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red capp-cta" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
              <ArrowUpRight size={16} />
            </button>
            <p className="text-center text-sm text-steel">
              ¿Aún no tienes cuenta?{' '}
              <button type="button" className="font-semibold text-brand" onClick={() => go('register')}>
                Regístrate
              </button>
            </p>
          </form>
        )}

        {screen === 'register' && (
          <form className="mt-6 grid gap-4" onSubmit={submitRegister}>
            <label className="capp-label">
              Nombre
              <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="capp-label">
              Teléfono
              <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="capp-label">
              Correo
              <input
                className="field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="capp-label">
              Contraseña
              <input
                className="field"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red capp-cta" disabled={loading}>
              {loading ? 'Creando…' : 'Continuar'}
            </button>
            <button type="button" className="text-sm font-semibold text-steel" onClick={() => go('login')}>
              Ya tengo cuenta
            </button>
          </form>
        )}

        {screen === 'verify' && (
          <form className="mt-6 grid gap-4" onSubmit={submitVerify}>
            <CodeInput value={code} onChange={setCode} />
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red capp-cta" disabled={loading || code.length !== 6}>
              Verificar correo
            </button>
          </form>
        )}

        {screen === 'forgot' && (
          <form className="mt-6 grid gap-4" onSubmit={submitForgot}>
            <label className="capp-label">
              Correo
              <input
                className="field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red capp-cta" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
            <button type="button" className="text-sm font-semibold text-steel" onClick={() => go('login')}>
              Volver al login
            </button>
          </form>
        )}

        {screen === 'reset' && (
          <form className="mt-6 grid gap-4" onSubmit={submitReset}>
            <CodeInput value={code} onChange={setCode} />
            <label className="capp-label">
              Nueva contraseña
              <input
                className="field"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-brand">{error}</p>}
            <button type="submit" className="btn btn-red capp-cta" disabled={loading || code.length !== 6}>
              Guardar contraseña
            </button>
          </form>
        )}

        <div className="capp-auth-brand">
          <img src="/logo-acervinox.png" alt="acervinox" className="capp-auth-logo" />
        </div>
      </div>
    </div>
  )
}
