import { ArrowUpRight } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { CodeInput } from '../components/CodeInput'
import { api } from '../lib/api'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setHint(
        data.devCode
          ? `Código de prueba (luego irá por Brevo): ${data.devCode}`
          : 'Si el correo existe, te enviaremos un código.',
      )
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar')
    } finally {
      setLoading(false)
    }
  }

  const reset = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un código de 6 dígitos para crear una nueva clave."
    >
      {step === 'email' ? (
        <form className="mt-8 grid gap-4" onSubmit={sendCode}>
          <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
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
          <button type="submit" className="btn btn-red sheen mt-2 w-full" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código'}
            <ArrowUpRight size={16} />
          </button>
        </form>
      ) : (
        <form className="mt-8 grid gap-4" onSubmit={reset}>
          {hint && <p className="text-sm font-semibold text-ink">{hint}</p>}
          <CodeInput value={code} onChange={setCode} />
          <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
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
          <button
            type="submit"
            className="btn btn-red sheen mt-2 w-full"
            disabled={loading || code.length !== 6}
          >
            Guardar contraseña
          </button>
        </form>
      )}
    </AuthShell>
  )
}
