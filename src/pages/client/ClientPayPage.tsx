import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'

export function ClientPayPage() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const [message, setMessage] = useState('Confirmando tu pago…')
  const status = String(params.get('status') || '').toUpperCase()

  useEffect(() => {
    if (!code) {
      setMessage('No encontramos la guía de este pago.')
      return
    }
    const timer = window.setTimeout(() => {
      api(`/api/portal/track/${encodeURIComponent(code)}`)
        .then(() => {
          if (status === 'APPROVED' || status === 'APPROVE') {
            setMessage('Pago recibido. En unos segundos se refleja en tu estado de cuenta.')
          } else if (status && status !== 'APPROVED') {
            setMessage('El pago no se completó. Puedes intentarlo de nuevo desde el pedido.')
          } else {
            setMessage('Volviste de la pasarela. Revisa el estado de cuenta del pedido.')
          }
        })
        .catch(() => setMessage('Volviste de la pasarela. Abre el pedido para ver el saldo.'))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [code, status])

  return (
    <div className="capp-page">
      <h1 className="capp-title">Pago</h1>
      <p className="capp-copy">{message}</p>
      {code && (
        <Link to={`/portal/guia/${code}#cuenta`} className="btn btn-red capp-cta mt-6">
          Ver estado de cuenta
        </Link>
      )}
    </div>
  )
}
