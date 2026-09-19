export type CutPieceInput = {
  id: string
  label: string
  length: number
  width: number
  qty: number
  material: string
  allowRotate: boolean
}

export type StockInput = {
  id: string
  label: string
  length: number
  width: number
  qty: number
  material: string
}

export type PlacedPiece = {
  instanceId: string
  pieceId: string
  label: string
  x: number
  y: number
  length: number
  width: number
  rotated: boolean
}

export type Leftover = {
  x: number
  y: number
  length: number
  width: number
}

export type UsedSheet = {
  id: string
  stockId: string
  stockLabel: string
  length: number
  width: number
  material: string
  pieces: PlacedPiece[]
  leftovers: Leftover[]
  usedArea: number
  utilization: number
}

export type UnplacedPiece = {
  pieceId: string
  label: string
  length: number
  width: number
  qty: number
  reason: string
}

export type OptimizeResult = {
  sheets: UsedSheet[]
  unplaced: UnplacedPiece[]
  sheetsUsed: number
  usedArea: number
  stockArea: number
  leftoverArea: number
  utilization: number
  scrap: number
}

type FreeRect = { x: number; y: number; w: number; h: number }

type WorkSheet = {
  id: string
  stockId: string
  stockLabel: string
  length: number
  width: number
  material: string
  pieces: PlacedPiece[]
  free: FreeRect[]
}

const EPS = 0.01

function mm(n: number) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0
}

function area(w: number, h: number) {
  return w * h
}

function sameMaterial(a: string, b: string) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function intersects(a: FreeRect, b: FreeRect) {
  return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS
}

function contains(outer: FreeRect, inner: FreeRect) {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  )
}

function splitFree(free: FreeRect, used: FreeRect): FreeRect[] {
  if (!intersects(free, used)) return [free]
  const next: FreeRect[] = []
  if (used.x > free.x + EPS) {
    next.push({ x: free.x, y: free.y, w: used.x - free.x, h: free.h })
  }
  const usedRight = used.x + used.w
  const freeRight = free.x + free.w
  if (usedRight < freeRight - EPS) {
    next.push({ x: usedRight, y: free.y, w: freeRight - usedRight, h: free.h })
  }
  if (used.y > free.y + EPS) {
    next.push({ x: free.x, y: free.y, w: free.w, h: used.y - free.y })
  }
  const usedTop = used.y + used.h
  const freeTop = free.y + free.h
  if (usedTop < freeTop - EPS) {
    next.push({ x: free.x, y: usedTop, w: free.w, h: freeTop - usedTop })
  }
  return next.filter((r) => r.w > EPS && r.h > EPS)
}

function pruneFree(rects: FreeRect[]) {
  return rects.filter((rect, i) => {
    if (rect.w <= EPS || rect.h <= EPS) return false
    return !rects.some((other, j) => i !== j && contains(other, rect))
  })
}

function placeOnSheet(sheet: WorkSheet, pw: number, ph: number, kerf: number) {
  let best: { free: FreeRect; short: number; long: number; leftover: number } | null = null
  for (const free of sheet.free) {
    if (pw <= free.w + EPS && ph <= free.h + EPS) {
      const leftoverW = free.w - pw
      const leftoverH = free.h - ph
      const short = Math.min(leftoverW, leftoverH)
      const long = Math.max(leftoverW, leftoverH)
      const leftover = leftoverW * leftoverH
      if (
        !best ||
        short < best.short - EPS ||
        (Math.abs(short - best.short) <= EPS && long < best.long - EPS) ||
        (Math.abs(short - best.short) <= EPS && Math.abs(long - best.long) <= EPS && leftover < best.leftover)
      ) {
        best = { free, short, long, leftover }
      }
    }
  }
  if (!best) return null

  const used: FreeRect = {
    x: best.free.x,
    y: best.free.y,
    w: pw + kerf,
    h: ph + kerf,
  }
  sheet.free = pruneFree(sheet.free.flatMap((free) => splitFree(free, used)))
  return { x: best.free.x, y: best.free.y, short: best.short, long: best.long }
}

function orientations(length: number, width: number, allowRotate: boolean) {
  const a = { length, width, rotated: false }
  if (!allowRotate || Math.abs(length - width) <= EPS) return [a]
  return [a, { length: width, width: length, rotated: true }]
}

