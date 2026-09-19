import { formatMm, formatPct, type OptimizeResult, type PlacedPiece, type UsedSheet } from './cutOptimizer'

export type SheetDesign = {
  key: string
  letter: string
  sheet: UsedSheet
  count: number
}

const COLORS = ['#1f6b4a', '#1d4e89', '#9a3412', '#6b21a8', '#0f766e', '#9f1239', '#3f6212', '#854d0e']

function esc(s: string) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function pieceColor(pieceId: string) {
  let hash = 0
  for (const ch of pieceId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length]
}

function layoutKey(sheet: UsedSheet) {
  const pieces = [...sheet.pieces]
    .map((p) => `${p.pieceId}:${Math.round(p.x)}:${Math.round(p.y)}:${Math.round(p.length)}:${Math.round(p.width)}`)
    .sort()
    .join('|')
  return `${sheet.length}x${sheet.width}|${sheet.material}|${pieces}`
}

export function groupSheetDesigns(sheets: UsedSheet[]): SheetDesign[] {
  const map = new Map<string, SheetDesign>()
  for (const sheet of sheets) {
    const key = layoutKey(sheet)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { key, letter: '', sheet, count: 1 })
    }
  }
  return [...map.values()].map((design, i) => ({
    ...design,
    letter: String.fromCharCode(65 + i),
  }))
}

function axisCuts(pieces: PlacedPiece[], axis: 'x' | 'y', size: number) {
  const marks = new Set([0, size])
  for (const p of pieces) {
    if (axis === 'x') {
      marks.add(p.x)
      marks.add(p.x + p.length)
    } else {
      marks.add(p.y)
      marks.add(p.y + p.width)
    }
  }
  const pts = [...marks].sort((a, b) => a - b)
  const segs: { start: number; size: number }[] = []
  for (let i = 0; i < pts.length - 1; i += 1) {
    const span = pts[i + 1] - pts[i]
    if (span > 0.5) segs.push({ start: pts[i], size: span })
  }
  return segs
}

export function sheetSvg(sheet: UsedSheet, variant = 'view') {
  const padL = Math.max(sheet.length, sheet.width) * 0.1
  const padT = Math.max(sheet.length, sheet.width) * 0.09
  const padR = Math.max(sheet.length, sheet.width) * 0.04
  const padB = Math.max(sheet.length, sheet.width) * 0.08
  const font = Math.max(sheet.length, sheet.width) * 0.016
  const viewW = sheet.length + padL + padR
  const viewH = sheet.width + padT + padB
  const ox = padL
  const oy = padT
  const hatchId = `hatch-${variant}-${sheet.id}`
  const xSegs = axisCuts(sheet.pieces, 'x', sheet.length)
  const ySegs = axisCuts(sheet.pieces, 'y', sheet.width)
  const tick = font * 0.45

  const xDims = xSegs
    .map((seg) => {
      const x = ox + seg.start + seg.size / 2
      const y = oy - font * 1.35
      return `
        <line x1="${ox + seg.start}" y1="${oy - tick}" x2="${ox + seg.start}" y2="${oy - tick * 2.4}" stroke="#222" stroke-width="${font * 0.06}" />
        <line x1="${ox + seg.start + seg.size}" y1="${oy - tick}" x2="${ox + seg.start + seg.size}" y2="${oy - tick * 2.4}" stroke="#222" stroke-width="${font * 0.06}" />
        <line x1="${ox + seg.start}" y1="${oy - tick * 1.7}" x2="${ox + seg.start + seg.size}" y2="${oy - tick * 1.7}" stroke="#222" stroke-width="${font * 0.05}" />
        <text x="${x}" y="${y}" text-anchor="middle" fill="#111" font-size="${font * 0.82}" font-weight="700">${formatMm(seg.size)}</text>
      `
    })
    .join('')

  const yDims = ySegs
    .map((seg) => {
      const x = ox - font * 1.45
      const y = oy + seg.start + seg.size / 2
      return `
        <line x1="${ox - tick}" y1="${oy + seg.start}" x2="${ox - tick * 2.4}" y2="${oy + seg.start}" stroke="#222" stroke-width="${font * 0.06}" />
        <line x1="${ox - tick}" y1="${oy + seg.start + seg.size}" x2="${ox - tick * 2.4}" y2="${oy + seg.start + seg.size}" stroke="#222" stroke-width="${font * 0.06}" />
        <line x1="${ox - tick * 1.7}" y1="${oy + seg.start}" x2="${ox - tick * 1.7}" y2="${oy + seg.start + seg.size}" stroke="#222" stroke-width="${font * 0.05}" />
        <text x="${x}" y="${y}" text-anchor="middle" fill="#111" font-size="${font * 0.82}" font-weight="700" transform="rotate(-90 ${x} ${y})">${formatMm(seg.size)}</text>
      `
    })
    .join('')

  const pieces = sheet.pieces
    .map((p) => {
      const color = pieceColor(p.pieceId)
      const lx = ox + p.x
      const ly = oy + p.y
      const labelSize = Math.min(font * 1.05, p.length * 0.14, p.width * 0.28)
      const showInner = p.length > font * 5 && p.width > font * 2.1
      const sideH = p.length > font * 3.2 ? `<text x="${lx + p.length / 2}" y="${ly + font * 0.85}" text-anchor="middle" fill="${color}" font-size="${font * 0.7}" font-weight="700">${formatMm(p.length)}</text>` : ''
      const sideV = p.width > font * 3.2
        ? `<text x="${lx + font * 0.7}" y="${ly + p.width / 2}" text-anchor="middle" fill="${color}" font-size="${font * 0.7}" font-weight="700" transform="rotate(-90 ${lx + font * 0.7} ${ly + p.width / 2})">${formatMm(p.width)}</text>`
        : ''
      const inner = showInner
        ? `<text x="${lx + p.length / 2}" y="${ly + p.width / 2}" text-anchor="middle" fill="#222" font-size="${labelSize}" font-weight="700">${esc(p.label)}</text>`
        : ''
      return `
        <rect x="${lx}" y="${ly}" width="${p.length}" height="${p.width}" fill="#fff" stroke="${color}" stroke-width="${font * 0.07}" />
        ${inner}${sideH}${sideV}
      `
    })
    .join('')

  const leftovers = sheet.leftovers
    .filter((l) => l.length * l.width > sheet.length * sheet.width * 0.02)
    .slice(0, 3)
    .map((l) => {
      const size = Math.min(font * 0.78, l.length * 0.12, l.width * 0.35)
      if (size < font * 0.45) return ''
      return `<text x="${ox + l.x + l.length / 2}" y="${oy + l.y + l.width / 2}" text-anchor="middle" fill="#666" font-size="${size}" font-weight="700">RETAZO ${formatMm(l.length)} × ${formatMm(l.width)}</text>`
    })
    .join('')

  return `<svg class="cut-sheet-svg" viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lámina ${esc(sheet.stockLabel)}">
    <defs>
      <pattern id="${hatchId}" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="36" height="36" fill="#f3f3f0"/>
        <path d="M0 0 H36" stroke="#c9c9c4" stroke-width="12"/>
      </pattern>
    </defs>
    <rect x="${ox}" y="${oy}" width="${sheet.length}" height="${sheet.width}" fill="url(#${hatchId})" stroke="#111" stroke-width="${font * 0.08}"/>
    ${pieces}
    ${leftovers}
    ${xDims}
    ${yDims}
    <text x="${ox + sheet.length / 2}" y="${oy + sheet.width + font * 1.6}" text-anchor="middle" fill="#111" font-size="${font * 0.88}" font-weight="700">${esc(sheet.material)} · ${formatMm(sheet.length)} × ${formatMm(sheet.width)} mm</text>
  </svg>`
}

