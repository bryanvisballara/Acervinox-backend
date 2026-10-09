/** Rollo 1220 mm de ancho; pedimos habitualmente 40 m de largo (ajustable en la tabla). */
export const ROLL_WIDTH_MM = 1220
export const ROLL_ORDER_LENGTH_MM = 40_000

export type CutSheetPreset = { label: string; length: number; width: number }

/** Atajos en Admin → Cortes */
export const CUT_PAGE_PRESETS: CutSheetPreset[] = [
  { label: '1220 × 2440', length: 2440, width: 1220 },
  { label: '1000 × 2000', length: 2000, width: 1000 },
  { label: '1220 × Y (rollo 40 m)', length: ROLL_ORDER_LENGTH_MM, width: ROLL_WIDTH_MM },
  { label: '1500 × 3000', length: 3000, width: 1500 },
]

/** Atajos en cotizador → producto a la medida */
export const QUOTE_CUT_PRESETS: CutSheetPreset[] = [
  { label: '1220 × 2440 (rollo)', length: 2440, width: 1220 },
  { label: '5 × 10 (1524 × 3048)', length: 3048, width: 1524 },
  { label: '1000 × 2000', length: 2000, width: 1000 },
  { label: '1220 × Y (rollo 40 m)', length: ROLL_ORDER_LENGTH_MM, width: ROLL_WIDTH_MM },
  { label: '1500 × 3000', length: 3000, width: 1500 },
]