function canFitStock(stock: StockInput, length: number, width: number, allowRotate: boolean) {
  return orientations(length, width, allowRotate).some(
    (o) => o.length <= stock.length + EPS && o.width <= stock.width + EPS,
  )
}

function openSheet(stock: StockInput, index: number): WorkSheet {
  return {
    id: `${stock.id}-${index}`,
    stockId: stock.id,
    stockLabel: stock.label || `${stock.length} × ${stock.width}`,
    length: stock.length,
    width: stock.width,
    material: stock.material,
    pieces: [],
    free: [{ x: 0, y: 0, w: stock.length, h: stock.width }],
  }
}

export function optimizeCuts(
  pieces: CutPieceInput[],
  stocks: StockInput[],
  { kerf = 0 }: { kerf?: number } = {},
): OptimizeResult {
  const gap = Math.max(0, mm(kerf))
  const readyStocks = stocks
    .map((s) => ({
      ...s,
      length: mm(s.length),
      width: mm(s.width),
      qty: Number(s.qty) > 0 ? Math.floor(Number(s.qty)) : Number.POSITIVE_INFINITY,
      material: String(s.material || '').trim() || 'lámina',
      label: String(s.label || '').trim(),
    }))
    .filter((s) => s.length > 0 && s.width > 0)

  const jobs = pieces
    .flatMap((p) => {
      const length = mm(p.length)
      const width = mm(p.width)
      const qty = Math.max(0, Math.floor(Number(p.qty) || 0))
      if (length <= 0 || width <= 0 || qty <= 0) return []
      return Array.from({ length: qty }, (_, i) => ({
        instanceId: `${p.id}-${i + 1}`,
        pieceId: p.id,
        label: String(p.label || '').trim() || `${length}×${width}`,
        length,
        width,
        material: String(p.material || '').trim() || 'lámina',
        allowRotate: Boolean(p.allowRotate),
      }))
    })
    .sort((a, b) => {
      const maxA = Math.max(a.length, a.width)
      const maxB = Math.max(b.length, b.width)
      if (maxB !== maxA) return maxB - maxA
      return area(b.length, b.width) - area(a.length, a.width)
    })

  const stockLeft = readyStocks.map((stock) => ({ stock, left: stock.qty }))
  const open: WorkSheet[] = []
  const unplacedMap = new Map<string, UnplacedPiece>()

  const markUnplaced = (job: (typeof jobs)[number], reason: string) => {
    const prev = unplacedMap.get(job.pieceId)
    if (prev) {
      prev.qty += 1
      return
    }
    unplacedMap.set(job.pieceId, {
      pieceId: job.pieceId,
      label: job.label,
      length: job.length,
      width: job.width,
      qty: 1,
      reason,
    })
  }

  const matchingStocks = (material: string) =>
    stockLeft.filter(({ stock, left }) => left > 0 && sameMaterial(stock.material, material))

  for (const job of jobs) {
    const candidates = matchingStocks(job.material)
    if (!candidates.length) {
      const hadMaterial = readyStocks.some((s) => sameMaterial(s.material, job.material))
      markUnplaced(job, hadMaterial ? 'Se acabaron las láminas de stock' : 'No hay láminas de ese material')
      continue
    }
    if (!candidates.some(({ stock }) => canFitStock(stock, job.length, job.width, job.allowRotate))) {
      markUnplaced(job, 'La pieza es más grande que las láminas disponibles')
      continue
    }

    type Attempt = {
      sheet: WorkSheet
      stockId: string
      length: number
      width: number
      rotated: boolean
      isNew: boolean
      short: number
      long: number
      sheetArea: number
    }

    let best: Attempt | null = null

    const consider = (attempt: Attempt) => {
      if (!best) {
        best = attempt
        return
      }
      if (!attempt.isNew && best.isNew) {
        best = attempt
        return
      }
      if (attempt.isNew && !best.isNew) return
      if (attempt.isNew && attempt.sheetArea < best.sheetArea - EPS) {
        best = attempt
        return
      }
      if (attempt.isNew && best.sheetArea < attempt.sheetArea - EPS) return
      if (
        attempt.short < best.short - EPS ||
        (Math.abs(attempt.short - best.short) <= EPS && attempt.long < best.long - EPS)
      ) {
        best = attempt
      }
    }

    const trySheet = (sheet: WorkSheet, isNew: boolean) => {
      for (const ori of orientations(job.length, job.width, job.allowRotate)) {
        const snapshot = sheet.free.map((f) => ({ ...f }))
        const placed = placeOnSheet(sheet, ori.length, ori.width, gap)
        sheet.free = snapshot
        if (!placed) continue
        consider({
          sheet,
          stockId: sheet.stockId,
          length: ori.length,
          width: ori.width,
          rotated: ori.rotated,
          isNew,
          short: placed.short,
          long: placed.long,
          sheetArea: area(sheet.length, sheet.width),
        })
      }
    }

    for (const sheet of open.filter((s) => sameMaterial(s.material, job.material))) {
      trySheet(sheet, false)
    }

    if (!best) {
      const fitting = candidates
        .filter(({ stock }) => canFitStock(stock, job.length, job.width, job.allowRotate))
        .sort((a, b) => area(a.stock.length, a.stock.width) - area(b.stock.length, b.stock.width))
      for (const { stock } of fitting) {
        const used = open.filter((s) => s.stockId === stock.id).length
        trySheet(openSheet(stock, used + 1), true)
      }
    }

    if (!best) {
      markUnplaced(job, 'No cupo en las láminas restantes')
      continue
    }

    const chosen = best
    let sheet = chosen.sheet
    if (chosen.isNew) {
      const stockRow = stockLeft.find((s) => s.stock.id === sheet.stockId)
      if (!stockRow || stockRow.left <= 0) {
        markUnplaced(job, 'Se acabaron las láminas de stock')
        continue
      }
      stockRow.left -= 1
      sheet = openSheet(stockRow.stock, open.filter((s) => s.stockId === stockRow.stock.id).length + 1)
      open.push(sheet)
    }

    const placed = placeOnSheet(sheet, chosen.length, chosen.width, gap)
    if (!placed) {
      markUnplaced(job, 'No cupo en las láminas restantes')
      continue
    }
    sheet.pieces.push({
      instanceId: job.instanceId,
      pieceId: job.pieceId,
      label: job.label,
      x: placed.x,
      y: placed.y,
      length: chosen.length,
      width: chosen.width,
      rotated: chosen.rotated,
    })
  }

  const sheets: UsedSheet[] = open.map((sheet) => {
    const usedArea = sheet.pieces.reduce((sum, p) => sum + area(p.length, p.width), 0)
    const stockArea = area(sheet.length, sheet.width)
    const leftovers = pruneFree(sheet.free)
      .filter((r) => r.w > 1 && r.h > 1)
      .sort((a, b) => area(b.w, b.h) - area(a.w, a.h))
      .map((r) => ({ x: r.x, y: r.y, length: r.w, width: r.h }))
    return {
      id: sheet.id,
      stockId: sheet.stockId,
      stockLabel: sheet.stockLabel,
      length: sheet.length,
      width: sheet.width,
      material: sheet.material,
      pieces: sheet.pieces,
      leftovers,
      usedArea,
      utilization: stockArea ? (usedArea / stockArea) * 100 : 0,
    }
  })

  const usedArea = sheets.reduce((sum, s) => sum + s.usedArea, 0)
  const stockArea = sheets.reduce((sum, s) => sum + area(s.length, s.width), 0)
  const leftoverArea = Math.max(0, stockArea - usedArea)

  return {
    sheets,
    unplaced: [...unplacedMap.values()],
    sheetsUsed: sheets.length,
    usedArea,
    stockArea,
    leftoverArea,
    utilization: stockArea ? (usedArea / stockArea) * 100 : 0,
    scrap: stockArea ? (leftoverArea / stockArea) * 100 : 0,
  }
}

export function formatMm(n: number) {
  const v = mm(n)
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '')
}

export function formatArea(n: number) {
  const m2 = n / 1_000_000
  if (m2 >= 1) return `${m2.toFixed(2)} m²`
  return `${Math.round(n).toLocaleString('es-CO')} mm²`
}

export function formatPct(n: number) {
  return `${n.toFixed(2).replace(/\.00$/, '')}%`
}
