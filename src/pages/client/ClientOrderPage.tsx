import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'

export function ClientOrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    api(`/api/portal/orders/${id}`)
      .then((d) => navigate(`/portal/guia/${d.product.tracking}`, { replace: true }))
      .catch(() => navigate('/portal', { replace: true }))
  }, [id, navigate])
  return <div className="capp-page text-steel">Cargando pedido…</div>
}
