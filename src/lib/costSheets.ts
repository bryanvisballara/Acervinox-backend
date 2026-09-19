export const COST_UNITS: Record<string, string> = { und: 'und', m: 'm', m2: 'm²', dia: 'día' }

export const COST_SECTIONS = [
  { id: 'mp', label: 'Materia prima' },
  { id: 'inst', label: 'Costo instalación' },
] as const

export const COST_SHEETS = [
  { section: 'mp', id: 'acero', label: 'Acero', categories: ['acero_304', 'acero_430', 'tubos'] },
  { section: 'mp', id: 'fabricacion', label: 'Tiempo de fabricación', categories: ['fabricacion'] },
  { section: 'mp', id: 'abrasivos', label: 'Abrasivos', categories: ['abrasivos'] },
  { section: 'mp', id: 'accesorios', label: 'Accesorios', categories: ['accesorios', 'quemadores'] },
  { section: 'mp', id: 'otros', label: 'Otros', categories: ['otros'] },
  { section: 'inst', id: 'inst_fab', label: 'Tiempo de fabricación', categories: ['inst_fabricacion'] },
  { section: 'inst', id: 'inst_abr', label: 'Abrasivos', categories: ['inst_abrasivos'] },
  { section: 'inst', id: 'inst_otros', label: 'Otros', categories: ['inst_otros'] },
] as const

export const LABOR_CATS = ['fabricacion', 'inst_fabricacion']

export type CostSectionId = (typeof COST_SECTIONS)[number]['id']
export type CostSheetId = (typeof COST_SHEETS)[number]['id']

export type CostCatalogItem = {
  _id: string
  category: string
  name: string
  variant: string
  unit: string
  price: number
}

export type CostLine = {
  key: string
  item?: string
  category: string
  name: string
  variant: string
  unit: string
  qty: number
  price: number
}

export function costLineTotal(line: Pick<CostLine, 'qty' | 'price'>) {
  return Math.round((Number(line.qty) || 0) * (Number(line.price) || 0))
}

export function sheetsOf(section: CostSectionId) {
  return COST_SHEETS.filter((s) => s.section === section)
}

export function firstSheet(section: CostSectionId): CostSheetId {
  return sheetsOf(section)[0].id
}

export function catsOf(id: string) {
  return [...(COST_SHEETS.find((s) => s.id === id)?.categories || [])]
}

export function lineSection(category: string): CostSectionId {
  return COST_SHEETS.find((s) => (s.categories as readonly string[]).includes(category))?.section || (String(category).startsWith('inst_') ? 'inst' : 'mp')
}

export function isOtherTab(id: string) {
  return id === 'otros' || id === 'inst_otros'
}

export function costTotals(lines: CostLine[]) {
  const materialTotal = lines.filter((l) => !LABOR_CATS.includes(l.category)).reduce((s, l) => s + costLineTotal(l), 0)
  const laborTotal = lines.filter((l) => LABOR_CATS.includes(l.category)).reduce((s, l) => s + costLineTotal(l), 0)
  const total = materialTotal + laborTotal
  return { materialTotal, laborTotal, total, sale50: Math.round(total * 1.5), resale70: Math.round(total * 1.7) }
}

export function newCostKey() {
  return Math.random().toString(36).slice(2, 8)
}