export function cutPlanHtml(
  result: OptimizeResult,
  designs: SheetDesign[],
  {
    jobName,
    materialName,
    origin = '',
  }: { jobName?: string; materialName?: string; origin?: string } = {},
) {
  const title = jobName || 'Plan de cortes'
  const material = materialName || designs[0]?.sheet.material || 'Lámina'
  const blocks = designs
    .map((design) => {
      const counts = new Map<string, number>()
      for (const p of design.sheet.pieces) {
        const key = `${p.label} · ${formatMm(p.length)} × ${formatMm(p.width)} mm`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
      const list = [...counts.entries()].map(([name, qty]) => `<li>${qty} × ${esc(name)}</li>`).join('')
      return `
        <section class="design">
          <div class="bar">
            <strong>Diseño ${design.letter}</strong>
            <span>${design.count === 1 ? '1 lámina' : `${design.count} láminas iguales`}</span>
          </div>
          <p class="meta">${esc(design.sheet.material)} · ${formatMm(design.sheet.length)} × ${formatMm(design.sheet.width)} mm · ${formatPct(design.sheet.utilization)} útil</p>
          ${sheetSvg(design.sheet, `pdf-${design.letter}`)}
          <ul>${list}</ul>
        </section>
      `
    })
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} — acervinox</title>
  <style>
    body { font-family: Arial, sans-serif; color:#111; margin:0; padding:28px; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .logo { height:52px; }
    h1 { margin: 8px 0 4px; font-size: 26px; }
    .muted { color:#555; font-size:13px; }
    .metrics { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin:18px 0 8px; }
    .metrics div { border:1px solid #e5e5e5; border-radius:10px; padding:10px 12px; }
    .metrics span { display:block; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#666; }
    .metrics strong { font-size:22px; }
    .bar { background:#16324f; color:#fff; padding:10px 14px; display:flex; justify-content:space-between; gap:12px; margin:22px 0 8px; }
    .meta { color:#444; font-size:13px; margin:0 0 10px; }
    .design { break-inside: avoid; page-break-inside: avoid; }
    .cut-sheet-svg { width:100%; height:auto; border:1px solid #ddd; border-radius:8px; background:#fff; }
    ul { font-size:13px; color:#333; }
    @media print {
      body { padding:12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .design { page-break-after: always; }
      .design:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="top">
    ${origin ? `<img class="logo" src="${esc(origin)}/logo-acervinox.png" alt="acervinox" />` : '<strong>acervinox</strong>'}
    <div class="muted">Plan de corte · ${new Date().toLocaleDateString('es-CO')}</div>
  </div>
  <h1>${esc(title)}</h1>
  <p class="muted">Material: <strong>${esc(material)}</strong></p>
  <div class="metrics">
    <div><span>Láminas</span><strong>${result.sheetsUsed}</strong></div>
    <div><span>Diseños</span><strong>${designs.length}</strong></div>
    <div><span>Aprovechamiento</span><strong>${formatPct(result.utilization)}</strong></div>
    <div><span>Retazo</span><strong>${formatPct(result.scrap)}</strong></div>
  </div>
  ${blocks}
</body>
</html>`
}
