export const PAY_METHOD_LABELS: Record<string, string> = {
  anticipo: 'Anticipo',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  wompi: 'Pasarela (app)',
  otro: 'Otro',
}

export const PAY_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'En proceso',
  failed: 'No aplicado',
}

export type Accounting = {
  totalAmount: number
  paid: number
  pending: number
  balance: number
  payments: Array<{
    id: string
    amount: number
    method: string
    source: string
    status: string
    reference: string
    note: string
    at: string
    by: string
  }>
}
