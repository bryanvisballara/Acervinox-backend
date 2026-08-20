import { ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { CodeInput } from '../components/CodeInput'
import { useAuth } from '../context/AuthContext'
import { portalPath } from '../data/stages'
import { api } from '../lib/api'

export function RegisterPage() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)

  const submitForm = async (e: FormEvent) => {
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
          ? `Código de prueba (luego irá por Brevo): ${data.devCode}`
          : 'Cuando conectemos Brevo, el código llegará a tu correo.',
      )
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar')
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      setSession(data.token, data.user)
      navigate(portalPath(data.user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Verificaremos tu correo con un código de 6 dígitos."
    >
      {step === 'form' ? (
        <form className="mt-8 grid gap-4" onSubmit={submitForm}>
          <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
            Nombre
            <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
            Teléfono
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
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
          <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-steel">
            Contraseña
            <span className="relative">
              <input
                className="field pr-12"
                type={show ? 'text' : 'password'}
                required
                minLength={6}
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
          {error && <p className="text-sm text-brand">{error}</p>}
          <button type="submit" className="btn btn-red sheen mt-2 w-full" disabled={loading}>
            {loading ? 'Creando…' : 'Continuar'}
            <ArrowUpRight size={16} />
          </button>
        </form>
      ) : (
        <form className="mt-8 grid gap-4" onSubmit={submitCode}>
          <p className="text-sm text-steel">
            Ingresa el código de 6 dígitos. El envío por Brevo se conecta después.
          </p>
          {hint && <p className="text-sm font-semibold text-ink">{hint}</p>}
          <CodeInput value={code} onChange={setCode} />
          {error && <p className="text-sm text-brand">{error}</p>}
          <button
            type="submit"
            className="btn btn-red sheen mt-2 w-full"
            disabled={loading || code.length !== 6}
          >
            Verificar correo
          </button>
        </form>
      )}
    </AuthShell>
  )
}
