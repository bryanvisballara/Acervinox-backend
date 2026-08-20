export const STAGES = [
  { id: 'e1', code: 'E1', name: 'Diseño y planificación' },
  { id: 'e2', code: 'E2', name: 'Preparación de materiales' },
  { id: 'e3', code: 'E3', name: 'Corte / despiece' },
  { id: 'e4', code: 'E4', name: 'Armado y soldado' },
  { id: 'e5', code: 'E5', name: 'Pruebas y control de calidad' },
  { id: 'e6', code: 'E6', name: 'Instalación / entrega' },
]

export const LAST_STAGE_INDEX = STAGES.length - 1

export const FUNNEL_STAGES = [
  { id: 'cotizacion', code: 'E1', name: 'Cotización' },
  { id: 'negociacion', code: 'E2', name: 'Negociación' },
  { id: 'pedido', code: 'E3', name: 'Pedido confirmado' },
]

export const FUNNEL_LOST = { id: 'desistido', code: 'ED', name: 'Desistido' }

export function stageByIndex(index) {
  return STAGES[index] || STAGES[0]
}
