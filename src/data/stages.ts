export const STAGES = [
  { id: 'e1', code: 'E1', name: 'Diseño y planificación' },
  { id: 'e2', code: 'E2', name: 'Preparación de materiales' },
  { id: 'e3', code: 'E3', name: 'Corte / despiece' },
  { id: 'e4', code: 'E4', name: 'Armado y soldado' },
  { id: 'e5', code: 'E5', name: 'Pruebas y control de calidad' },
  { id: 'e6', code: 'E6', name: 'Instalación / entrega' },
] as const

export const CLIENT_TYPES = [
  { id: 'industria', label: 'Industria' },
  { id: 'gastronomico', label: 'Gastronómico' },
  { id: 'sanitario', label: 'Sanitario' },
] as const

export const DOC_TYPES = [
  { id: 'nit', label: 'NIT' },
  { id: 'cc', label: 'Cédula de ciudadanía' },
  { id: 'ce', label: 'Cédula de extranjería' },
  { id: 'pasaporte', label: 'Pasaporte' },
  { id: 'rut', label: 'RUT' },
] as const

export const FUNNEL_STAGES = [
  { id: 'cotizacion', code: 'E1', name: 'Cotización' },
  { id: 'negociacion', code: 'E2', name: 'Negociación' },
  { id: 'pedido', code: 'E3', name: 'Pedido confirmado' },
] as const

export const FUNNEL_LOST = { id: 'desistido', code: 'ED', name: 'Desistido' } as const

export const IVA = 0.19

export const MEASURE_UNITS = [
  { id: 'm', label: 'Metro (m)' },
  { id: 'm2', label: 'Metro cuadrado (m²)' },
  { id: 'und', label: 'Unidad' },
] as const

export function portalPath(role?: string) {
  if (role === 'admin') return '/admin'
  if (role === 'workshop') return '/workshop'
  return '/portal'
}
